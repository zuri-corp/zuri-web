import { createClient } from "npm:@supabase/supabase-js@2.117.3";

//#region src/lib/backend/edge.ts
function corsHeaders(request, env) {
	const origin = request.headers.get("origin");
	const allowed = (env("ZURI_ALLOWED_ORIGINS") ?? "http://localhost:3015,http://127.0.0.1:3015,http://localhost:8443,http://127.0.0.1:8443").split(",").map((s) => s.trim()).filter(Boolean);
	if (origin && !allowed.includes(origin)) throw Error("origin");
	return {
		"Access-Control-Allow-Origin": origin ?? allowed[0] ?? "null",
		"Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Max-Age": "600",
		"Vary": "Origin",
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff"
	};
}
async function edgeBytes(request, limit) {
	if (Number(request.headers.get("content-length")) > limit) throw Error("size");
	const reader = request.body?.getReader();
	if (!reader) return /* @__PURE__ */ new Uint8Array();
	let length = 0;
	const chunks = [];
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.length;
			if (length > limit) {
				await reader.cancel();
				throw Error("size");
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(length);
	let at = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, at);
		at += chunk.length;
	}
	return bytes;
}
async function edgeJson(request, limit = 64e3) {
	if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw Error("content");
	const value = JSON.parse(new TextDecoder().decode(await edgeBytes(request, limit)));
	if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("json");
	return value;
}
function mediaMime(bytes) {
	const starts = (v) => v.every((b, i) => bytes[i] === b), text = (a, b) => new TextDecoder().decode(bytes.slice(a, b));
	if (starts([
		255,
		216,
		255
	])) return "image/jpeg";
	if (starts([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	])) return "image/png";
	if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
	if (text(0, 5) === "%PDF-") return "application/pdf";
	if (text(4, 8) === "ftyp" && [
		"isom",
		"iso2",
		"mp41",
		"mp42",
		"avc1"
	].includes(text(8, 12))) return "video/mp4";
	return null;
}
function databaseStatus(code) {
	return {
		"42501": 403,
		"22023": 400,
		"23505": 409,
		"23514": 400,
		"23502": 400,
		"22P02": 400,
		"40001": 409,
		"P0001": 429
	}[code ?? ""] ?? 503;
}

//#endregion
//#region supabase/functions/_shared/auth.ts
const env = (name) => Deno.env.get(name);
function reply(value, status = 200, headers = {}) {
	return Response.json(value, {
		status,
		headers
	});
}
function boundary(request) {
	return corsHeaders(request, env);
}
async function identity(request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) throw Error("auth");
	const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
		global: { headers: { Authorization: authorization } },
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
	const { data: { user }, error } = await userClient.auth.getUser(authorization.slice(7));
	if (error || !user) throw Error("auth");
	if (!user.email_confirmed_at) throw Error("verified");
	return {
		user,
		userClient,
		admin: createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: {
			persistSession: false,
			autoRefreshToken: false
		} })
	};
}

//#endregion
//#region supabase/functions/zuri-media/index.ts
async function handler(request) {
	let headers = {};
	try {
		headers = boundary(request);
		if (request.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers
		});
		if (request.method !== "POST") return reply({ error: "Use POST." }, 405, headers);
		const { user, admin } = await identity(request);
		const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
		if (type !== "application/json") {
			const bytes = await edgeBytes(request, 10485760), mime = mediaMime(bytes);
			if (!mime || mime !== type) return reply({ error: "Use a supported image, MP4 or PDF matching its file type." }, 415, headers);
			const { data: reservation, error: reserveError } = await admin.rpc("zuri_media_operation", {
				actor: user.id,
				operation: "reserve",
				payload: {
					size: bytes.length,
					mime
				}
			});
			if (reserveError) return reply({
				error: "Storage allowance or account access unavailable.",
				code: reserveError.code
			}, databaseStatus(reserveError.code), headers);
			const { error: uploadError } = await admin.storage.from(reservation.bucket).upload(reservation.path, bytes, {
				contentType: mime,
				upsert: false
			});
			if (uploadError) return reply({ error: "Upload was not confirmed. Its storage reservation is held for review." }, 503, headers);
			const { data, error } = await admin.rpc("zuri_media_operation", {
				actor: user.id,
				operation: "ready",
				payload: { id: reservation.id }
			});
			return reply(error ? { error: "Upload needs reconciliation." } : {
				id: data.id,
				size: data.size_bytes,
				mime: data.mime,
				private: true
			}, error ? 503 : 201, headers);
		}
		const body = await edgeJson(request, 2e3);
		if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id) || !["read", "delete"].includes(String(body.action))) return reply({ error: "Choose your file." }, 400, headers);
		const { data: media, error } = await admin.rpc("zuri_media_operation", {
			actor: user.id,
			operation: "read",
			payload: { id: body.id }
		});
		if (error) return reply({
			error: "Your available files only.",
			code: error.code
		}, databaseStatus(error.code), headers);
		if (body.action === "delete") {
			const { error: removeError } = await admin.storage.from(media.bucket).remove([media.path]);
			if (removeError) return reply({ error: "Deletion not confirmed." }, 503, headers);
			const { error: markError } = await admin.rpc("zuri_media_operation", {
				actor: user.id,
				operation: "removed",
				payload: { id: media.id }
			});
			return reply(markError ? { error: "File removal needs reconciliation." } : { deleted: true }, markError ? 503 : 200, headers);
		}
		const { data: signed, error: signError } = await admin.storage.from(media.bucket).createSignedUrl(media.path, 60, { download: true });
		return reply(signError ? { error: "Download unavailable." } : {
			url: signed.signedUrl,
			expiresIn: 60
		}, signError ? 503 : 200, headers);
	} catch (e) {
		const code = e instanceof Error ? e.message : "";
		return reply({ error: "Sign in and check the file, origin and request size." }, code === "auth" ? 401 : code === "verified" || code === "origin" ? 403 : code === "size" ? 413 : 400, headers);
	}
}
Deno.serve(handler);

//#endregion
export { handler };