
import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/supabase/authorizeAdmin";

const allowedStatuses = [
  "new",
  "contacted",
  "qualified",
  "closed",
] as const;

type EnquiryStatus = (typeof allowedStatuses)[number];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await getAuthorizedAdmin();
    if ("error" in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    const { adminClient } = authorization;

    // Prevent cross-origin browser requests.
    const origin = request.headers.get("origin");

    if (origin !== new URL(request.url).origin) {
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

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json(
        { error: "Invalid enquiry ID." },
        { status: 400 }
      );
    }

    const raw = await request.text();

    if (raw.length > 1000) {
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 }
      );
    }

    const body: unknown = JSON.parse(raw);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const status = (body as { status?: unknown }).status;

    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status as EnquiryStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid enquiry status." },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("enquiries")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .maybeSingle();

    if (error) {
      console.error("Status update failed:", error.code);
      return NextResponse.json(
        { error: "Unable to update enquiry." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Enquiry not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      enquiry: data,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON." },
        { status: 400 }
      );
    }

    console.error("Enquiry status request failed.");

    return NextResponse.json(
      { error: "Unable to process request." },
      { status: 500 }
    );
  }
}
