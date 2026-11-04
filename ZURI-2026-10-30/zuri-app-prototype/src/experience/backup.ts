import {pj,validatePamoja} from './pamojaModel';
import { initialData, readData, type LocalData, type Post } from './model';
import { content } from '../data/catalog';

/** Preserve both local workspaces. A backup never deletes a record already on this device. */
export function mergeBackup(current: LocalData, imported: LocalData): LocalData {
  const union = (a:string[],b:string[]) => [...new Set([...a,...b])];
  const records = <T extends {id:string}>(a:T[],b:T[]) => [...a,...b.filter(item=>!a.some(existing=>existing.id===item.id))];
  const a=pj(current),b=pj(imported);const combined={...a};for(const key of Object.keys(a)){if(key==='preferences')continue;const av=(a as any)[key],bv=(b as any)[key];(combined as any)[key]=key==='echo'?[...av,...bv.filter((x:any)=>!av.some((y:any)=>y.spaceId===x.spaceId))]:['blocked','muted','hidden','interests','tripJoins'].includes(key)?union(av,bv):records(av,bv);}
  return readData(JSON.stringify({...current,...(current.pamoja||imported.pamoja?{pamoja:validatePamoja(combined)}:{}),
    saved:union(current.saved,imported.saved),joined:union(current.joined,imported.joined),plan:union(current.plan,imported.plan),liked:union(current.liked,imported.liked),widgets:union(current.widgets,imported.widgets),
    notifications:{...(current.notifications||{controls:{},preferences:{muted:[],quiet:false,start:"22:00",end:"07:00",previews:false}}),items:records(current.notifications?.items||[],imported.notifications?.items||[]).slice(0,1000)},
    intents:records(current.intents||[],imported.intents||[]),posts:records(current.posts,imported.posts),tasks:records(current.tasks,imported.tasks),messages:records(current.messages,imported.messages),chapters:records(current.chapters,imported.chapters),automations:records(current.automations,imported.automations),
    discussions:records(current.discussions||[],imported.discussions||[]),
    customPings:records(current.customPings||[],imported.customPings||[]),customTopics:records(current.customTopics||[],imported.customTopics||[]),customChannels:records(current.customChannels||[],imported.customChannels||[]),pingJoins:union(current.pingJoins||[],imported.pingJoins||[]),attendance:union(current.attendance||[],imported.attendance||[]),
  }));
}

/** Bring authored text/photos and local interests forward without inventing real bookings. */
export function migrateLegacy(raw:string|null): LocalData {
  const next=structuredClone(initialData);
  if(!raw)return next;
  const old=JSON.parse(raw);
  if(old?.version!==1)throw new Error('The earlier app data cannot be recognized.');
  const fixtureIds=new Set(content.map(item=>item.id));
  if(Array.isArray(old.contentItems))next.posts=old.contentItems.filter((p:Record<string,unknown>)=>p&&p.creatorId==='me'&&!fixtureIds.has(String(p.id))&&typeof p.id==='string'&&typeof p.caption==='string').map((p:Record<string,unknown>):Post=>({id:String(p.id),text:String(p.caption),created:typeof p.createdAt==='string'?p.createdAt:new Date().toISOString(),...(p.mediaType==='photo'&&typeof p.media==='string'?{image:p.media}:{}),...(Array.isArray(p.taggedSpaceIds)&&typeof p.taggedSpaceIds[0]==='string'?{spaceId:p.taggedSpaceIds[0]}:{})}));
  next.plan=[...new Set([...(Array.isArray(old.joinedPings)?old.joinedPings:[]),...(Array.isArray(old.purchasedTickets)?old.purchasedTickets:[])].filter((id:unknown):id is string=>typeof id==='string'))];
  if(old.societyMemberships&&typeof old.societyMemberships==='object')next.joined=Object.entries(old.societyMemberships).filter(([,value])=>value==='joined').map(([id])=>id);
  return readData(JSON.stringify(next));
}
