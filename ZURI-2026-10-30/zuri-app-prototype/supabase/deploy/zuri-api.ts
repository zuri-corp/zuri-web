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
function publicClient() {
	return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { auth: {
		persistSession: false,
		autoRefreshToken: false
	} });
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
//#region src/lib/enquiries/validation.ts
function validateEnquiry(body) {
	if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid enquiry.");
	const input = body;
	function field(key, max, required = false) {
		const value = input[key];
		if (value !== void 0 && typeof value !== "string") throw new Error(`Invalid ${key}.`);
		const text = (value ?? "").trim();
		if (required && !text || text.length > max) throw new Error(`Please check ${key}.`);
		return text;
	}
	const name = field("name", 120, true);
	const email = field("email", 254, true);
	const phone = field("phone", 40, input.enquiryType !== "tech");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
	if (phone && (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) throw new Error("Enter a valid phone number.");
	if (input.enquiryType !== void 0 && input.enquiryType !== "tech") throw new Error("Invalid enquiry type.");
	if (input.enquiryType === "tech") {
		const service = field("service", 60);
		if (service && ![
			"partnership",
			"software",
			"business-technology",
			"ai-automation",
			"security",
			"training",
			"digital-marketing"
		].includes(service)) throw new Error("Select a valid service.");
		const intent = field("contactIntent", 30) || "technology";
		if (![
			"technology",
			"general",
			"pamoja",
			"claim"
		].includes(intent)) throw new Error("Invalid contact intent.");
		const label = intent === "claim" ? "Pamoja manual claim request" : intent === "pamoja" ? "Pamoja participation request" : intent === "general" ? "General ZURI request" : "Technology request";
		const message = field("message", 3500, true);
		return {
			name,
			email,
			phone,
			wedding_date: null,
			location: null,
			guest_count: null,
			package_interest: null,
			message: `${label}${service ? ` — ${service}` : ""}\n\n${message}`
		};
	}
	const weddingDate = field("weddingDate", 10);
	if (weddingDate && (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate) || Number.isNaN(Date.parse(weddingDate)) || new Date(weddingDate).toISOString().slice(0, 10) !== weddingDate)) throw new Error("Enter a valid wedding date.");
	const guestCount = field("guestCount", 40);
	const packageInterest = field("packageInterest", 80);
	if (guestCount && ![
		"Under 100",
		"100-250",
		"250-500",
		"Over 500",
		"Not sure"
	].includes(guestCount)) throw new Error("Select a valid guest estimate.");
	if (packageInterest && ![
		"Digital invitation",
		"Wedding website",
		"Wedding website with RSVP",
		"Custom experience"
	].includes(packageInterest)) throw new Error("Select a valid website option.");
	return {
		name,
		email,
		phone,
		wedding_date: weddingDate || null,
		location: field("location", 200) || null,
		guest_count: guestCount || null,
		package_interest: packageInterest || null,
		message: field("message", 4e3) || null
	};
}

//#endregion
//#region src/lib/pamoja/intake.ts
function presenceLinks(raw) {
	return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((line) => {
		const parts = line.split("|").map((s) => s.trim());
		const value = parts.at(-1);
		let url;
		try {
			url = new URL(value.includes(":") ? value : `https://${value}`);
		} catch {
			throw new Error("Check your website or social links.");
		}
		if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || url.href.length > 300) throw new Error("Use public HTTPS website or social links.");
		return {
			title: (parts.length > 1 ? parts[0] : url.hostname.replace(/^www\./, "")).slice(0, 60),
			url: url.href
		};
	});
}
function validatePresenceIntake(raw) {
	if (!raw || typeof raw !== "object") throw new Error("Check your profile details.");
	const input = raw;
	function field(key, max, required = false) {
		if (typeof input[key] !== "string") throw new Error(`Check ${key}.`);
		const value = input[key].trim();
		if (value.length > max || required && !value) throw new Error(`Please check ${key}.`);
		return value;
	}
	if (input.kind !== "space" && input.kind !== "person") throw new Error("Choose a business or person.");
	if (input.package !== "presence" && input.package !== "care") throw new Error("Choose a presence package.");
	if (input.consent !== true) throw new Error("Confirm you are authorised and agree to the profile details.");
	const email = field("email", 254, true);
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid reply email.");
	const links = presenceLinks(field("links", 1800));
	if (links.length > 6) throw new Error("Add up to six links.");
	return {
		kind: input.kind,
		name: field("name", 120, true),
		description: field("description", 400, true),
		sells: field("sells", 350),
		offers: field("offers", 500),
		location: field("location", 150),
		links,
		email,
		package: input.package,
		consent: true
	};
}
function intakeMessage(p, paths, time) {
	return [
		"Pamoja participation request — profile setup",
		`Type: ${p.kind === "space" ? "Business / place" : "Person"}`,
		`Package interest: ${p.package === "care" ? "Presence + Care" : "Presence"}`,
		`Name: ${p.name}`,
		`What they do: ${p.description}`,
		`What they sell: ${p.sells || "Not specified"}`,
		`What they offer: ${p.offers || "Not specified"}`,
		`Location: ${p.location || "Not specified"}`,
		`Public links:\n${p.links.map((l) => `${l.title} | ${l.url}`).join("\n") || "Not supplied"}`,
		`Authorisation and chosen public-detail consent confirmed at ${time}. Reply email is private.`,
		...paths.map((path) => `Photo: ${path}`)
	].join("\n\n");
}
function photoType(bytes) {
	if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return {
		extension: "jpg",
		type: "image/jpeg"
	};
	if ([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	].every((v, i) => bytes[i] === v)) return {
		extension: "png",
		type: "image/png"
	};
	if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return {
		extension: "webp",
		type: "image/webp"
	};
	return null;
}

//#endregion
//#region supabase/functions/_shared/intake.ts
async function publicIntake(request, headers, raw) {
	const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: {
		persistSession: false,
		autoRefreshToken: false
	} });
	let enquiry;
	let photos = [];
	let profile;
	try {
		if (raw) enquiry = {
			...validateEnquiry(raw),
			source: raw.enquiryType === "tech" ? "zuri-tech" : "zuri-invites",
			status: "new"
		};
		else {
			const bytes = await edgeBytes(request, 7340032), form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") } }).formData();
			profile = validatePresenceIntake(JSON.parse(String(form.get("profile") ?? "")));
			const files = form.getAll("photos").filter((f) => f instanceof File && f.size > 0);
			if (files.length > 3) throw Error("Choose up to three photographs.");
			for (const f of files) {
				if (f.size > 2097152) throw Error("Each photograph must be 2 MB or smaller.");
				const bytes = new Uint8Array(await f.arrayBuffer()), type = photoType(bytes);
				if (!type) throw Error("Use JPEG, PNG or WebP photographs.");
				photos.push({
					bytes,
					...type
				});
			}
			enquiry = {
				name: profile.name,
				email: profile.email,
				phone: "",
				wedding_date: null,
				location: null,
				guest_count: null,
				package_interest: null,
				source: "zuri-tech",
				status: "new"
			};
		}
	} catch {
		return reply({ error: "Check the enquiry, consent and photograph sizes." }, 400, headers);
	}
	const remote = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "shared-unknown";
	const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("SUPABASE_SERVICE_ROLE_KEY")), {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	const digest = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(remote)))].map((v) => v.toString(16).padStart(2, "0")).join("");
	const { data: id, error: reserveError } = await admin.rpc("zuri_intake_reserve", {
		key_digest: digest,
		photo_bytes: photos.reduce((n, p) => n + p.bytes.length, 0)
	});
	if (reserveError) return reply({
		error: "Enquiry capacity is temporarily unavailable. Your form was not confirmed.",
		code: reserveError.code
	}, databaseStatus(reserveError.code), headers);
	const paths = [];
	if (photos.length) {
		const { data: bucket, error } = await admin.storage.getBucket("pamoja-intake");
		if (error || bucket?.public !== false) return reply({ error: "Private photo staging is unavailable." }, 503, headers);
	}
	for (const [i, photo] of photos.entries()) {
		const path = `${id}/${i + 1}.${photo.extension}`;
		const { error } = await admin.storage.from("pamoja-intake").upload(path, photo.bytes, {
			contentType: photo.type,
			upsert: false
		});
		if (error) return reply({ error: "Photo delivery was not confirmed. Its reservation is held for review." }, 503, headers);
		paths.push(path);
	}
	if (profile) enquiry.message = intakeMessage(profile, paths, (/* @__PURE__ */ new Date()).toISOString());
	const { error } = await admin.from("enquiries").insert(enquiry);
	return reply(error ? { error: "Delivery was not confirmed. Please keep your details." } : { success: true }, error ? 503 : 201, headers);
}

//#endregion
//#region supabase/functions/zuri-api/index.ts
async function handler(request) {
	let headers = {};
	try {
		headers = boundary(request);
		if (request.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers
		});
		if (request.method === "GET") {
			const { data, error } = await publicClient().rpc("zuri_backend_health");
			return reply(error ? { error: "Database unavailable." } : data, error ? 503 : 200, headers);
		}
		if (request.method !== "POST") return reply({ error: "Use POST." }, 405, headers);
		if (request.headers.get("content-type")?.startsWith("multipart/form-data;")) return await publicIntake(request, headers);
		const body = await edgeJson(request);
		if (body.action === "enquiry.submit") return await publicIntake(request, headers, body.payload);
		const { userClient } = await identity(request);
		if (typeof body.action !== "string" || body.action.length > 60) return reply({ error: "Choose an operation." }, 400, headers);
		const { data, error } = body.action === "profile.save" ? await userClient.rpc("zuri_profile_save", { payload: body.payload ?? {} }) : await userClient.rpc("zuri_backend", {
			action: body.action,
			payload: body.payload ?? {}
		});
		if (error) {
			if (body.action === "profile.save" && ["PGRST202", "42883"].includes(error.code ?? "")) return reply({ error: "Shared profile onboarding is not activated yet. Review and apply database proposal 011, then deploy the updated API." }, 503, headers);
			return reply({
				error: "This operation could not be completed. Check permission, current revision and limits.",
				code: error.code
			}, databaseStatus(error.code), headers);
		}
		return reply({
			data,
			persisted: true
		}, 200, headers);
	} catch (e) {
		const status = {
			auth: 401,
			verified: 403,
			origin: 403,
			size: 413,
			content: 415,
			json: 400
		}[e instanceof Error ? e.message : ""] ?? 400;
		return reply({ error: status === 401 ? "Sign in to ZURI." : status === 403 ? "Verified account and permitted origin required." : "Check the request format and size." }, status, headers);
	}
}
Deno.serve(handler);

//#endregion
export { handler };