import Link from 'next/link';
import RequestForm from '@/components/site/RequestForm';
export const metadata={title:'Is this yours? | Pamoja',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{address?:string}>}) {
 const raw=(await searchParams).address??''; const address=raw.length<=150?raw:'';
 return <main id="main" className="pamoja-page page-wrap narrow section-pad"><Link href="/pamoja" className="text-link">← Pamoja</Link><p className="eyebrow mt-10">A home you can help shape</p><h1 className="display">Is this yours?</h1><p className="intro">Tell us which presence you manage and how we can check your connection to it.</p><p className="muted mb-8">ZURI reviews requests personally. Sending this form grants no access and changes nothing on the public page. We’ll verify your authority and an account before enabling management. Please do not send passwords, identity documents or other sensitive evidence here.</p><RequestForm mode="claim" initialMessage={address?`Presence: ${address}\n\nMy role and how ZURI can verify it: `:'Presence URL or name:\n\nMy role and how ZURI can verify it: '}/></main>;
}
