import {limitedBody} from '@/lib/http/body';
import { NextRequest, NextResponse } from 'next/server';
export const privateJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function mutationBody(request: NextRequest, maxLength = 320000) {
    if (request.headers.get('origin') !== new URL(request.url).origin)
        return { response: privateJson({ error: 'Invalid request origin.' }, 403) };
    if ((request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() !== 'application/json')
        return { response: privateJson({ error: 'JSON required.' }, 415) };
    let raw;try{raw=new TextDecoder().decode(await limitedBody(request,maxLength));}catch{return {response:privateJson({error:"Content is too large."},413)};}
    if (raw.length > maxLength)
        return { response: privateJson({ error: 'Content is too large.' }, 413) };
    try {
        return { body: JSON.parse(raw) as unknown };
    }
    catch {
        return { response: privateJson({ error: 'Invalid JSON.' }, 400) };
    }
}
