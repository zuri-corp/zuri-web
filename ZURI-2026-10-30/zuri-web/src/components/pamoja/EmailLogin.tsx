'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { minimumPasswordLength, newPassword, requestEmailCode, signInEmail, verifyEmailCode } from '@/lib/pamoja/email-auth';

export default function EmailLogin({ next }: { next: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [flow, setFlow] = useState<'password' | 'code' | 'forgot'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  const recovery = searchParams.get('recovery') === '1';

  useEffect(() => { if (sentTo) codeInput.current?.focus(); }, [sentTo]);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  function callbackUrl(params: Record<string, string>) {
    const url = new URL('/auth/callback', window.location.origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  }

  function finishSignIn() {
    router.replace(next);
    router.refresh();
  }

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const auth = createBrowserSupabaseClient().auth;
      const address = signInEmail(email);
      if (mode === 'signin') {
        const { error: authError } = await auth.signInWithPassword({ email: address, password });
        if (authError) throw new Error('We couldn’t sign you in with those details. Check your email and password, or reset your password.');
        finishSignIn();
      } else {
        const validPassword = newPassword(password);
        if (validPassword !== confirmPassword) throw new Error('Your passwords do not match.');
        const { data, error: authError } = await auth.signUp({
          email: address,
          password: validPassword,
          options: { emailRedirectTo: callbackUrl({ next }) },
        });
        if (authError) throw new Error('We couldn’t create your account. Check your details or try signing in.');
        if (data.session) finishSignIn();
        else setNotice('Check your inbox for a confirmation link to finish creating your account.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t complete that request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    if (busy || seconds > 0) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const address = await requestEmailCode(createBrowserSupabaseClient().auth, email);
      setSentTo(address);
      setSeconds(60);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send a code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await verifyEmailCode(createBrowserSupabaseClient().auth, sentTo, code);
      finishSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to verify the code.');
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const address = signInEmail(email);
      const { error: authError } = await createBrowserSupabaseClient().auth.resetPasswordForEmail(address, {
        redirectTo: callbackUrl({ flow: 'recovery', next }),
      });
      if (authError) throw new Error('We couldn’t send a password reset email. Please try again later.');
      setNotice('If an account exists for that email, a password reset link is on its way.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t send a password reset email.');
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const validPassword = newPassword(password);
      if (validPassword !== confirmPassword) throw new Error('Your passwords do not match.');
      const { error: authError } = await createBrowserSupabaseClient().auth.updateUser({ password: validPassword });
      if (authError) throw new Error('We couldn’t update your password. Request a new reset link and try again.');
      finishSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t update your password.');
    } finally {
      setBusy(false);
    }
  }

  const showError = searchParams.get('authError') === '1' ? 'That account link has expired or could not be verified. Please request a new one.' : error;
  return <main id="main" className="pamoja-page page-wrap narrow section-pad">
    <Link className="text-link" href="/pamoja">← Pamoja</Link>
    <p className="eyebrow mt-10">A simple account</p>
    <h1 className="display">A little more<br/>connected.</h1>
    <p className="intro">Share a Moment. Keep track of what you’ve shared. Make yourself at home.</p>
    <p className="muted text-sm">Your email stays in authentication and is not attached to your Moments. Creating an account does not grant Space management or Member status.</p>
    {recovery ? <form aria-busy={busy} className="request-form mt-8" onSubmit={updatePassword}>
      <h2 className="text-xl font-bold">Choose a new password</h2>
      <label>New password<input className="input-style" name="password" autoComplete="new-password" type="password" required minLength={minimumPasswordLength} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}/></label>
      <p className="muted text-sm">Use at least {minimumPasswordLength} characters.</p>
      <label>Confirm new password<input className="input-style" name="confirm-password" autoComplete="new-password" type="password" required minLength={minimumPasswordLength} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></label>
      <button className="button button-dark" disabled={busy}>{busy ? 'Updating…' : 'Save new password →'}</button>
    </form> : flow === 'code' ? !sentTo ? <form aria-busy={busy} className="request-form mt-8" onSubmit={e => { e.preventDefault(); void sendCode(); }}>
      <label>Email address<input name="email" className="input-style" autoComplete="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
      <p className="muted text-sm">For existing email-code accounts. New accounts should be created with a password.</p>
      <button className="button button-dark" disabled={busy || seconds > 0}>{busy ? 'Sending…' : seconds ? `Try again in ${seconds}s` : 'Send sign-in code →'}</button>
      <button type="button" className="text-link" onClick={() => { setFlow('password'); setError(''); }}>Back to password sign-in</button>
    </form> : <section>
      <p role="status" className="mt-8 break-all">A code was requested for {sentTo}. Check your inbox and spam folder.</p>
      <form aria-busy={busy} className="request-form" onSubmit={verify}>
        <label>Verification code<input ref={codeInput} className="input-style" name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={e => setCode(e.target.value)}/></label>
        <button className="button button-dark" disabled={busy}>{busy ? 'Checking…' : 'Verify and continue →'}</button>
      </form>
      <div className="mt-6 flex flex-wrap gap-6">
        <button className="text-link" disabled={busy || seconds > 0} onClick={() => void sendCode()}>{seconds ? `Request another code in ${seconds}s` : 'Request another code'}</button>
        <button className="text-link" disabled={busy} onClick={() => { setSentTo(''); setCode(''); setError(''); }}>Use a different email</button>
      </div>
      <p className="muted text-sm mt-6">Each code can be used once. If it has expired, request another one.</p>
    </section> : flow === 'forgot' ? <form aria-busy={busy} className="request-form mt-8" onSubmit={sendPasswordReset}>
      <h2 className="text-xl font-bold">Reset your password</h2>
      <label>Email address<input name="email" className="input-style" autoComplete="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
      <button className="button button-dark" disabled={busy}>{busy ? 'Sending…' : 'Send reset link →'}</button>
      <button type="button" className="text-link" onClick={() => { setFlow('password'); setError(''); setNotice(''); }}>Back to sign in</button>
    </form> : <section className="mt-8">
      <div className="flex flex-wrap gap-6" role="group" aria-label="Account action">
        <button type="button" className="text-link" aria-pressed={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); setNotice(''); }}>Sign in</button>
        <button type="button" className="text-link" aria-pressed={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>Create account</button>
      </div>
      <form aria-busy={busy} className="request-form" onSubmit={submitPassword}>
        <label>Email address<input name="email" className="input-style" autoComplete="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
        <label>Password<input className="input-style" name="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} type="password" required minLength={mode === 'signup' ? minimumPasswordLength : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}/></label>
        {mode === 'signup' && <>
          <p className="muted text-sm">Use at least {minimumPasswordLength} characters.</p>
          <label>Confirm password<input className="input-style" name="confirm-password" autoComplete="new-password" type="password" required minLength={minimumPasswordLength} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></label>
        </>}
        <button className="button button-dark" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in →' : 'Create account →'}</button>
      </form>
      {mode === 'signin' && <div className="mt-6 flex flex-wrap gap-6">
        <button type="button" className="text-link" onClick={() => { setFlow('forgot'); setError(''); setNotice(''); }}>Forgot password?</button>
        <button type="button" className="text-link" onClick={() => { setFlow('code'); setError(''); setNotice(''); }}>Use an email code</button>
      </div>}
    </section>}
    {notice && <p role="status" className="mt-6">{notice}</p>}
    {showError && <p role="alert" className="text-red-700 mt-6">{showError}</p>}
  </main>;
}
