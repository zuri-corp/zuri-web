import { useEffect, useRef, useState, type FormEvent } from 'react';

type Props = {
  onRequest: (email: string) => Promise<void>;
  onVerify: (email: string, code: string) => Promise<void>;
  onSignedIn?: () => void;
};

export default function CloudEmailLogin({ onRequest, onVerify, onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sentTo) codeInput.current?.focus();
  }, [sentTo]);

  useEffect(() => {
    if (!seconds) return;
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  async function send() {
    if (busy || seconds > 0) return;
    setBusy(true);
    setError('');
    try {
      await onRequest(email);
      setSentTo(email.trim());
      setSeconds(60);
      setCode('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a code.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!sentTo) {
      await send();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onVerify(sentTo, code);
      onSignedIn?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify the code.');
    } finally {
      setBusy(false);
    }
  }

  return <section>
    {!sentTo ? <form aria-busy={busy} className="cw-login-form" onSubmit={submit}>
      <label>Email address<input name="email" autoComplete="email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
      <p>We’ll send a sign-in code. New here? This also starts your basic account. Creating an account does not grant paid membership.</p>
      <button className="cw-primary" disabled={busy || seconds > 0}>{busy ? 'Sending…' : seconds ? `Try again in ${seconds}s` : 'Continue with email →'}</button>
    </form> : <>
      <p role="status" className="cw-login-status">A code was requested for {sentTo}. Check your inbox and spam folder.</p>
      <form aria-busy={busy} className="cw-login-form" onSubmit={submit}>
        <label>Verification code<input ref={codeInput} name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={event => setCode(event.target.value)}/></label>
        <button className="cw-primary" disabled={busy}>{busy ? 'Checking…' : 'Verify and continue →'}</button>
      </form>
      <div className="cw-login-options">
        <button className="cw-link" disabled={busy || seconds > 0} onClick={() => void send()} type="button">{seconds ? `Request another code in ${seconds}s` : 'Request another code'}</button>
        <button className="cw-link" disabled={busy} onClick={() => { setSentTo(''); setCode(''); setError(''); }} type="button">Use a different email</button>
      </div>
      <p className="cw-login-help">Each code can be used once. If it has expired, request another one.</p>
    </>}
    {error && <p className="zx-alert" role="alert">{error}</p>}
  </section>;
}
