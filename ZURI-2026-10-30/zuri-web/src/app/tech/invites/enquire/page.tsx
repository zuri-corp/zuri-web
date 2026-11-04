import {Suspense} from 'react';
import InvitesEnquiry from '@/components/site/InvitesEnquiry';
import {findOffer,offerContext} from '@/lib/commerce/offers';
import {weddingTemplate} from '@/lib/invites/templates';
export const metadata={title:'Your wedding website — Enquire with ZURI Invites'};
async function Form({searchParams}:{searchParams:Promise<{template?:string;offer?:string}>}){const params=await searchParams;const t=weddingTemplate(params.template??'');const candidate=findOffer(params.offer);const offer=candidate?.group==='invites'?candidate:undefined;return <InvitesEnquiry key={t?.slug??'custom'} templateName={t?.name} offerMessage={offerContext(offer?.id)}/>}
export default function Page({searchParams}:{searchParams:Promise<{template?:string;offer?:string}>}){return <Suspense fallback={<main id="main" className="page-wrap section-pad"><p role="status">Preparing your wedding enquiry…</p></main>}><Form searchParams={searchParams}/></Suspense>}

