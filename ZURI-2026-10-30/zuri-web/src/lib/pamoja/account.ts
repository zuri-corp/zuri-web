import { object, validId } from '@/lib/publishing/model';
import { validSpaceAddress } from '@/lib/navigation/routes';
export const momentPermissionVersion = 'moments-note-v1';
export function publicName(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[@\r\n\x00-\x1f]/.test(value)) throw new Error('Choose a public name (1–80 characters), rather than an email address.');
  return value.trim();
}
export function accountMutation(raw: unknown) {
  return { display_name: publicName(object(raw).display_name) };
}
export function momentMutation(raw: unknown) {
  const input = object(raw);
  if (input.action === 'withdraw') {
    if (typeof input.moment_id !== 'string' || !validId(input.moment_id)) throw new Error('Choose a valid Moment.');
    return { action: 'withdraw', payload: { moment_id: input.moment_id } };
  }
  if (input.action !== 'submit') throw new Error('Unknown contribution action.');
  if (typeof input.slug !== 'string' || !validSpaceAddress(input.slug)) throw new Error('Choose a valid Space.');
  if (typeof input.note !== 'string' || !input.note.trim() || input.note.trim().length > 1200 || /\x00/.test(input.note)) throw new Error('Share a note of 1–1200 characters.');
  if (input.consent !== true) throw new Error('Confirm your permission to publish this note and chosen name.');
  if (typeof input.request_id !== 'string' || !validId(input.request_id)) throw new Error('Reload the form before sharing your Moment.');
  return { action: 'submit', payload: { slug: input.slug, note: input.note.trim(), consent: true, request_id: input.request_id, permission_version: momentPermissionVersion } };
}
// Login handoffs are limited to current account journeys; never an arbitrary URL.
export function accountReturn(value: unknown) {
  if(value === '/app' || value === '/app#/lore/profile?kind=cloud-account&id=home') return value;
  if(value === '/tech/studio' || value === '/pamoja/tools') return value;
  if (value === '/pamoja/manage' || value === '/pamoja/account') return value;
  if (typeof value === 'string' && value.startsWith('/pamoja/moments/') && validSpaceAddress(value.slice('/pamoja/moments/'.length))) return value;
  return '/pamoja/account';
}
