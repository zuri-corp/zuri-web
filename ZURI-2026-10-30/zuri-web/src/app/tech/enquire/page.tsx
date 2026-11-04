import RequestForm from '@/components/site/RequestForm';
import {Suspense} from 'react';
import {enquiryContext} from '@/lib/technology/guidance';
import {services} from '@/lib/content/website';
import {offerContext} from '@/lib/commerce/offers';
import {productContext} from '@/lib/technology/products';
export const metadata={title:'Tell ZURI what you want to do',description:'Describe your goal. ZURI can help you explore, set up, build or manage the right technology.'};
type Params=Promise<{service?:string;goal?:string;audience?:string;product?:string;from?:string;offer?:string}>;
async function Form({searchParams}:{searchParams:Params}){const{service,goal,audience,product,from,offer}=await searchParams;return <RequestForm assistantBrief={from==='conversation'} initialService={services.some(s=>s.slug===service)?service:''} initialMessage={[offerContext(offer),productContext(product),enquiryContext(goal,audience)].filter(Boolean).join('\n\n')}/>}
export default function Page({searchParams}:{searchParams:Params}){return <main id="main" className="tech-page tech-enquiry-page"><div className="page-wrap section-pad"><p className="eyebrow blue">Tell us the goal</p><h1 className="display">Let’s make it work.</h1><p className="intro">A project, a problem or a “there must be an easier way.” Start with your words. We’ll help you figure out the rest.</p><div className="direct-request-layout"><aside><h2>How we can help</h2><p>Choose the right tools.<br/>Get them set up.<br/>Connect what you already use.<br/>Build when you need something new.<br/>Keep it working.</p><p>No account or invitation needed.</p></aside><Suspense fallback={<p role="status">Opening your request…</p>}><Form searchParams={searchParams}/></Suspense></div></div></main>}

