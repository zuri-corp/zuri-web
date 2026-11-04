import {timingSafeEqual} from 'node:crypto';
import {opportunitiesConfigured,opportunityJson,opportunityStore} from '@/lib/opportunities/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {runDiscovery} from '@/lib/opportunities/pipeline';
import {extractPublicEvidence} from '@/lib/opportunities/metered';
export async function POST(request:Request){
 const secret=process.env.ZURI_OPPORTUNITY_WORKER_SECRET,actual=request.headers.get('authorization')??'',expected=`Bearer ${secret}`;
 if(!secret||secret.length<32||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return opportunityJson({error:'Worker authorization required.'},401);
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)return opportunityJson({status:'disabled'},503);
 try{
  const {error}=await createAdminClient().rpc('zuri_opportunity_cleanup');if(error)throw Error();
  if(!opportunitiesConfigured())return opportunityJson({status:'disabled',reason:'Retention cleanup completed; ingestion disabled.'});
  if(!process.env.X_BEARER_TOKEN)return opportunityJson({status:'disabled',reason:'X server credentials are missing.'});
  // One bounded page for the entire application, never a user-triggered provider fetch.
  return opportunityJson(await runDiscovery(opportunityStore(),process.env.X_BEARER_TOKEN,undefined,extractPublicEvidence));
 }catch{return opportunityJson({error:'Worker storage unavailable. No live success claimed.'},503);}
}
