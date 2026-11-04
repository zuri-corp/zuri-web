import { NextRequest, NextResponse } from 'next/server';
import { accountReturn } from '@/lib/pamoja/account';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const code = query.get('code');
  if (!code) return NextResponse.redirect(new URL('/pamoja/login?authError=1', request.url));

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/pamoja/login?authError=1', request.url));

    const destination = accountReturn(query.get('next'));
    if (query.get('flow') === 'recovery') {
      const login = new URL('/pamoja/login', request.url);
      login.searchParams.set('recovery', '1');
      login.searchParams.set('next', destination);
      return NextResponse.redirect(login);
    }
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return NextResponse.redirect(new URL('/pamoja/login?authError=1', request.url));
  }
}
