import { NextRequest } from 'next/server';
import { authorizedContent, contentTable, adminColumns, databaseError } from '@/lib/publishing/admin';
import { object, validId, validateDraft, publicationData, type ContentRecord } from '@/lib/publishing/model';
import { mutationBody, privateJson } from '@/lib/publishing/http';
type Context = {
    params: Promise<{
        kind: string;
        id: string;
    }>;
};
export async function PATCH(request: NextRequest, context: Context) {
    try {
        const { kind, id } = await context.params;
        const access = await authorizedContent(kind);
        if ('response' in access)
            return access.response;
        if (!validId(id))
            return privateJson({ error: 'Invalid content ID.' }, 400);
        const payload = await mutationBody(request);
        if ('response' in payload)
            return payload.response;
        let body;
        try {
            body = object(payload.body);
        }
        catch (e) {
            return privateJson({ error: (e as Error).message }, 400);
        }
        if (!Number.isSafeInteger(body.revision) || (body.revision as number) < 1)
            return privateJson({ error: 'A valid revision is required.' }, 400);
        if (!['save', 'publish', 'unpublish', 'archive', 'restore'].includes(String(body.action)))
            return privateJson({ error: 'Unknown publishing action.' }, 400);
        const { data: found, error: readError } = await access.adminClient.from(contentTable).select(adminColumns).eq('id', id).eq('kind', access.kind).maybeSingle();
        if (readError)
            return databaseError(readError.code);
        if (!found)
            return privateJson({ error: 'Content not found.' }, 404);
        const current = found as ContentRecord;
        if (current.revision !== body.revision)
            return privateJson({ error: 'Someone else has changed this content. Reload the latest revision before saving.' }, 409);
        const revision = current.revision + 1;
        let change: Record<string, unknown> = { revision, updated_by: access.userId, updated_at: new Date().toISOString() };
        try {
            if (body.action === 'save') {
                if (current.status === 'archived')
                    return privateJson({ error: 'Restore this archived item to draft before editing.' }, 409);
                const draft = validateDraft(access.kind, body);
                change = { ...change, ...draft };
                if (current.status === 'published' && draft.slug !== current.slug)
                    return privateJson({ error: 'Unpublish before changing a public URL slug.' }, 409);
                // Consent withdrawal hides the public snapshot immediately.
                if (access.kind !== 'story' && !draft.consent_verified)
                    change = { ...change, status: 'draft', published_data: null, published_revision: null };
            }
            else if (body.action === 'publish') {
                if (current.status === 'archived')
                    return privateJson({ error: 'Restore this archived item before publishing.' }, 409);
                change = { ...change, published_data: publicationData(current), status: 'published', published_revision: revision, published_at: current.published_at ?? new Date().toISOString() };
            }
            else if (body.action === 'restore') {
                if (current.status !== 'archived')
                    return privateJson({ error: 'Only archived content can be restored.' }, 409);
                change = { ...change, status: 'draft', published_data: null, published_revision: null };
            }
            else {
                change = { ...change, status: body.action === 'archive' ? 'archived' : 'draft', published_data: null, published_revision: null };
            }
        }
        catch (e) {
            return privateJson({ error: (e as Error).message }, 400);
        }
        const { data, error } = await access.adminClient.from(contentTable).update(change).eq('id', id).eq('kind', access.kind).eq('revision', current.revision).select(adminColumns).maybeSingle();
        if (error)
            return databaseError(error.code);
        if (!data)
            return privateJson({ error: 'Content changed while saving. Reload before trying again.' }, 409);
        return privateJson({ item: data, publicDeliveryEnabled: process.env.ZURI_CONTENT_MODE === 'live' });
    }
    catch {
        return privateJson({ error: 'Publishing is currently unavailable. No changes were confirmed.' }, 503);
    }
}
