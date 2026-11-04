import { NextRequest } from 'next/server';
import { managementSession } from '@/lib/pamoja/management';
import { contributionError, accountView } from '@/lib/pamoja/contribution-server';
import { accountMutation } from '@/lib/pamoja/account';
import { enquiryPage } from '@/lib/enquiries/pagination';
import { mutationBody, privateJson } from '@/lib/publishing/http';
export async function GET(request: NextRequest) {
  try {
    const access = await managementSession(); if ('response' in access) return access.response;
    const page = enquiryPage(request.nextUrl.searchParams.get('page') ?? undefined);
    const { data, error } = await access.client.rpc('zuri_pamoja_contribute', { actor: access.userId, action: 'list', payload: { page } });
    if (error) return contributionError(error.code);
    return privateJson(accountView(data, String(page)));
  } catch { return contributionError(); }
}
export async function POST(request: NextRequest) {
  try {
    const access = await managementSession(); if ('response' in access) return access.response;
    const body = await mutationBody(request, 12000); if ('response' in body) return body.response;
    let payload; try { payload = accountMutation(body.body); } catch (e) { return privateJson({ error: (e as Error).message }, 400); }
    const { data, error } = await access.client.rpc('zuri_pamoja_contribute', { actor: access.userId, action: 'account', payload });
    if (error) return contributionError(error.code);
    return data?.saved === true ? privateJson({ account: payload }) : contributionError();
  } catch { return contributionError(); }
}
