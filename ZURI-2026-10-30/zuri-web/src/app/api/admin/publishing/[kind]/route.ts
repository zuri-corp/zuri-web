import { enquiryPage } from '@/lib/enquiries/pagination';
import { NextRequest } from 'next/server';
import { authorizedContent, contentTable, adminColumns, databaseError } from '@/lib/publishing/admin';
import { validateDraft } from '@/lib/publishing/model';
import { mutationBody, privateJson } from '@/lib/publishing/http';
type Context = {
    params: Promise<{
        kind: string;
    }>;
};
export async function GET(request: NextRequest, context: Context) {
    try {
        const access = await authorizedContent((await context.params).kind);
        if ('response' in access)
            return access.response;
        const page = enquiryPage(request.nextUrl.searchParams.get('page') ?? undefined);
        const { data, error, count } = await access.adminClient.from(contentTable).select(adminColumns, { count: 'exact' }).eq('kind', access.kind).order('updated_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 50, page * 50 - 1);
        if (error)
            return databaseError(error.code);
        return privateJson({ items: data ?? [], page, total: count ?? 0, pages: Math.max(1, Math.ceil((count ?? 0) / 50)) });
    }
    catch {
        return privateJson({ error: 'Publishing is currently unavailable.' }, 503);
    }
}
export async function POST(request: NextRequest, context: Context) {
    try {
        const access = await authorizedContent((await context.params).kind);
        if ('response' in access)
            return access.response;
        const payload = await mutationBody(request);
        if ('response' in payload)
            return payload.response;
        let draft;
        try {
            draft = validateDraft(access.kind, payload.body);
        }
        catch (e) {
            return privateJson({ error: (e as Error).message }, 400);
        }
        const { data, error } = await access.adminClient.from(contentTable).insert({ ...draft, kind: access.kind, status: 'draft', created_by: access.userId, updated_by: access.userId }).select(adminColumns).single();
        if (error)
            return databaseError(error.code);
        return privateJson({ item: data }, 201);
    }
    catch {
        return privateJson({ error: 'Publishing is currently unavailable.' }, 503);
    }
}
