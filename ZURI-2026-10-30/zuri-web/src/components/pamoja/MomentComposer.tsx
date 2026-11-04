'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useBasicAccount } from './useBasicAccount';
import AccountNameForm from './AccountNameForm';
import { restoreMomentDraft } from '@/lib/pamoja/draft';
export default function MomentComposer({ slug, spaceName }: { slug: string; spaceName: string }) {
  const account = useBasicAccount(); const [note, setNote] = useState(''); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [status, setStatus] = useState(''); const [expired, setExpired] = useState(false); const requestId = useRef<string | null>(null);
  const draftKey = `zuri-moment-draft:${slug}`; const loginHref = `/pamoja/login?next=${encodeURIComponent(`/pamoja/moments/${slug}`)}`;
  useEffect(() => {
    // Restore this browser's unsent text across email sign-in; permission is never restored.
    try { const saved = restoreMomentDraft(sessionStorage.getItem(draftKey)); if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNote(saved.note); requestId.current = saved.request_id;
    } } catch { /* Draft storage is optional. */ }
  }, [draftKey]);
  function changeNote(value: string) { setNote(value); requestId.current = null; try { sessionStorage.setItem(draftKey, JSON.stringify({ note: value, request_id: null })); } catch { /* Retain text in the form if browser storage is disabled. */ } }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setExpired(false);
    try { requestId.current ??= crypto.randomUUID();
      try { sessionStorage.setItem(draftKey, JSON.stringify({ note, request_id: requestId.current })); } catch { /* In-memory retry identity remains available. */ }
      const response = await fetch('/api/pamoja/moments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', slug, note, consent, request_id: requestId.current }) }); const result = await response.json(); if (!response.ok) { setExpired(response.status === 401 || response.status === 403); throw new Error(result.error || 'Unable to share your Moment.'); } setStatus(result.moment.status); try { sessionStorage.removeItem(draftKey); } catch { /* Optional draft cleanup. */ } }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to share your Moment.'); } finally { setBusy(false); }
  }
  if (account.loading) return <p role="status" className="mt-8">Opening your account…</p>;
  if (account.error) return <section className="mt-8"><p role="alert">{account.error}</p>{account.login ? <><p className="muted mt-3">A basic account connects this contribution to you. Your email will not appear with it.</p><Link className="button button-dark mt-6" href={loginHref}>Continue with email →</Link></> : <button className="button button-dark mt-6" onClick={() => void account.refresh()}>Try again</button>}</section>;
  if (!account.data?.account) return <section className="mt-8"><h2>What name would you like to share?</h2><AccountNameForm onSaved={account.setAccount}/></section>;
  if (status) return <section role="status" className="request-success mt-8"><p className="eyebrow">{status === 'pending' ? 'Received for review' : status === 'approved' ? 'Approved' : status === 'withdrawn' ? 'Withdrawn' : 'Not approved'}</p><h2>Thank you for sharing.</h2><p>{status === 'pending' ? 'Your note is private while ZURI reviews it. It will appear only if approved and this Space keeps Moments enabled.' : 'You can see its current status in your account.'}</p><Link className="text-link" href="/pamoja/account">See your contributions →</Link><Link className="text-link block mt-4" href={`/${slug}`}>Back to {spaceName} →</Link></section>;
  return <form onSubmit={submit} aria-busy={busy} className="request-form"><p className="eyebrow">Shared as {account.data.account.display_name}</p><label>A short note or memory<textarea className="input-style" rows={6} required maxLength={1200} value={note} onChange={e => changeNote(e.target.value)} placeholder="Something you remember, a little useful context, a good moment from here…"/></label><p className="muted text-sm">A guestbook note, not a rating. Share your own experience and leave private contact details out.</p><aside className="border rounded-2xl p-6"><p className="eyebrow">Your public contribution, if approved</p><p className="whitespace-pre-wrap mt-3">{note || 'Your note will appear here.'}</p><p className="muted text-sm mt-4">Shared by {account.data.account.display_name}</p></aside><label className="flex gap-3 items-start"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1"/><span>I’m happy for ZURI to publish this note and my chosen name on this Space after review. I have permission to share what I’ve included.</span></label><p className="muted text-sm">You can withdraw it from your account. Withdrawal hides the note and retains its private moderation record. Moments are not automatically turned into Select stories.</p>{error && <p role="alert" className="text-red-700">{error} {expired && <Link className="text-link" href={loginHref}>Sign in again →</Link>}</p>}<button className="button button-dark" disabled={busy || !consent}>{busy ? 'Sharing…' : 'Share for review →'}</button><Link className="text-link" href="/pamoja/account">Your account and public name →</Link></form>;
}
