import {Suspense} from 'react';
import RequestForm from '@/components/site/RequestForm';
import {findOffer,offerContext} from '@/lib/commerce/offers';
export const metadata={title:'Contact ZURI',description:'Get in touch with ZURI about technology, collaboration or a question.'};
type Params=Promise<{offer?:string}>;
async function Form({searchParams}:{searchParams:Params}){const id=(await searchParams).offer;const offer=findOffer(id);return <>{offer&&<p className="pricing-enquiry-note">{offer.planned?'Planned offer interest':'Your selected starting point'}: <strong>{offer.name}</strong>. We confirm scope and availability before any commitment.</p>}<RequestForm mode="general" initialMessage={offerContext(id)}/></>}
export default function Page({searchParams}:{searchParams:Params}){return <main id="main" className="light-page"><div className="page-wrap narrow"><p className="eyebrow">One ZURI / Get in touch</p><h1 className="display">Let’s begin a conversation.</h1><p className="intro">Share a project, a question or a possible collaboration. Your request goes to ZURI’s internal enquiry team.</p><Suspense fallback={<p role="status">Preparing your enquiry…</p>}><Form searchParams={searchParams}/></Suspense></div></main>}
