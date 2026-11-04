import {Suspense} from 'react';
import {connection} from 'next/server';
import {requireAdmin} from '@/lib/supabase/requireAdmin';
import {opportunitiesConfigured} from '@/lib/opportunities/server';
import OpportunityAdmin from '@/components/opportunities/OpportunityAdmin';
import '../../opportunities.css';
export const metadata={title:'Opportunity operations',robots:{index:false,follow:false}};
async function Review(){await connection();if(opportunitiesConfigured())await requireAdmin();return <main id="main" className="page-wrap section-pad"><OpportunityAdmin/></main>;}
export default function Page(){return <Suspense fallback={<p role="status">Checking review access…</p>}><Review/></Suspense>;}
