import { NextRequest } from 'next/server';
import { managementSession, managerMutation, managementError } from '@/lib/pamoja/management';
import { mutationBody, privateJson } from '@/lib/publishing/http';
export async function GET() {
  try {
    const access = await managementSession();
    if ('response' in access) return access.response;
    const { data, error } = await access.client.rpc('zuri_pamoja_manage', { actor: access.userId, action: 'list', content_id: null, payload: {} });
    return error ? managementError(error.code) : privateJson({ items: data ?? [] });
  } catch { return managementError(); }
}
export async function POST(request: NextRequest) {
  try {
    const access = await managementSession();
    if ('response' in access) return access.response;
    const body = await mutationBody(request);
    if ('response' in body) return body.response;
    let change;
    try { change = managerMutation(body.body); } catch (e) { return privateJson({ error: (e as Error).message }, 400); }
    const { data, error } = await access.client.rpc('zuri_pamoja_manage', { actor: access.userId, ...change });
    if (error) return managementError(error.code);
    return data?.saved === true ? privateJson({ result: { saved: true } }) : managementError();
  } catch { return managementError(); }
}
