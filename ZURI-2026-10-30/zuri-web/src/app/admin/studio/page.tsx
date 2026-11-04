import {Suspense} from 'react';
import {connection} from 'next/server';
import {requireAdmin} from '@/lib/supabase/requireAdmin';
import {studioConfigured} from '@/lib/studio/server';
import StudioWorkbench from '@/components/studio/StudioWorkbench';
async function Review(){await connection();if(studioConfigured())await requireAdmin();return <StudioWorkbench adminView/>;}
export const metadata={title:'Developer Tool review',robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<main id="main" className="page-wrap section-pad"><p role="status">Verifying review access…</p></main>}><Review/></Suspense>;}
