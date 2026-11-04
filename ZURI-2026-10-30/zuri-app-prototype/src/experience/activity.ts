import {freshSocietyTopics} from './freshSocieties';
import {enquiryContext} from './spaceExperience';
import {getSpaces,getSocieties,publicSocieties,visiblePost,pj} from './pamojaModel';
import {pamojaRoutes} from './pamojaRoutes';
import {pings,events,spaces,societies,societyTopics,trips,content,userMap} from '../data/catalog';
import {today,type AppPing,type Channel,type CommunityTopic,type ContextTag,type LocalData,type Route} from './model';
export const allPings=(d:LocalData):AppPing[]=>[...(d.customPings||[]),...pings];
export const allTopics=(d:LocalData):CommunityTopic[]=>[...(d.customTopics||[]),...freshSocietyTopics,...societyTopics];
export const allChannels=(d:LocalData):Channel[]=>d.customChannels||[];
export function contextOptions(d:LocalData,kind:ContextTag['kind'],query:string){
 const spaces=getSpaces(d),societies=publicSocieties(d);if(!query.trim())return [];
 const items=kind==='space'?spaces.map(x=>({id:x.id,name:x.name,detail:x.location,image:x.image})):kind==='society'?societies.map(x=>({id:x.id,name:x.name,detail:`${x.memberCount} members`,image:x.image})):kind==='event'?events.map(x=>({id:x.id,name:x.name,detail:x.date,image:x.image})):kind==='chapter'?d.chapters.map(c=>({id:c.id,name:c.title,detail:'Your chapter',image:d.posts.find(p=>c.momentIds.includes(p.id))?.image})):allPings(d).map(x=>({id:x.id,name:x.title,detail:x.timestamp,image:x.image}));
 return items.filter(x=>(x.name+' '+x.detail).toLowerCase().includes(query.trim().toLowerCase())).slice(0,8);
}
export function tagLabel(d:LocalData,t:ContextTag){const spaces=getSpaces(d),societies=getSocieties(d);return (t.kind==='space'?spaces.find(x=>x.id===t.id)?.name:t.kind==='society'?societies.find(x=>x.id===t.id)?.name:t.kind==='event'?events.find(x=>x.id===t.id)?.name:t.kind==='chapter'?d.chapters.find(c=>c.id===t.id)?.title:allPings(d).find(x=>x.id===t.id)?.title)||'Unavailable context';}
export function pingTime(p:AppPing){return /^\d{4}-\d{2}-\d{2}T/.test(p.timestamp)?new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Kampala',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(p.timestamp)):p.timestamp;}
export function joinPing(d:LocalData,id:string):LocalData{
 const ping=allPings(d).find(x=>x.id===id);if(!ping)throw new Error('This Ping is unavailable.');
 if((d.pingJoins||[]).includes(id)||ping.participantIds.includes('me'))return d;
 if(ping.capacity&&ping.participantIds.length>=ping.capacity)throw new Error('This Ping has no places left.');
 return {...d,pingJoins:[...(d.pingJoins||[]),id]};
}
export function hasJoinedPing(d:LocalData,id:string){return !!allPings(d).find(x=>x.id===id)?.participantIds.includes('me')||!!d.pingJoins?.includes(id);}
export function pingPeople(d:LocalData,id:string){const ids=allPings(d).find(x=>x.id===id)?.participantIds||[];return [...new Set([...ids,...(d.pingJoins?.includes(id)?['me']:[])])];}
export function recordAttendance(d:LocalData,id:string,ticket:string):LocalData{
 const event=events.find(x=>x.id===id);if(!event||!event.tickets.some(x=>x.type===ticket))throw new Error('Choose a valid event ticket.');
 return d.attendance?.includes(id)?d:{...d,attendance:[...(d.attendance||[]),id],plan:[...new Set([...d.plan,id])]};
}
export function canSeeTravel(d:LocalData,context:string){const[kind,...rest]=context.split(':');const id=rest.join(':');return kind==='ping'?hasJoinedPing(d,id):kind==='event'?!!d.attendance?.includes(id):false;}
export function travelFor(d:LocalData,context:string){if(!canSeeTravel(d,context))return [];const[kind,id]=context.split(':');const eventId=kind==='event'?id:allPings(d).find(x=>x.id===id)?.eventId;return trips.filter(t=>t.eventId===eventId);}
export function chapterTask(d:LocalData,chapterId:string,text:string):LocalData{
 if(!text.trim()||!d.chapters.some(c=>c.id===chapterId))throw new Error('Choose a chapter and write a task.');
 const id=crypto.randomUUID();return {...d,tasks:[...d.tasks,{id,text:text.trim(),date:today(),done:false,chapterId}],chapters:d.chapters.map(c=>c.id===chapterId?{...c,blocks:[...(c.blocks||[]),{id:crypto.randomUUID(),kind:'task',taskId:id,created:new Date().toISOString()}]}:c)};
}
export function auraMedia(d:LocalData){return [
 ...d.posts.filter(p=>!p.chapterOnly&&visiblePost(d,p.id,'me',p.tags?.filter(t=>t.kind==='society').map(t=>t.id))&&(p.image||p.video)&&(p.tags?.some(t=>t.kind==='space'||t.kind==='society')||p.spaceId)).map(p=>({id:p.id,text:p.text,media:(p.image||p.video)!,type:p.video?'video':'photo',author:'me',created:p.created,tags:p.tags||[{kind:'space' as const,id:p.spaceId!}],sample:false})),
 ...content.filter(p=>visiblePost(d,p.id,p.creatorId,p.taggedSocietyIds)&&!!p.media&&(p.taggedSpaceIds.length||p.taggedSocietyIds.length)).map(p=>({id:p.id,text:p.caption,media:p.media!,type:p.mediaType,author:p.creatorId,created:p.createdAt,tags:[...p.taggedSpaceIds.map(id=>({kind:'space' as const,id})),...p.taggedSocietyIds.map(id=>({kind:'society' as const,id}))],sample:true})),
 ];}
export function contextHeader(d:LocalData,r:Route){
 if(r.kind==='opportunities')return {title:'Opportunities',parent:'Motion · ZURI CORE'};
 if(r.kind==='intent')return {title:'Your goal',parent:'Lounge / Intent planner'};
 if(r.kind==='object-actions'&&r.id?.startsWith('chat:'))return {title:'Chat options',parent:userMap[r.id.slice(5)]?.name||'Conversation'};
 const spaces=getSpaces(d),societies=getSocieties(d);if(r.kind&&r.kind in pamojaRoutes){const group=r.kind==='enquiry'?enquiryContext(d,r.id||'')?.space.name:r.kind.startsWith('society-')?societies.find(s=>s.id===r.id)?.name:r.kind.startsWith('chapter-')?d.chapters.find(c=>c.id===r.id)?.title:r.kind==='ping-schedule'?allPings(d).find(p=>p.id===r.id)?.title:['trip-room','trip-chat','host-wall'].includes(r.kind)?(()=>{const t=pj(d).trips.find(t=>t.id===r.id);return t?t.from+' → '+t.to:undefined})():spaces.find(s=>s.id===r.id)?.name;return {title:pamojaRoutes[r.kind as keyof typeof pamojaRoutes][2],parent:group||(r.world==='lounge'?'ZURI':r.world)};}
 if(r.kind==='topic'){const t=allTopics(d).find(x=>x.id===r.id);return {title:t?.title||'Conversation',parent:societies.find(x=>x.id===t?.societyId)?.name||'Society'};}
 if(r.kind==='ping-chat'){const p=allPings(d).find(x=>x.id===r.id);return {title:'Conversation',parent:p?.title||'Ping'};}
 const title=r.kind==='chat'||r.kind==='person'?userMap[r.id||'']?.name:r.kind==='space'?spaces.find(x=>x.id===r.id)?.name:r.kind==='society'?societies.find(x=>x.id===r.id)?.name:r.kind==='ping'?allPings(d).find(x=>x.id===r.id)?.title:r.kind==='event'||r.kind==='attend'?events.find(x=>x.id===r.id)?.name:r.kind==='chapter'?d.chapters.find(x=>x.id===r.id)?.title:r.kind==='channel'||r.kind==='manage-channel'?allChannels(d).find(x=>x.id===r.id)?.name:undefined;
 return {title:title||({'new-moment':'Add moment','new-topic':'New conversation','new-ping':'New Ping','new-channel':'New channel',travel:'Getting there',moment:'Moment'}[r.kind||''] as string|undefined)||r.kind?.replace(/-/g,' ')||'',parent:r.kind==='attend'?'Attend':r.kind==='chat'?'Conversation':r.world};
}

/** Catalog labels without a calendar date remain sample plans, never invented dates. */
export function pingGroup(p:AppPing,now=Date.now()){
 if(p.isRecurring)return 'Recurring';
 const time=/^\d{4}-\d{2}-\d{2}T/.test(p.timestamp)?Date.parse(p.timestamp):NaN;
 return Number.isFinite(time)?(time<now?'Past':'Upcoming'):'Sample plans';
}
export function orderedPings(d:LocalData,now=Date.now()){
 const rank={'Upcoming':0,'Recurring':1,'Sample plans':2,'Past':3};
 return allPings(d).slice().sort((a,b)=>rank[pingGroup(a,now)]-rank[pingGroup(b,now)]||(pingGroup(a,now)==='Past'?Date.parse(b.timestamp)-Date.parse(a.timestamp):pingGroup(a,now)==='Upcoming'?Date.parse(a.timestamp)-Date.parse(b.timestamp):0));
}
export function updateTime(value:string){
 const relative=value.match(/^(\d+)\s*([mhd])\s+ago$/i);
 if(relative)return -Number(relative[1])*({m:60,h:3600,d:86400}[relative[2].toLowerCase()]||0);
 const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed/1000-Date.now()/1000:-Infinity;
}
export function latestUpdates<T extends {created:string}>(posts:T[]){return posts.slice().sort((a,b)=>updateTime(b.created)-updateTime(a.created));}

export function feedSocietyTopics(d:LocalData,query=''){
 const societies=getSocieties(d),q=query.trim().toLowerCase();
 return allTopics(d).filter(t=>t.mode!=='chat'&&societies.some(s=>s.id===t.societyId&&s.privacy==='public')&&visiblePost(d,t.id,t.creatorId,[t.societyId])&&(t.title+' '+(t.messages[0]?.text||'')+' '+societies.find(s=>s.id===t.societyId)?.name).toLowerCase().includes(q)).sort((a,b)=>Number(b.isPinned)-Number(a.isPinned)||Number(b.id.startsWith('fresh-'))-Number(a.id.startsWith('fresh-'))||b.messages.length-a.messages.length).slice(0,3);
}
