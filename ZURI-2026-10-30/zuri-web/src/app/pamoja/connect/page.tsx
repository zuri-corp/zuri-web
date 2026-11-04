import PamojaNetwork from '@/components/site/PamojaNetwork';
import Link from 'next/link';
import {Suspense} from 'react';
import PresenceIntake from '@/components/site/PresenceIntake';
export const metadata={title:'Your Pamoja presence — Start simply',description:'Your name, photos, work, offerings and chosen links. Create a simple profile brief and preview it before sharing with ZURI.'};
type Params=Promise<{package?:string}>;
async function Form({searchParams}:{searchParams:Params}){return <PresenceIntake initialPackage={(await searchParams).package}/>}
export default function Page({searchParams}:{searchParams:Params}){return <main id="main" className="pamoja-page pamoja-repositioned presence-connect pamoja-opportunity"><div className="page-wrap"><Link href="/pamoja" className="text-link">← Discover Pamoja</Link><header className="presence-connect-heading"><PamojaNetwork/><p className="eyebrow">Your presence starts with you</p><h1>Your work.<br/><em>One useful home.</em></h1><p>A name. A few photos. What you do, sell and offer. Your own links. Start simply—we’ll help with the rest.</p><Link href="/pricing#presence-care" className="pn-inline">Compare setup and care prices ↗</Link></header><Suspense fallback={<p role="status">Opening your profile setup…</p>}><Form searchParams={searchParams}/></Suspense></div></main>}
