
import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/supabase/authorizeAdmin";

type Context = {
  params: Promise<{ id: string }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  context: Context
) {
  try {
    const authorization = await getAuthorizedAdmin();

    if ("error" in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    const { id } = await context.params;

    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { error: "Invalid enquiry ID." },
        { status: 400 }
      );
    }

    const { data: enquiry, error: enquiryError } = await authorization.adminClient
      .from("enquiries").select("id").eq("id", id).maybeSingle();
    if (enquiryError) return NextResponse.json({ error: "Unable to verify enquiry." }, { status: 500 });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

    const { data, error } = await authorization.adminClient
      .from("enquiry_notes")
      .select("id,content,author_id,created_at")
      .eq("enquiry_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Notes read failed:", error.code);
      return NextResponse.json(
        { error: "Unable to load notes." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { notes: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to process request." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    const authorization = await getAuthorizedAdmin();

    if ("error" in authorization) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status }
      );
    }

    if (
      request.headers.get("origin") !==
      new URL(request.url).origin
    ) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    if (
      (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json"
    ) {
      return NextResponse.json(
        { error: "JSON required." },
        { status: 415 }
      );
    }

    const { id } = await context.params;

    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { error: "Invalid enquiry ID." },
        { status: 400 }
      );
    }

    const raw = await request.text();

    if (raw.length > 5000) {
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 }
      );
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return NextResponse.json(
        { error: "Invalid note." },
        { status: 400 }
      );
    }

    const content = (parsed as Record<string, unknown>).content;

    if (
      typeof content !== "string" ||
      content.trim().length < 1 ||
      content.trim().length > 2000
    ) {
      return NextResponse.json(
        { error: "Note must contain 1–2000 characters." },
        { status: 400 }
      );
    }

    const { data: enquiry, error: enquiryError } = await authorization.adminClient
      .from("enquiries").select("id").eq("id", id).maybeSingle();
    if (enquiryError) return NextResponse.json({ error: "Unable to verify enquiry." }, { status: 500 });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

    const { data, error } = await authorization.adminClient
      .from("enquiry_notes")
      .insert({
        enquiry_id: id,
        author_id: authorization.userId,
        content: content.trim(),
      })
      .select("id,content,author_id,created_at")
      .single();

    if (error) {
      console.error("Note insert failed:", error.code);
      return NextResponse.json(
        { error: "Unable to save note." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { note: data },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to process request." },
      { status: 500 }
    );
  }
}
