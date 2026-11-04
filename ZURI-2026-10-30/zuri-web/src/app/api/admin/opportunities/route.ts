import {getAuthorizedAdmin} from '@/lib/supabase/authorizeAdmin';
import {opportunitiesConfigured,opportunityJson} from '@/lib/opportunities/server';
import {studioBody} from '@/lib/studio/server';
import {xQuery,connectorRegistry} from '@/lib/opportunities/connectors';
import {safeLink,type Source} from '@/lib/opportunities/model';
export async function GET(){try{
 if(!opportunitiesConfigured())return opportunityJson({configured:false,connectors:connectorRegistry,reason:'Migration and server activation required.'});
 const access=await getAuthorizedAdmin();if('error'in access)return opportunityJson({error:access.error},access.status);
 const tables=['zuri_opportunity_sources','zuri_opportunity_runs','zuri_opportunities','zuri_opportunity_usage','zuri_opportunity_policy'] as const;
 const rows=await Promise.all(tables.map(table=>access.adminClient.from(table).select('*').limit(200)));
 if(rows.some(r=>r.error))throw Error();
 return opportunityJson({configured:true,connectors:connectorRegistry,...Object.fromEntries(tables.map((t,i)=>[t.replace('zuri_opportunity_','').replace('zuri_opportunities','opportunities'),rows[i].data]))});
 }catch{return opportunityJson({error:'Discovery administration unavailable.'},503);}}
export async function POST(request:Request){try{
 if(!opportunitiesConfigured())return opportunityJson({error:'Discovery is not activated.'},503);
 const access=await getAuthorizedAdmin();if('error'in access)return opportunityJson({error:access.error},access.status);
 const b=await studioBody(request) as Record<string,unknown>;
 let payload:Record<string,unknown>;
 if(b.action==='source'){
  if(typeof b.label!=='string'||b.label.length>120||!b.label.trim()||typeof b.permission_reference!=='string'||b.permission_reference.length<5||b.permission_reference.length>500||typeof b.query!=='string'||!['account','search'].includes(String(b.mode)))throw Error();
  xQuery({mode:b.mode,query:b.query} as Source);
  payload={label:b.label,mode:b.mode,query:b.query,permission_reference:b.permission_reference};
 }else if(b.action==='toggle-source'){
  if(typeof b.id!=='string'||typeof b.enabled!=='boolean')throw Error();payload={id:b.id,enabled:b.enabled};
 }else if(b.action==='moderate'){
  if(typeof b.id!=='string'||!['published','withdrawn','review'].includes(String(b.status)))throw Error();
  if(b.official_url&&!safeLink(b.official_url))throw Error();
  if(b.expires_at&&(typeof b.expires_at!=='string'||!Number.isFinite(Date.parse(b.expires_at))))throw Error();
  if(b.eligibility&&(typeof b.eligibility!=='string'||b.eligibility.length>1000))throw Error();
  if(b.status==='published'&&(b.evidence_reviewed!==true||typeof b.review_note!=='string'||b.review_note.length<10||b.review_note.length>1000))throw Error();
  payload={id:b.id,status:b.status,evidence_reviewed:b.evidence_reviewed===true,review_note:b.review_note,official_url:b.official_url,official_checked:b.official_checked===true,expires_at:b.expires_at,eligibility:b.eligibility};
 }else if(b.action==='link'){
  if(typeof b.id!=='string'||!['space','venue','organization','society','opportunity'].includes(String(b.kind))||typeof b.target_id!=='string'||!b.target_id.trim()||b.target_id.length>255||!safeLink(b.source_url))throw Error();
  if(b.kind==='space'){
   const {data,error}=await access.adminClient.from('zuri_website_content').select('id').eq('kind','space').eq('slug',b.target_id).eq('status','published').eq('consent_verified',true).maybeSingle();if(error||!data)throw Error();
  }
  payload={id:b.id,kind:b.kind,target_id:b.target_id,source_url:b.source_url};
 }else if(b.action==='policy'){
  if(typeof b.enabled!=='boolean'||!['daily_request_cap','daily_micros_cap','request_reserve_micros'].every(k=>Number.isSafeInteger(b[k])&&Number(b[k])>=0)||Number(b.daily_request_cap)>1000)throw Error();
  payload={enabled:b.enabled,daily_request_cap:b.daily_request_cap,daily_micros_cap:b.daily_micros_cap,request_reserve_micros:b.request_reserve_micros};
 }else throw Error();
 const {data,error}=await access.adminClient.rpc('zuri_opportunity_admin',{actor:access.userId,action:b.action,payload});
 if(error)return opportunityJson({error:'Review rejected. Check authority, source permission, freshness and evidence.'},400);
 return opportunityJson(data);
 }catch{return opportunityJson({error:'Invalid review. Evidence, permission and bounded inputs are required.'},400);}}
