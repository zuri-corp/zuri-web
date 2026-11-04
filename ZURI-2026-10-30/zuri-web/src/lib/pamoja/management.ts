import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { privateJson } from '@/lib/publishing/http';
import { object, validId, validateData } from '@/lib/publishing/model';

export async function managementSession() {
  const auth = await createServerSupabaseClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return { response: privateJson({ error: 'Sign in to your verified account.', login: '/pamoja/login' }, 401) };
  if (!user.email || !user.email_confirmed_at) return { response: privateJson({ error: 'A verified email account is required.' }, 403) };
  return { userId: user.id, client: createAdminClient() };
}

export function identifier(value: unknown) {
  if (typeof value !== 'string' || !validId(value)) throw new Error('Choose a valid record.');
  return value;
}
export function reference(value: unknown) {
  if (typeof value !== 'string' || value.trim().length < 10 || value.length > 1000) throw new Error('Record a verification or moderation reference (10–1000 characters).');
  return value.trim();
}
export function managerMutation(raw: unknown) {
  const input = object(raw);
  const content_id = identifier(input.content_id);
  if (input.action === 'moments') {
    if (typeof input.enabled !== 'boolean') throw new Error('Choose whether Moments are enabled.');
    return { action: 'moments', content_id, payload: { enabled: input.enabled } };
  }
  if (input.action === 'draft') {
    if (input.kind !== 'space' && input.kind !== 'person') throw new Error('Choose a profile.');
    if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new Error('Reload the current draft before saving.');
    return { action: 'draft', content_id, payload: { kind: input.kind, revision: input.revision, data: validateData(input.kind, input.data) } };
  }
  throw new Error('Unknown management action.');
}
export function reviewMutation(raw: unknown) {
  const input = object(raw);
  const content_id = identifier(input.content_id);
  const evidence = reference(input.reference);
  if (input.action === 'grant') return { action: 'grant', content_id, payload: { user_id: identifier(input.user_id), enquiry_id: identifier(input.enquiry_id), reference: evidence } };
  if (input.action === 'revoke') return { action: 'revoke', content_id, payload: { user_id: identifier(input.user_id), reference: evidence } };
  if (input.action === 'approve' || input.action === 'reject' || input.action === 'withdraw') return { action: input.action, content_id, payload: { moment_id: identifier(input.moment_id), reference: evidence } };
  throw new Error('Unknown review action.');
}
export function managementError(code?: string) {
  if (code === '42501') return privateJson({ error: 'This account does not have permission for that action.' }, 403);
  if (code === '40001') return privateJson({ error: 'This record changed. Reload before trying again.' }, 409);
  if (code === '22023') return privateJson({ error: 'The record or account is not eligible. Check its current state.' }, 400);
  return privateJson({ error: 'Management storage is unavailable. No change was confirmed.' }, 503);
}
