import {opportunitiesConfigured,opportunitySession,opportunityJson} from '@/lib/opportunities/server';
import {studioBody} from '@/lib/studio/server';
export async function GET(){try{
 if(!opportunitiesConfigured())return opportunityJson({error:'Discovery is not activated.'},503);
 const access=await opportunitySession();if('response'in access)return access.response;
 const [prefs,saves]=await Promise.all([access.client.from('zuri_opportunity_preferences').select('interests,location').eq('user_id',access.user.id).maybeSingle(),access.client.from('zuri_opportunity_saves').select('opportunity_id,created_at').eq('user_id',access.user.id).limit(500)]);
 if(prefs.error||saves.error)throw Error();return opportunityJson({preferences:prefs.data,saves:saves.data});
 }catch{return opportunityJson({error:'Account discovery storage is unavailable.'},503);}}
export async function POST(request:Request){try{
 if(!opportunitiesConfigured())return opportunityJson({error:'Discovery is not activated.'},503);
 const access=await opportunitySession();if('response'in access)return access.response;
 const body=await studioBody(request) as {action?:string;id?:string;interests?:string[];location?:string};
 if(body.action==='preferences'){
  if(!Array.isArray(body.interests)||body.interests.length>12||body.interests.some(x=>typeof x!=='string'||x.length>50)||typeof body.location!=='string'||body.location.length>100)return opportunityJson({error:'Invalid interests or location.'},400);
  const {error}=await access.client.from('zuri_opportunity_preferences').upsert({user_id:access.user.id,interests:body.interests,location:body.location,updated_at:new Date().toISOString()});if(error)throw Error();
 }else if(['save','unsave'].includes(body.action??'')&&typeof body.id==='string'&&/^[0-9a-f-]{36}$/i.test(body.id)){
  const query=access.client.from('zuri_opportunity_saves');const {error}=body.action==='save'?await query.upsert({user_id:access.user.id,opportunity_id:body.id}):await query.delete().eq('user_id',access.user.id).eq('opportunity_id',body.id);if(error)throw Error();
 }else return opportunityJson({error:'Invalid discovery operation.'},400);
 return opportunityJson({saved:true});
 }catch{return opportunityJson({error:'Unable to save. Check sign-in and discovery availability.'},400);}}
