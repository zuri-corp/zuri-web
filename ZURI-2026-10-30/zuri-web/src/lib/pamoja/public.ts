import 'server-only';
import { connection } from 'next/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { publicName } from './account';
import { validSpaceAddress } from '@/lib/navigation/routes';
import { validId } from '@/lib/publishing/model';
export type PublicMoment = { id: string; note: string; display_name: string };
export type Guestbook = { available: boolean; enabled: boolean; space_name: string; items: PublicMoment[] };
export async function loadGuestbook(slug: string): Promise<Guestbook> {
  await connection();
  const closed = { available: true, enabled: false, space_name: '', items: [] };
  if (!validSpaceAddress(slug) || process.env.ZURI_CONTENT_MODE !== 'live') return closed;
  try {
    const { data, error } = await createPublicSupabaseClient().rpc('zuri_public_moments', { address: slug });
    if (error || !data || typeof data.enabled !== 'boolean') throw new Error('Guestbook unavailable.');
    if (!data.enabled) return closed;
    if (typeof data.space_name !== 'string' || !Array.isArray(data.items)) throw new Error('Invalid guestbook.');
    const items = data.items.map((row: Record<string, unknown>) => {
      if (typeof row.id !== 'string' || !validId(row.id) || typeof row.note !== 'string' || row.note.length > 1200) throw new Error('Invalid note.');
      return { id: row.id, note: row.note, display_name: publicName(row.display_name) };
    });
    return { available: true, enabled: true, space_name: data.space_name, items };
  } catch { return { ...closed, available: false }; }
}
