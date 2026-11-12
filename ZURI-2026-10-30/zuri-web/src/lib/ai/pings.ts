import 'server-only';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {eventSearchFilters,isEventReferenceFollowup} from './events';
import type {ViolaEvent,ViolaEventReference} from './events';

const MAX_SOURCE_ROWS=100;
const MAX_RESULTS=6;
const KAMPALA_OFFSET=3*60*60*1000;

export type ViolaPingReference={source:'zuri_entities';id:string};
export type ViolaPing={
  reference:ViolaPingReference;
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
  visibility:null;
  joinPolicy:null;
  linkedEvent:{reference:ViolaEventReference;title:string;visibility:'public'|'private'}|null;
};

export class PingSearchFailure extends Error {
  constructor(){super('Ping source unavailable.');}
}

function object(value:unknown):Record<string,unknown>|null {
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

function text(value:unknown,max:number):string|null {
  return typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;
}

function dateValue(value:unknown):number|null {
  if(typeof value!=='string')return null;
  const parsed=Date.parse(value);
  return Number.isFinite(parsed)?parsed:null;
}

function normalizePing(value:unknown,now:number):ViolaPing|null {
  const row=object(value);
  if(!row||row.kind!=='ping'||row.status!=='published')return null;
  const id=text(row.id,64),title=text(row.title,120),start=dateValue(row.starts_at);
  if(!id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||!title||start===null)return null;
  const end=dateValue(row.ends_at);
  if(end!==null&&end<now||end===null&&start<now)return null;
  const details=object(row.details)??{},location=object(details.location)??{};
  const locationText=text(details.location,100);
  const field=(key:string,max:number)=>text(location[key],max)??text(details[key],max);
  return {
    reference:{source:'zuri_entities',id},
    title,
    description:text(row.description,500)??'',
    startsAt:new Date(start).toISOString(),
    endsAt:end===null?null:new Date(end).toISOString(),
    status:start<=now?'ongoing':'upcoming',
    visibility:row.visibility==='private'?'private':'public',
    joinPolicy:row.join_policy==='open'||row.join_policy==='invite'?row.join_policy:'approval',
    capacity:Number.isSafeInteger(row.capacity)&&Number(row.capacity)>0?Number(row.capacity):null,
    location:{
      venue:field('venue',100)??locationText,
      city:field('city',80),
      country:field('country',80),
    },
    category:text(details.category,80),
  };
}

function pingMatches(ping:ViolaPing,query:string,now:number):boolean {
  const filters=eventSearchFilters(query,now);
  if(filters.status==='unsupported'||filters.locationRequired)return false;
  if(filters.status!=='available'&&filters.status!==ping.status)return false;
  const starts=Date.parse(ping.startsAt),ends=ping.endsAt?Date.parse(ping.endsAt):starts;
  if(filters.start!==undefined&&ends<filters.start||filters.end!==undefined&&starts>=filters.end)return false;
  if(filters.location){
    const values=[ping.location.venue,ping.location.city,ping.location.country,ping.category,ping.title]
      .filter((item):item is string=>!!item).map(item=>item.toLocaleLowerCase());
    if(!values.some(item=>item.includes(filters.location!)||filters.location!.includes(item)))return false;
  }
  return true;
}

export function isPingSearch(query:string) {
  return /\bpings?\b/i.test(query)
    ||/\b(?:anyone up for|anyone heading to|looking for (?:someone(?: to)?|people|two|three|a person|study partners|players)|find people(?: who want to)?|who wants to join)\b/i.test(query);
}

export function isPingReferenceFollowup(query:string) {
  return /\b(?:the\s+)?(?:first|second|third|last)\s+(?:ping|one)\b/i.test(query)
    ||/\b(?:that|those|same)\s+(?:ping|one|people)\b/i.test(query)
    ||/\b(?:tell me more|join it|join them|can we go together)\b/i.test(query);
}

export async function searchViolaPings(query:string,now=Date.now(),references?:ViolaPingReference[]):Promise<ViolaPing[]> {
  const filters=eventSearchFilters(query,now);
  if(filters.status==='unsupported'||filters.locationRequired||filters.end!==undefined&&filters.end<=now)return [];
  const client=await createServerSupabaseClient();
  let request=client.from('zuri_entities')
    .select('id,kind,title,description,status,visibility,join_policy,starts_at,ends_at,capacity,details')
    .eq('kind','ping')
    .eq('status','published');
  if(references?.length)request=request.in('id',references.map(reference=>reference.id));
  else request=request.or(`starts_at.gte.${new Date(now).toISOString()},ends_at.gte.${new Date(now).toISOString()}`).order('starts_at',{ascending:true});
  const result=await request.limit(references?references.length:MAX_SOURCE_ROWS);
  if(result.error||!Array.isArray(result.data))throw new PingSearchFailure();
  const rows=result.data.map((row:unknown)=>normalizePing(row,now)).filter((ping:ViolaPing|null):ping is ViolaPing=>!!ping);
  const matched=references
    ?references.flatMap(reference=>rows.find(ping=>ping.reference.id===reference.id)??[])
    :rows.filter(ping=>pingMatches(ping,query,now))
      .sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)||a.reference.id.localeCompare(b.reference.id));
  return matched.slice(0,MAX_RESULTS);
}

function kampalaDate(now:number) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(item=>item.type===type)?.value);
  return {year:part('year'),month:part('month'),day:part('day')};
}

function parsePingStart(query:string,now:number):string|null {
  const dateToken=query.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|20\d{2}-\d{2}-\d{2})\b/i)?.[0];
  if(!dateToken)return null;
  const {year,month,day}=kampalaDate(now);
  let date=new Date(Date.UTC(year,month-1,day));
  if(dateToken.toLowerCase()==='tomorrow')date.setUTCDate(date.getUTCDate()+1);
  else if(dateToken.toLowerCase()!=='today'&&!/^\d{4}-\d{2}-\d{2}$/.test(dateToken)){
    const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const days=(weekdays.indexOf(dateToken.toLowerCase())-date.getUTCDay()+7)%7||7;
    date.setUTCDate(date.getUTCDate()+days);
  }else if(/^\d{4}-\d{2}-\d{2}$/.test(dateToken)){
    const [y,m,d]=dateToken.split('-').map(Number);
    date=new Date(Date.UTC(y,m-1,d));
    if(date.getUTCFullYear()!==y||date.getUTCMonth()+1!==m||date.getUTCDate()!==d)return null;
  }
  const time=query.match(/\bat\s+(noon|midnight|(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)?|(?:[01]?\d|2[0-3]):[0-5]\d)\b/i)?.[1];
  if(!time)return null;
  let hour:number,minute=0;
  if(/^noon$/i.test(time))hour=12;
  else if(/^midnight$/i.test(time))hour=0;
  else{
    const match=time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if(!match)return null;
    hour=Number(match[1]);minute=Number(match[2]??0);
    const meridiem=match[3]?.toLowerCase();
    if(meridiem){if(hour<1||hour>12)return null;hour=hour%12+(meridiem==='pm'?12:0);}
    else if(!match[2]||hour>23)return null;
  }
  const startsAt=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),hour,minute)-KAMPALA_OFFSET);
  return startsAt.getTime()>now?startsAt.toISOString():null;
}

function pingLocation(query:string):string {
  const destination=query.match(/\banyone heading to\s+([a-z0-9][a-z0-9 .'-]{1,99})/i);
  if(destination)return destination[1].split(/\b(?:on\s+)?(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|20\d{2}-\d{2}-\d{2})\b/i)[0].trim().slice(0,120);
  const match=query.match(/\b(?:at|in|near)\s+([a-z0-9][a-z0-9 .'-]{1,99})/i);
  if(!match)return '';
  const location=match[1]
    .split(/\b(?:today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this weekend|next week|at\s+(?:noon|midnight|\d)|i need|looking for|need\s+\d+)\b/i)[0]
    .replace(/[.,!?]+$/,'').trim().slice(0,120);
  return /^(?:(?:this|that|the)\s+)?(?:event|concert|show|ping)$/i.test(location)?'':location;
}

function pingTitle(query:string):string {
  if(/\banyone heading to\b/i.test(query))return `Heading to ${pingLocation(query)}`.trim().slice(0,120);
  const stripped=query.replace(/^\s*(?:viola[,:\s]*)?/i,'')
    .replace(/^(?:create|make|start|post|set up|draft)\s+(?:a\s+)?(?:motion\s+)?ping\s+(?:for\s+)?/i,'')
    .replace(/^(?:anyone up for|anyone heading to|looking for\s+(?:one|two|three|four|five|\d+)\s+people to|looking for someone to(?: join me)?|who wants to(?: join me)?)\s+/i,'')
    .replace(/^join me\s+/i,'');
  if(/^(?:(?:the\s+)?(?:first|second|third|last)(?:\s+(?:event|one))?|that|this|the event|it)\b/i.test(stripped))return '';
  return stripped.split(/\b(?:at|in|near|today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this weekend|next week|on 20\d{2}-\d{2}-\d{2}|i need|looking for|need\s+\d+)\b/i)[0]
    .replace(/[?.!,]+$/,'').trim().slice(0,120);
}

function desiredParticipants(query:string):number|null {
  const match=query.match(/\b(?:need|looking for|want|find)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+(?:people|players|participants|friends)\b/i);
  if(!match)return null;
  const values:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  const count=values[match[1].toLowerCase()]??Number(match[1]);
  return Number.isInteger(count)&&count>0&&count<=100?count:null;
}

export function isPingCreationRequest(query:string) {
  return /\b(?:create|make|start|post|set up|draft)\s+(?:a\s+)?(?:motion\s+)?ping\b/i.test(query)
    ||/\b(?:anyone up for|anyone heading to|looking for someone to|looking for (?:two|three|four|five|\d+)\s+(?:people|players|someone)|who wants to (?:join me|play|study|go|attend))\b/i.test(query);
}

export function prepareViolaPingDraft(query:string,events:ViolaEvent[],now=Date.now()):ViolaPingDraft|null {
  if(!isPingCreationRequest(query))return null;
  const ordinal=query.match(/\b(first|1st|second|2nd|third|3rd|last)\b/i)?.[1]?.toLowerCase();
  const eventIndex=ordinal==='first'||ordinal==='1st'?0:ordinal==='second'||ordinal==='2nd'?1:ordinal==='third'||ordinal==='3rd'?2:ordinal==='last'?events.length-1:-1;
  const namedEvent=events.find(event=>event.title.length>3&&query.toLocaleLowerCase().includes(event.title.toLocaleLowerCase()));
  const linkRequested=isEventReferenceFollowup(query)||!!namedEvent;
  const linkedEvent=linkRequested?(namedEvent??(eventIndex>=0?events[eventIndex]:events.length===1?events[0]:undefined)):undefined;
  const location=pingLocation(query)||[linkedEvent?.location.venue,linkedEvent?.location.city].filter(Boolean).join(', ');
  const title=pingTitle(query)||linkedEvent?.title||'';
  const category=/\b(?:football|fifa|basketball|volleyball|sport|game)\b/i.test(query)?'Sport':/study|calculus|homework/i.test(query)?'Study':'';
  return {
    title,
    description:query.trim().slice(0,1000),
    startsAt:linkedEvent?.startsAt??parsePingStart(query,now),
    timeZone:'Africa/Kampala',
    location:location.slice(0,120),
    participantCount:desiredParticipants(query),
    category,
    visibility:null,
    joinPolicy:null,
    linkedEvent:linkedEvent?{reference:linkedEvent.reference,title:linkedEvent.title,visibility:linkedEvent.visibility}:null,
  };
}
