'use client';
import { useState, type FormEvent } from 'react';
import type { BasicAccount } from './useBasicAccount';
export default function AccountNameForm({ initial = '', isFirstVisit = false, onSaved }: { initial?: string; isFirstVisit?: boolean; onSaved: (account: BasicAccount) => void }) {
  const [name, setName] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setSaved(false);
    try { const response = await fetch('/api/pamoja/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: name }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save your name.'); setName(result.account.display_name); onSaved(result.account); setSaved(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your name.'); } finally { setBusy(false); }
  }
  return <form className="request-form" aria-busy={busy} onSubmit={submit}><label>Your public name<input className="input-style" name="display_name" required maxLength={80} autoComplete="nickname" value={name} onChange={e => { setName(e.target.value); setSaved(false); }}/></label><p className="muted text-sm">A name you’re happy to share beside your Moments. You can use a nickname. It does not create a public directory profile. Changes apply to new Moments; earlier ones keep the name you chose for them.</p><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : isFirstVisit ? 'Set my public name' : 'Save public name'}</button>{error && <p role="alert" className="text-red-700">{error}</p>}{saved && <p role="status">Your public name is saved.</p>}</form>;
}
