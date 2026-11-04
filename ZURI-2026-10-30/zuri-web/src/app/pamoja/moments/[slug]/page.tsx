import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { validSpaceAddress } from '@/lib/navigation/routes';
import { loadGuestbook } from '@/lib/pamoja/public';
import MomentComposer from '@/components/pamoja/MomentComposer';
export const metadata = { title: 'Share a Moment | Pamoja', robots: { index: false, follow: false } };
async function Guestbook({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; if (!validSpaceAddress(slug)) notFound();
  const guestbook = await loadGuestbook(slug);
  return <main id="main" className="pamoja-page page-wrap narrow section-pad"><Link className="text-link" href={`/${slug}`}>← Back to the Space</Link><p className="eyebrow mt-10">A little life from here</p><h1 className="display">Share a Moment{guestbook.enabled ? <> at<br/>{guestbook.space_name}.</> : '.'}</h1><p className="intro">A note. A memory. Something useful to someone who finds this place.</p>{!guestbook.available ? <p role="status" className="mt-8">This guestbook is temporarily unavailable. Please try again later.</p> : !guestbook.enabled ? <p className="mt-8">This guestbook isn’t open for contributions. Example Spaces do not accept real notes.</p> : <MomentComposer slug={slug} spaceName={guestbook.space_name}/>}</main>;
}
export default function Page(props: { params: Promise<{ slug: string }> }) { return <Suspense fallback={<p role="status" className="p-12">Opening the guestbook…</p>}><Guestbook {...props}/></Suspense>; }
