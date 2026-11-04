import type { SupabaseClient } from '@supabase/supabase-js';
type EmailAuth = Pick<SupabaseClient['auth'], 'signInWithOtp' | 'verifyOtp'>;
export const minimumPasswordLength = 12;

export function signInEmail(value: string) {
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

export function newPassword(value: string) {
  if (value.length < minimumPasswordLength) throw new Error(`Use at least ${minimumPasswordLength} characters for your password.`);
  if (value.length > 128) throw new Error('Use a password of no more than 128 characters.');
  return value;
}

export async function requestEmailCode(auth: EmailAuth, value: string) {
  const email = signInEmail(value);
  const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw new Error(error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit' ? 'Please wait before requesting another code.' : 'We couldn’t send a sign-in code. Please try again.');
  return email;
}
export async function verifyEmailCode(auth: EmailAuth, value: string, rawCode: string) {
  const email = signInEmail(value); const token = rawCode.trim();
  if (!/^\d{8}$/.test(token)) throw new Error('Enter the eight-digit code from your email.');
  const { data, error } = await auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.session || !data.user?.email_confirmed_at || !data.user.email) throw new Error('That code could not be verified. Check it or request a new one.');
}
