import { Suspense } from 'react';
import EmailLogin from '@/components/pamoja/EmailLogin';
import { accountReturn } from '@/lib/pamoja/account';
export const metadata = { title: 'Your basic account | Pamoja' };
async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <EmailLogin next={accountReturn((await searchParams).next)}/>;
}
export default function Page(props: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<p role="status" className="p-12">Opening sign-in…</p>}><Login {...props}/></Suspense>;
}
