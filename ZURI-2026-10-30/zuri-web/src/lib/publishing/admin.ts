import 'server-only';
import { getAuthorizedAdmin } from '@/lib/supabase/authorizeAdmin';
import { contentKind } from './model';
import { privateJson } from './http';
export const contentTable = 'zuri_website_content';
export const adminColumns = 'id,kind,slug,status,data,consent_verified,consent_reference,revision,published_revision,published_at,updated_at';
export async function authorizedContent(kindValue: string) {
    const authorization = await getAuthorizedAdmin();
    if ('error' in authorization)
        return { response: privateJson({ error: authorization.error }, authorization.status) };
    let kind;
    try {
        kind = contentKind(kindValue);
    }
    catch {
        return { response: privateJson({ error: 'Unknown content type.' }, 404) };
    }
    return { ...authorization, kind };
}
export function databaseError(code?: string) {
    if (code === '23505')
        return privateJson({ error: 'This URL slug is already in use for this content type.' }, 409);
    return privateJson({ error: 'Publishing storage is unavailable. No changes were confirmed.' }, 503);
}
