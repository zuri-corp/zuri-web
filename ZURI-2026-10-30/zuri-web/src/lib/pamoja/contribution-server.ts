import 'server-only';
import { privateJson } from '@/lib/publishing/http';
import { enquiryPage } from '@/lib/enquiries/pagination';
import { publicName } from './account';
import { validId } from '@/lib/publishing/model';
import { validSpaceAddress } from '@/lib/navigation/routes';
export function contributionError(code?: string) {
  if (code === '42501') return privateJson({ error: 'You can only change your own contributions using a verified account.' }, 403);
  if (code === '40001') return privateJson({ error: 'This Moment changed. Reload before trying again.' }, 409);
  if (code === '22023') return privateJson({ error: 'Check your public name and the Space’s current guestbook availability.' }, 400);
  if (code === 'P0001') {
    const response = privateJson({ error: 'You’ve shared several Moments recently. Please try again later.' }, 429);
    response.headers.set('Retry-After', '3600'); return response;
  }
  return privateJson({ error: 'Contributions are currently unavailable. No change was confirmed.' }, 503);
}
const statuses = ['pending', 'approved', 'rejected', 'withdrawn'];
// Even private API responses are projected: no email, auth metadata or evidence.
export function accountView(data: Record<string, unknown>, pageValue?: string | null) {
  const page = enquiryPage(pageValue ?? undefined);
  const account = data.account && typeof data.account === 'object' ? { display_name: publicName((data.account as Record<string, unknown>).display_name) } : null;
  const rows = Array.isArray(data.items) ? data.items : [];
  const items = rows.map(row => {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !validId(row.id) || !statuses.includes(row.status) || typeof row.note !== 'string' || row.note.length > 1200) throw new Error('Invalid contribution response.');
    return { id: row.id, status: row.status, note: row.note, display_name: publicName(row.display_name), space_name: typeof row.space_name === 'string' ? row.space_name : 'Space unavailable', space_slug: typeof row.space_slug === 'string' && validSpaceAddress(row.space_slug) ? row.space_slug : null, created_at: typeof row.created_at === 'string' ? row.created_at : null };
  });
  const total = typeof data.total === 'number' && Number.isSafeInteger(data.total) && data.total >= 0 ? data.total : 0;
  return { account, items, page, total, pages: Math.max(1, Math.ceil(total / 20)) };
}
