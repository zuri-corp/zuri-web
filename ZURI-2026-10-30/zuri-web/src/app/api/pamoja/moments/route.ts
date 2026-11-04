import { NextRequest } from 'next/server';
import { managementSession } from '@/lib/pamoja/management';
import { contributionError } from '@/lib/pamoja/contribution-server';
import { validId } from '@/lib/publishing/model';
import { momentMutation } from '@/lib/pamoja/account';
import { mutationBody, privateJson } from '@/lib/publishing/http';
export async function POST(request: NextRequest) {
  try {
    const access = await managementSession(); if ('response' in access) return access.response;
    const body = await mutationBody(request, 12000); if ('response' in body) return body.response;
    let change; try { change = momentMutation(body.body); } catch (e) { return privateJson({ error: (e as Error).message }, 400); }
    if (process.env.ZURI_CONTENT_MODE !== 'live' && change.action === 'submit') return privateJson({ error: 'Example Spaces do not accept contributions.' }, 409);
    const { data, error } = await access.client.rpc('zuri_pamoja_contribute', { actor: access.userId, ...change });
    if (error) return contributionError(error.code);
    if (!data || typeof data.id !== 'string' || !validId(data.id) || !['pending','approved','rejected','withdrawn'].includes(data.status)) return contributionError();
    return privateJson({ moment: { id: data.id, status: data.status } }, change.action === 'submit' ? 201 : 200);
  } catch { return contributionError(); }
}
