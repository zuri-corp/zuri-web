import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {createServerSupabaseClient} from '@/lib/supabase/server';
export const opportunityJson=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export function opportunitiesConfigured(){return process.env.ZURI_OPPORTUNITIES_ENABLED==='true'&&!!process.env.SUPABASE_URL&&!!process.env.SUPABASE_SECRET_KEY;}
export function opportunityStore(){
  const client=createAdminClient();
  return {
    async claim(){const {data,error}=await client.rpc('zuri_opportunity_claim');if(error)throw Error('Opportunity storage unavailable.');return data;},
    async knownFingerprints(fingerprints:string[]){if(!fingerprints.length)return [];const {data,error}=await client.from('zuri_opportunities').select('fingerprint').in('fingerprint',fingerprints);if(error)throw Error('Deduplication unavailable.');return (data??[]).map(r=>r.fingerprint as string);},
    async finish(source:{id:string;lease_token?:string},run:string,payload:Record<string,unknown>){const {error}=await client.rpc('zuri_opportunity_finish',{source:source.id,token:source.lease_token,run,payload});if(error)throw Error('Opportunity checkpoint unavailable.');},
  };
}
export async function opportunitySession(){
 const client=await createServerSupabaseClient(),{data:{user},error}=await client.auth.getUser();
 if(error||!user)return {response:opportunityJson({error:'Sign in with your ZURI account.'},401)};
 return {client,user};
}
export const publicOpportunityColumns='id,kind,title,summary,tags,location,eligibility,expires_at,status,confidence,source_url,official_url,official_verified_at,discovered_at,refreshed_at,fresh_until,space_id,venue_place_id';
