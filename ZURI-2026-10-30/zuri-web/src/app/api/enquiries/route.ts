import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEnquiry } from "@/lib/enquiries/validation";
import {edgeIntake} from '@/lib/backend/intake-proxy';
import {limitedBody} from '@/lib/http/body';
import {sameOrigin} from '@/lib/http/origin';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return NextResponse.json({ error: "JSON required." }, { status: 415 });
  if(process.env.ZURI_PUBLIC_EDGE_ENABLED==='true')return edgeIntake(request);
  let raw;try{raw=new TextDecoder().decode(await limitedBody(request,12000));}catch{return NextResponse.json({error:'Request too large.'},{status:413});}
  if (raw.length > 12000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let enquiry;
  let source = "zuri-invites";
  try { const body = JSON.parse(raw); enquiry = validateEnquiry(body); source = body?.enquiryType === "tech" ? "zuri-tech" : "zuri-invites"; }
  catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? "Invalid JSON." : (error as Error).message }, { status: 400 }); }
  try {
    const { error } = await createAdminClient().from("enquiries").insert({ ...enquiry, source, status: "new" });
    if (error) {
      console.error("Enquiry submission failed:", error.code);
      return NextResponse.json({ error: "Unable to save your enquiry. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Enquiry delivery is currently unavailable. Please try again later." }, { status: 503 });
  }
}
