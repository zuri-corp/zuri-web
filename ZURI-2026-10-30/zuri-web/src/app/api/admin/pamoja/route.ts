import { NextRequest } from 'next/server';
import { getAuthorizedAdmin } from '@/lib/supabase/authorizeAdmin';
import { reviewMutation, managementError } from '@/lib/pamoja/management';
import { mutationBody, privateJson } from '@/lib/publishing/http';
export async function GET() {
  try {
    const access = await getAuthorizedAdmin();
    if ('error' in access) return privateJson({ error: access.error }, access.status);
    const { data, error } = await access.adminClient.rpc('zuri_pamoja_review', { actor: access.userId, action: 'list', content_id: null, payload: {} });
    return error ? managementError(error.code) : privateJson({ workspace: data });
  } catch { return managementError(); }
}
export async function POST(request: NextRequest) {
  try {
    const access = await getAuthorizedAdmin();
    if ('error' in access) return privateJson({ error: access.error }, access.status);
    const body = await mutationBody(request);
    if ('response' in body) return body.response;
    let change;
    try { change = reviewMutation(body.body); } catch (e) { return privateJson({ error: (e as Error).message }, 400); }
    const { data, error } = await access.adminClient.rpc('zuri_pamoja_review', { actor: access.userId, ...change });
    if (error) return managementError(error.code);
    return data?.saved === true ? privateJson({ result: { saved: true } }) : managementError();
  } catch { return managementError(); }
}
