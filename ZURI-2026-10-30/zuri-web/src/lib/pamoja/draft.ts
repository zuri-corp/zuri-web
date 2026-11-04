import { validId } from '@/lib/publishing/model';
export function restoreMomentDraft(raw: string | null) {
  if (!raw || raw.length > 16000) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.note !== 'string' || data.note.length > 1200) return null;
    return { note: data.note, request_id: typeof data.request_id === 'string' && validId(data.request_id) ? data.request_id : null };
  } catch { return null; }
}
