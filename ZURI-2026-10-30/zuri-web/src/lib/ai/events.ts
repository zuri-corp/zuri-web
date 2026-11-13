import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';

const MAX_SOURCE_ROWS=100;
const MAX_RESULTS=6;
const EAST_AFRICA_OFFSET=3*60*60*1000;

export type ViolaEvent={
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
export type ViolaEventReference=Pick<ViolaEvent['reference'],'source'|'id'>;

type EventFilters={
  location?:string;
  locationRequired:boolean;
  start?:number;
  end?:number;
  status:'available'|'upcoming'|'ongoing'|'unsupported';
};

export class EventSearchFailure extends Error {
  constructor(){super('Event source unavailable.');}
}

function object(value:unknown):Record<string,unknown>|null {
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

function text(value:unknown,max:number):string|null {
  return typeof value==='string'&&value.trim().length>0?value.trim().slice(0,max):null;
}

function canonicalUrl(value:unknown):string|null {
  if(typeof value!=='string')return null;
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password?url.toString():null;
  }catch{return null;}
}

function dateValue(value:unknown):number|null {
  if(typeof value!=='string')return null;
  const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T00:00:00+03:00`:value;
  const parsed=Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)?normalized:`${normalized}+03:00`);
  return Number.isFinite(parsed)?parsed:null;
}

function locationFields(value:unknown):ViolaEvent['location'] {
  const details=object(value)??{};
  const nested=object(details.location)??{};
  return {
    venue:text(nested.venue,100)??text(details.venue,100)??text(details.location,100),
    city:text(nested.city,80)??text(details.city,80),
    country:text(nested.country,80)??text(details.country,80),
  };
}

function eventTiming(start:number,end:number|null,now:number) {
  if(end!==null&&(end<now||end<start)||end===null&&start<now)return null;
  return {status:start<=now?'ongoing' as const:'upcoming' as const};
}

function normalizeMotionEvent(value:unknown,now:number):ViolaEvent|null {
  const row=object(value);
  if(!row||row.verification_status!=='verified'||row.publication_status!=='published')return null;
  const id=text(row.id,160),title=text(row.title,160);
  if(!id||!/^(quicket|x):[a-zA-Z0-9_-]+$/.test(id)||!title)return null;
  const sessions=Array.isArray(row.sessions)?row.sessions.map(object).filter((item):item is Record<string,unknown>=>!!item):[];
  const sessionTimes=sessions.map(item=>({start:dateValue(item.starts_at),end:dateValue(item.ends_at)}))
    .filter((item):item is {start:number;end:number|null}=>item.start!==null)
    .filter(item=>item.end===null||item.end>=now)
    .sort((a,b)=>a.start-b.start);
  const session=sessionTimes[0];
  if(sessions.length&&!session)return null;
  const start=session?.start??dateValue(row.next_occurrence_at)??dateValue(row.starts_at);
  if(start===null)return null;
  const end=session?.end??dateValue(row.ends_at);
  const timing=eventTiming(start,end,now);
  if(!timing)return null;
  const location=object(row.location);
  return {
    reference:{source:'motion_imported_events',id},
    source:'Motion',
    title,
    description:text(row.description,500)??'',
    canonicalUrl:canonicalUrl(row.registration_url)??canonicalUrl(object(row.source_payload)?.source_url),
    startsAt:new Date(start).toISOString(),
    endsAt:end===null?null:new Date(end).toISOString(),
    status:timing.status,
    visibility:'public',
    location:{
      venue:text(location?.venue,100),
      city:text(location?.city,80),
      country:text(location?.country,80),
    },
  };
}

function normalizeZuriEvent(value:unknown,now:number):ViolaEvent|null {
  const row=object(value);
  if(!row||row.kind!=='event'||row.status!=='published')return null;
  const id=text(row.id,64),title=text(row.title,160),start=dateValue(row.starts_at);
  if(!id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||!title||start===null)return null;
  const end=dateValue(row.ends_at);
  const timing=eventTiming(start,end,now);
  if(!timing)return null;
  const details=object(row.details)??{};
  return {
    reference:{source:'zuri_entities',id},
    source:'ZURI',
    title,
    description:text(row.description,500)??'',
    canonicalUrl:canonicalUrl(details.registrationUrl)??canonicalUrl(details.website),
    startsAt:new Date(start).toISOString(),
    endsAt:end===null?null:new Date(end).toISOString(),
    status:timing.status,
    visibility:row.visibility==='private'?'private':'public',
    location:locationFields(details),
  };
}

function kampalaDate(now:number) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(item=>item.type===type)?.value);
  return {year:part('year'),month:part('month'),day:part('day')};
}

function localMidnight(year:number,month:number,day:number) {
  return Date.UTC(year,month-1,day)-EAST_AFRICA_OFFSET;
}

function dateRange(query:string,now:number):{start:number;end:number}|undefined {
  const iso=query.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if(iso){
    const start=localMidnight(Number(iso[1]),Number(iso[2]),Number(iso[3]));
    const date=new Date(start+EAST_AFRICA_OFFSET);
    if(date.getUTCFullYear()!==Number(iso[1])||date.getUTCMonth()+1!==Number(iso[2])||date.getUTCDate()!==Number(iso[3]))return undefined;
    return {start,end:start+24*60*60*1000};
  }
  const {year,month,day}=kampalaDate(now);
  const today=localMidnight(year,month,day);
  if(/\btoday\b/i.test(query))return {start:Math.max(today,now),end:today+24*60*60*1000};
  if(/\btomorrow\b/i.test(query))return {start:today+24*60*60*1000,end:today+2*24*60*60*1000};
  if(/\bthis weekend\b/i.test(query)){
    const weekday=new Date(Date.UTC(year,month-1,day)).getUTCDay();
    const daysToSaturday=weekday===0?-1:weekday===6?0:6-weekday;
    const start=today+daysToSaturday*24*60*60*1000;
    return {start:Math.max(start,now),end:start+2*24*60*60*1000};
  }
  if(/\bnext week\b/i.test(query)){
    const weekday=new Date(Date.UTC(year,month-1,day)).getUTCDay();
    const daysToMonday=((8-weekday)%7)||7;
    const start=today+daysToMonday*24*60*60*1000;
    return {start,end:start+7*24*60*60*1000};
  }
  if(/\bthis week\b/i.test(query)){
    const weekday=new Date(Date.UTC(year,month-1,day)).getUTCDay();
    const end=today+((7-weekday)||7)*24*60*60*1000;
    return {start:Math.max(today,now),end};
  }
  return undefined;
}

function locationFilter(query:string) {
  if(/\b(?:near me|nearby|around me|in my area|near my location)\b/i.test(query))return {locationRequired:true};
  const match=query.match(/\b(?:in|near|around|at)\s+(?:the\s+)?([a-z0-9][a-z0-9 .'-]{1,79})/i);
  if(!match)return {locationRequired:false};
  let value=match[1]
    .split(/\b(?:today|tomorrow|tonight|this weekend|this week|next week|upcoming|ongoing|live|on 20\d{2}-\d{2}-\d{2}|for)\b/i)[0]
    .replace(/\b(?:events?|concerts?|happenings?|meetups?|festivals?)\b/ig,' ')
    .replace(/\s+/g,' ').trim();
  value=value.replace(/^(?:the city of|the town of)\s+/i,'').replace(/[.,!?]+$/,'').trim();
  return value?{location:value.toLowerCase(),locationRequired:false}:{locationRequired:false};
}

export function eventSearchFilters(query:string,now=Date.now()):EventFilters {
  const place=locationFilter(query);
  const range=dateRange(query,now);
  const explicitDate=/\b20\d{2}-\d{2}-\d{2}\b/.test(query);
  const status=/\b(?:past|ended|cancelled|canceled|yesterday|last week|last weekend)\b/i.test(query)
    ||explicitDate&&!range
    ||explicitDate&&/\b(?:after|before|between|from|through|until)\b/i.test(query)?'unsupported'
    :/\b(?:live|currently happening|happening now|ongoing)\b/i.test(query)?'ongoing'
    :/\b(?:upcoming|future)\b/i.test(query)?'upcoming':'available';
  return {...place,...(range??{}),status};
}

export function isEventSearch(query:string) {
  return /\b(?:what(?:'s| is) on|things to do)\b/i.test(query)
    ||/\b(?:events?|concerts?|happenings?|meetups?|festivals?)\b/i.test(query)
      &&/\b(?:find|search|show|list|discover|what|any|upcoming|near|in|around|happening|looking for)\b/i.test(query);
}

export function isEventReferenceFollowup(query:string) {
  return /\b(?:the\s+)?(?:first|second|third|last)\s+(?:event|one)\b/i.test(query)
    ||/\b(?:that|those|same)\s+(?:event|one|listing)\b/i.test(query)
    ||/\b(?:tell me more|go together|attend it|create a ping for (?:that|it|the event)|find people who want to go|join me at (?:this|that|the) (?:event|concert|show))\b/i.test(query);
}

function eventMatches(event:ViolaEvent,filters:EventFilters) {
  if(filters.status==='unsupported'||filters.locationRequired)return false;
  if(filters.status!=='available'&&filters.status!==event.status)return false;
  const start=Date.parse(event.startsAt),end=event.endsAt?Date.parse(event.endsAt):start;
  if(filters.start!==undefined&&end<filters.start||filters.end!==undefined&&start>=filters.end)return false;
  if(filters.location){
    const fields=Object.values(event.location).filter((item):item is string=>!!item).map(item=>item.toLocaleLowerCase());
    if(!fields.some(item=>item.includes(filters.location!)||filters.location!.includes(item)))return false;
  }
  return true;
}

export async function searchViolaEvents(query:string,now=Date.now(),references:ViolaEventReference[]|undefined,motionClient:SupabaseClient,userClient:SupabaseClient):Promise<ViolaEvent[]> {
  const filters=eventSearchFilters(query,now);
  if(filters.status==='unsupported'||filters.locationRequired||filters.end!==undefined&&filters.end<=now)return [];
  const nowIso=new Date(now).toISOString();
  const motionIds=references?.filter(reference=>reference.source==='motion_imported_events').map(reference=>reference.id)??[];
  const zuriIds=references?.filter(reference=>reference.source==='zuri_entities').map(reference=>reference.id)??[];
  const motionQuery=motionClient.from('motion_imported_events')
      .select('id,title,description,starts_at,ends_at,sessions,next_occurrence_at,location,registration_url,source_payload,verification_status,publication_status')
      .eq('verification_status','verified')
      .eq('publication_status','published');
  const zuriQuery=userClient.from('zuri_entities')
      .select('id,kind,title,description,status,visibility,starts_at,ends_at,details')
      .eq('kind','event')
      .eq('status','published');
  if(references){
    if(motionIds.length)motionQuery.in('id',motionIds);
    if(zuriIds.length)zuriQuery.in('id',zuriIds);
  }else{
    motionQuery.or(`next_occurrence_at.gte.${nowIso},ends_at.gte.${nowIso}`).order('next_occurrence_at',{ascending:true});
    zuriQuery.or(`starts_at.gte.${nowIso},ends_at.gte.${nowIso}`).order('starts_at',{ascending:true});
  }
  const [motion,zuri]=await Promise.all([
    motionIds.length||!references?motionQuery.limit(MAX_SOURCE_ROWS):Promise.resolve({data:[],error:null}),
    zuriIds.length||!references?zuriQuery.limit(MAX_SOURCE_ROWS):Promise.resolve({data:[],error:null}),
  ]);
  if(motion.error||zuri.error||!Array.isArray(motion.data)||!Array.isArray(zuri.data))throw new EventSearchFailure();
  const normalized=[
    ...motion.data.map((row:unknown)=>normalizeMotionEvent(row,now)).filter((event:ViolaEvent|null):event is ViolaEvent=>!!event),
    ...zuri.data.map((row:unknown)=>normalizeZuriEvent(row,now)).filter((event:ViolaEvent|null):event is ViolaEvent=>!!event),
  ];
  const ordered=references
    ?references.flatMap(reference=>normalized.find(event=>event.reference.source===reference.source&&event.reference.id===reference.id)??[])
    :normalized.filter(event=>eventMatches(event,filters))
    .sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)||a.source.localeCompare(b.source)||a.reference.id.localeCompare(b.reference.id))
  return ordered.slice(0,MAX_RESULTS);
}
