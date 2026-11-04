import {connection} from 'next/server';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {opportunitiesConfigured,opportunityJson,publicOpportunityColumns} from '@/lib/opportunities/server';
import {connectorRegistry} from '@/lib/opportunities/connectors';
import {opportunityKinds} from '@/lib/opportunities/model';
export async function GET(request:Request){await connection();
 if(!opportunitiesConfigured())return opportunityJson({configured:false,items:[],connectors:connectorRegistry,reason:'Discovery is not activated. No live opportunities are being claimed.'});
 try{
  const params=new URL(request.url).searchParams,kind=params.get('kind'),location=params.get('location')?.trim().slice(0,100),q=params.get('q')?.trim().slice(0,120);
  let query=createPublicSupabaseClient().from('zuri_opportunities').select(publicOpportunityColumns).eq('status','published').gt('fresh_until',new Date().toISOString()).order('refreshed_at',{ascending:false}).limit(100);
  if(kind&&opportunityKinds.includes(kind as typeof opportunityKinds[number]))query=query.eq('kind',kind);
  if(location)query=query.ilike('location',`%${location.replace(/[%_\\]/g,'')}%`);
  if(q)query=query.textSearch('title_summary_search',q,{type:'plain',config:'english'});
  const {data,error}=await query;if(error)throw Error('Storage unavailable');
  return opportunityJson({configured:true,items:data??[],connectors:connectorRegistry,asOf:new Date().toISOString(),limited:true});
 }catch{return opportunityJson({configured:false,items:[],reason:'Discovery storage is unavailable. Check migration and server configuration.'},503);}
}
