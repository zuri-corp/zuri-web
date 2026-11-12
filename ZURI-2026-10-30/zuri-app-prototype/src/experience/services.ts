import {sourceLinks,type KnowledgeSource} from '../core/knowledge';
import {reviewedAIMessages,matchesAIReview} from '../core/privacy';
import {readConversationIntent,type ConversationIntent} from '../core/intents';
import {safeEventUrl} from '../lib/motion-event-dates';
export type ViolaEventResult={
  reference:{source:'motion_imported_events'|'zuri_entities';id:string};
  source:'Motion'|'ZURI';
  title:string;
  description:string;
  canonicalUrl:string|null;
  startsAt:string;
  endsAt:string|null;
  status:'upcoming'|'ongoing';
  visibility:'public'|'private';
  location:{venue:string|null;city:string|null;country:string|null};
};
export type ViolaPingResult={
  reference:{source:'zuri_entities';id:string};
  title:string;
  description:string;
  startsAt:string;
  endsAt:string|null;
  status:'upcoming'|'ongoing';
  visibility:'public'|'private';
  joinPolicy:'open'|'approval'|'invite';
  capacity:number|null;
  location:{venue:string|null;city:string|null;country:string|null};
  category:string|null;
};
export type ViolaPingDraft={
  title:string;
  description:string;
  startsAt:string|null;
  timeZone:'Africa/Kampala';
  location:string;
  participantCount:number|null;
  category:string;
  visibility:'public'|'private'|null;
  joinPolicy:'open'|'approval'|'invite'|null;
  linkedEvent:{reference:ViolaEventResult['reference'];title:string;visibility:'public'|'private'}|null;
};
export function readViolaEvents(value:unknown):ViolaEventResult[]{
  if(!Array.isArray(value))return [];
  return value.slice(0,6).flatMap(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))return [];
    const event=item as Record<string,unknown>,reference=event.reference as Record<string,unknown>|null,location=event.location as Record<string,unknown>|null;
    if(!reference||typeof reference!=='object'||!location||typeof location!=='object')return [];
    const source=reference.source,id=reference.id,title=event.title,startsAt=event.startsAt,endsAt=event.endsAt,status=event.status;
    const validId=source==='motion_imported_events'?typeof id==='string'&&/^(quicket|x):[a-zA-Z0-9_-]+$/.test(id):source==='zuri_entities'&&typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if(!validId||typeof title!=='string'||!title.trim()||title.length>160||typeof startsAt!=='string'||!Number.isFinite(Date.parse(startsAt))||!(endsAt===null||typeof endsAt==='string'&&Number.isFinite(Date.parse(endsAt)))||!['upcoming','ongoing'].includes(String(status)))return [];
    if(source==='motion_imported_events'&&event.source!=='Motion'||source==='zuri_entities'&&event.source!=='ZURI')return [];
    const field=(key:string,max:number)=>typeof location[key]==='string'?(location[key] as string).slice(0,max):null;
    const url=typeof event.canonicalUrl==='string'?safeEventUrl(event.canonicalUrl):undefined;
    return [{
      reference:{source,id} as ViolaEventResult['reference'],
      source:event.source as ViolaEventResult['source'],
      title:title.trim(),
      description:typeof event.description==='string'?event.description.slice(0,500):'',
      canonicalUrl:url??null,
      startsAt,
      endsAt,
      status:status as ViolaEventResult['status'],
      visibility:event.visibility==='private'?'private':'public',
      location:{venue:field('venue',100),city:field('city',80),country:field('country',80)},
    }];
  });
}
export function readViolaPings(value:unknown):ViolaPingResult[]{
  if(!Array.isArray(value))return [];
  return value.slice(0,6).flatMap(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))return [];
    const ping=item as Record<string,unknown>,reference=ping.reference as Record<string,unknown>|null,location=ping.location as Record<string,unknown>|null;
    if(!reference||reference.source!=='zuri_entities'||typeof reference.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference.id)||!location||typeof location!=='object')return [];
    if(typeof ping.title!=='string'||!ping.title.trim()||ping.title.length>120||typeof ping.startsAt!=='string'||!Number.isFinite(Date.parse(ping.startsAt))||!(ping.endsAt===null||typeof ping.endsAt==='string'&&Number.isFinite(Date.parse(ping.endsAt)))||!['upcoming','ongoing'].includes(String(ping.status)))return [];
    const field=(key:string,max:number)=>typeof location[key]==='string'?(location[key] as string).slice(0,max):null;
    return [{
      reference:{source:'zuri_entities',id:reference.id},
      title:ping.title.trim(),
      description:typeof ping.description==='string'?ping.description.slice(0,500):'',
      startsAt:ping.startsAt,
      endsAt:ping.endsAt as string|null,
      status:ping.status as ViolaPingResult['status'],
      visibility:ping.visibility==='private'?'private':'public',
      joinPolicy:ping.joinPolicy==='open'||ping.joinPolicy==='invite'?ping.joinPolicy:'approval',
      capacity:Number.isSafeInteger(ping.capacity)&&Number(ping.capacity)>0?Number(ping.capacity):null,
      location:{venue:field('venue',100),city:field('city',80),country:field('country',80)},
      category:typeof ping.category==='string'?ping.category.slice(0,80):null,
    }];
  });
}
export function readViolaPingDraft(value:unknown):ViolaPingDraft|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const draft=value as Record<string,unknown>;
  if(typeof draft.title!=='string'||draft.title.length>120||typeof draft.description!=='string'||draft.description.length>1000||!(draft.startsAt===null||typeof draft.startsAt==='string'&&Number.isFinite(Date.parse(draft.startsAt)))||draft.timeZone!=='Africa/Kampala'||typeof draft.location!=='string'||draft.location.length>120||!(draft.participantCount===null||Number.isSafeInteger(draft.participantCount)&&Number(draft.participantCount)>0&&Number(draft.participantCount)<=100)||typeof draft.category!=='string'||draft.category.length>80||draft.visibility!==null||draft.joinPolicy!==null)return null;
  let linkedEvent:ViolaPingDraft['linkedEvent']=null;
  if(draft.linkedEvent!==null){
    if(!draft.linkedEvent||typeof draft.linkedEvent!=='object'||Array.isArray(draft.linkedEvent))return null;
    const linked=draft.linkedEvent as Record<string,unknown>,reference=linked.reference as Record<string,unknown>|null;
    if(!reference||typeof linked.title!=='string'||!['public','private'].includes(String(linked.visibility)))return null;
    if(reference.source==='motion_imported_events'&&typeof reference.id==='string'&&/^(quicket|x):[a-zA-Z0-9_-]+$/.test(reference.id))linkedEvent={reference:{source:reference.source,id:reference.id},title:linked.title.slice(0,160),visibility:linked.visibility as 'public'|'private'};
    else if(reference.source==='zuri_entities'&&typeof reference.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference.id))linkedEvent={reference:{source:reference.source,id:reference.id},title:linked.title.slice(0,160),visibility:linked.visibility as 'public'|'private'};
    else return null;
  }
  return {title:draft.title,description:draft.description,startsAt:draft.startsAt as string|null,timeZone:'Africa/Kampala',location:draft.location,participantCount:draft.participantCount as number|null,category:draft.category,visibility:null,joinPolicy:null,linkedEvent};
}
/** Only a public API location belongs in the client. Provider keys stay on a server. */
export function resolveApiBase(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const base = value.trim().replace(/\/$/, '');
  if (/^\/(?!\/)/.test(base)) return base;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return base;
  } catch { /* A missing or invalid service does not disable the local workspace. */ }
  return null;
}
export function websiteLoginUrl(next:string,origin=import.meta.env?.VITE_ZURI_WEBSITE_ORIGIN):string {
  const destination='/pamoja/login?next='+encodeURIComponent(next);
  if(typeof origin!=='string'||!origin)return destination;
  try{
    const url=new URL(origin);
    if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return destination;
    return url.origin+destination;
  }catch{return destination;}
}
const apiBase = resolveApiBase(import.meta.env?.VITE_ZURI_API_BASE);
export function backendEndpoint(){return apiBase?`${apiBase}/backend`:null;}
export function opportunityEndpoint(){return apiBase?`${apiBase}/opportunities`:null;}
let lastReviewedAI={json:"",id:""};
export function intentGatewayUrl(){return apiBase?`${apiBase}/ai`:null;}
export function violaDestination(){return apiBase?apiBase+'/viola':'No AI service configured';}
export async function getViolaStatus(signal?: AbortSignal): Promise<{enabled:boolean;reason?:string}> {
  if (!apiBase) return (await import('./aiService')).getViolaStatus(signal);
  const response = await fetch(`${apiBase}/viola`, {signal, credentials:'include', headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error('The app service is unavailable.');
  const value = await response.json();
  return {enabled:value.enabled === true,reason:typeof value.reason==="string"?value.reason:undefined};
}
export async function askViola(messages: {role:'user'|'assistant'; content:string}[],approvedJson?:string,eventReferences:ViolaEventResult['reference'][]=[],pingReferences:string[]=[]): Promise<{reply:string;intent:ConversationIntent|null;sources:KnowledgeSource[];events:ViolaEventResult[];pings:ViolaPingResult[];pingDraft:ViolaPingDraft|null}> {
  if(!approvedJson||!matchesAIReview(messages,approvedJson))throw Error('Review the exact conversation before sending.');
  messages=reviewedAIMessages(messages);
  const json=JSON.stringify({messages,eventReferences,pingReferences});if(lastReviewedAI.json!==json)lastReviewedAI={json,id:crypto.randomUUID()};
  const {response,value}=await (await import('./aiService')).requestAI('viola',{method:'POST',body:JSON.stringify({messages,eventReferences,pingReferences,consent:true,requestId:lastReviewedAI.id}),signal:AbortSignal.timeout(50000)});
  if (!response.ok || typeof value.reply !== 'string' || !value.reply.trim()) throw new Error(typeof value.error === 'string' ? value.error : 'Viola could not finish. Please retry.');
  return {reply:value.reply,intent:readConversationIntent(value.intent,messages,'app'),sources:sourceLinks(value.sources),events:readViolaEvents(value.events),pings:readViolaPings(value.pings),pingDraft:readViolaPingDraft(value.pingDraft)};
}
