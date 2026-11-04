import Link from 'next/link';
import { loadGuestbook } from '@/lib/pamoja/public';
export default async function Moments({ slug }: { slug: string }) {
  const guestbook = await loadGuestbook(slug);
  if (!guestbook.available || !guestbook.enabled) return null;
  return <section className="page-wrap section-pad"><p className="eyebrow">A little life from here</p><h2>Moments</h2><p className="muted">Notes and memories shared with permission and reviewed by ZURI.</p><Link className="button button-dark mt-6" href={`/pamoja/moments/${slug}`}>Share a Moment from here →</Link>{guestbook.items.length ? <div className="profile-links">{guestbook.items.map(m => <article key={m.id} className="py-6"><p className="whitespace-pre-wrap">{m.note}</p><p className="text-sm muted mt-3">Shared by {m.display_name}</p></article>)}</div> : <p className="mt-6 muted">No published Moments yet.</p>}</section>;
}
