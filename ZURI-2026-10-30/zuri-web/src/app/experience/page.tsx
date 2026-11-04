import type { Metadata } from 'next';
import ZuriWebApp from '@/components/pamoja/ZuriWebApp';
export const metadata: Metadata = { title: 'ZURI web app', description: 'Your people, plans and possibilities. Your ZURI workspace.', robots: { index: false, follow: false } };
export default function Page() { return <ZuriWebApp />; }
