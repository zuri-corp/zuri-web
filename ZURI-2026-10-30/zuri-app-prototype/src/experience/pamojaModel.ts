import {manifests} from '../core/manifest';
import type {Space,Society} from '../data/catalog';
import {spaces,societies,events,users,pings} from '../data/catalog';
import type {LocalData} from './model';
export type OwnedSpace=Space&{ownerId:'me';publication:'draft'|'preview';consent:boolean};
export type OwnedSociety=Society&{ownerId:'me';joinMode:'open'|'approval'|'invite'};
export type LocalTrip={id:string;context:string;mode:'share'|'hosted'|'split';from:string;to:string;when:string;capacity:number;people:string[];status:'open'|'cancelled'|'completed';note:string};
export type PamojaData={
 spaces:OwnedSpace[];societies:OwnedSociety[];trips:LocalTrip[];tripJoins:string[];
 offers:{image?:string;unit?:string;options?:string[];id:string;spaceId:string;name:string;description:string;price:number;type:'product'|'appointment'|'rental'|'subscription'|'pass';paused:boolean}[];
 orders:{id:string;offerId:string;spaceId:string;name:string;quantity:number;unitPrice:number;option:string;status:'draft'|'cancelled';created:string}[];
 echo:{spaceId:string;categories:string[]}[];updates:{id:string;spaceId:string;text:string;category:string;created:string}[];
 grants:{id:string;spaceId:string;toolId:string;scopes:string[]}[];
 reports:{id:string;target:string;reason:string;detail:string;created:string;appeal?:string}[];
 evidence:{id:string;chapterId:string;title:string;type:string;url:string;created:string}[];
 applications:{id:string;tier:string;statement:string;created:string}[];
 collaborators:{id:string;chapterId:string;personId:string;note:string}[];
 blocked:string[];muted:string[];hidden:string[];interests:string[];
 preferences:{rememberDrafts?:boolean;mode?:'day'|'night';discoverable:boolean;messages:'everyone'|'following'|'nobody';location:'off'|'city';wallpaper:'graphite'|'dusk'|'forest';wallpaperLocked:boolean;assistantContext:boolean};
 notes:{id:string;text:string}[];
};
export const emptyPamoja=():PamojaData=>({spaces:[],societies:[],trips:[],tripJoins:[],offers:[],orders:[],echo:[],updates:[],grants:[],reports:[],evidence:[],applications:[],collaborators:[],blocked:[],muted:[],hidden:[],interests:[],notes:[],preferences:{discoverable:false,messages:'following',location:'off',wallpaper:'graphite',wallpaperLocked:true,assistantContext:false}});
const schemas:Record<string,string[]>={spaces:['id','name','image','category','description','location','ownerId','publication'],societies:['id','name','description','image','privacy','ownerId','joinMode'],trips:['id','context','mode','from','to','when','status','note'],offers:['id','spaceId','name','description','type'],orders:['id','offerId','spaceId','name','option','status','created'],echo:['spaceId'],updates:['id','spaceId','text','category','created'],grants:['id','spaceId','toolId'],reports:['id','target','reason','detail','created'],evidence:['id','chapterId','title','type','url','created'],applications:['id','tier','statement','created'],collaborators:['id','chapterId','personId','note'],notes:['id','text']};
export function validatePamoja(raw:unknown):PamojaData{
 if(raw===undefined)return emptyPamoja();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid Pamoja workspace.');const v=raw as Record<string,any>,base=emptyPamoja();
 for(const[k,fields]of Object.entries(schemas)){if(!Array.isArray(v[k])||!v[k].every((x:any)=>x&&fields.every(f=>typeof x[f]==='string')))throw new Error('Invalid '+k+' records.');if(k!=='echo'&&new Set(v[k].map((x:any)=>x.id)).size!==v[k].length)throw new Error('Duplicate '+k+' records.');}
 const strings=(x:any)=>Array.isArray(x)&&x.every((s:any)=>typeof s==='string');
 for(const k of ['blocked','muted','hidden','interests','tripJoins'])if(!strings(v[k]))throw new Error('Invalid preferences.');
 if(v.evidence.some((e:any)=>e.url&&!/^https:\/\//.test(e.url)))throw new Error('Invalid evidence link.');
 if(v.spaces.some((s:any)=>spaces.some(x=>x.id===s.id))||v.societies.some((s:any)=>societies.some(x=>x.id===s.id)))throw new Error('A local record cannot replace a catalog identity.');
 if(!v.grants.every((g:any)=>Array.isArray(g.scopes)&&(tools.some(t=>t.id===g.toolId&&g.scopes.every((scope:string)=>t.scopes.includes(scope)))||manifests.some(t=>t.id===g.toolId&&g.scopes.every((scope:any)=>t.capabilities.includes(scope))))))throw new Error('Invalid tool scope.');
 if(!v.spaces.every((s:any)=>s.ownerId==='me'&&['draft','preview'].includes(s.publication)&&typeof s.consent==='boolean'&&(s.publication!=='preview'||s.consent)&&Number.isFinite(s.followers)))throw new Error('Invalid Space consent.');
 if(!v.societies.every((s:any)=>s.ownerId==='me'&&['public','private'].includes(s.privacy)&&['open','approval','invite'].includes(s.joinMode)&&['spaceIds','eventIds','projectIds','pingIds'].every(k=>strings(s[k]))))throw new Error('Invalid Society.');
 if(!v.trips.every((t:any)=>['share','hosted','split'].includes(t.mode)&&['open','cancelled','completed'].includes(t.status)&&Number.isInteger(t.capacity)&&t.capacity>0&&strings(t.people)))throw new Error('Invalid trip.');
 if(!v.offers.every((o:any)=>Number.isSafeInteger(o.price)&&o.price>=0&&['product','appointment','rental','subscription','pass'].includes(o.type)&&typeof o.paused==='boolean')||!v.orders.every((o:any)=>Number.isSafeInteger(o.unitPrice)&&o.unitPrice>=0&&Number.isSafeInteger(o.quantity)&&o.quantity>0&&o.quantity<=20&&['draft','cancelled'].includes(o.status)))throw new Error('Invalid commerce records.');
 if(!v.echo.every((e:any)=>strings(e.categories))||!v.grants.every((g:any)=>strings(g.scopes)))throw new Error('Invalid permission grants.');
 if(v.reports.some((r:any)=>r.appeal!==undefined&&typeof r.appeal!=='string'))throw new Error('Invalid appeal.');
 const p=v.preferences;if(p?.rememberDrafts!==undefined&&typeof p.rememberDrafts!=='boolean')throw Error('Invalid draft privacy setting.');if(p?.mode!==undefined&&!['day','night'].includes(p.mode))throw new Error('Invalid appearance mode.');if(!p||!['everyone','following','nobody'].includes(p.messages)||!['off','city'].includes(p.location)||!['graphite','dusk','forest'].includes(p.wallpaper)||!['discoverable','wallpaperLocked','assistantContext'].every(k=>typeof p[k]==='boolean'))throw new Error('Invalid privacy settings.');
 return {...base,...v} as PamojaData;
}
export const pj=(d:LocalData)=>d.pamoja||emptyPamoja();
export const getSpaces=(d:LocalData)=>[...pj(d).spaces,...spaces];
export const getSocieties=(d:LocalData)=>[...pj(d).societies,...societies];
export const publicSocieties=(d:LocalData)=>getSocieties(d).filter(s=>s.privacy==='public'||'ownerId'in s&&s.ownerId==='me');
export const visiblePerson=(d:LocalData,id:string)=>!pj(d).blocked.includes(id)&&!pj(d).muted.includes(id);
export function visiblePost(d:LocalData,id:string,author:string,societyIds:string[]=[]){return !pj(d).hidden.includes(id)&&visiblePerson(d,author)&&societyIds.every(id=>publicSocieties(d).some(s=>s.id===id));}
export function ownsSpace(d:LocalData,id:string){return pj(d).spaces.some(s=>s.id===id&&s.ownerId==='me');}
export function changePamoja(d:LocalData,fn:(p:PamojaData)=>PamojaData):LocalData{return {...d,pamoja:validatePamoja(fn(pj(d)))};}
export function joinLocalTrip(d:LocalData,id:string):LocalData{const p=pj(d),t=p.trips.find(t=>t.id===id);if(!t||t.status!=='open')throw new Error('This trip is not open.');const[kind,ref]=t.context.split(':');const eligible=kind==='event'?d.attendance?.includes(ref):d.pingJoins?.includes(ref)||d.customPings?.some(p=>p.id===ref&&p.participantIds.includes('me'));if(!eligible)throw new Error('Join the linked plan first.');if(t.people.includes('me')||p.tripJoins.includes(id))return d;if(t.people.length>=t.capacity)throw new Error('This trip is full.');return changePamoja(d,p=>({...p,tripJoins:[...p.tripJoins,id]}));}
export function draftOrder(d:LocalData,offer:{id:string;spaceId:string;name:string;price:number},quantity:number,option:string):LocalData{if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20||!Number.isSafeInteger(offer.price)||offer.price<0||!Number.isSafeInteger(offer.price*quantity))throw new Error('Choose a valid quantity.');return changePamoja(d,p=>({...p,orders:[{id:crypto.randomUUID(),offerId:offer.id,spaceId:offer.spaceId,name:offer.name,quantity,unitPrice:offer.price,option,status:'draft',created:new Date().toISOString()},...p.orders]}));}
export const tools=[{id:'nextstep',name:'Next step',mark:'↗',description:'Create a connected Planner task.',scopes:['planner.create'],publisher:'ZURI · first-party',version:'1.0'},{id:'packing',name:'Packing list',mark:'✓',description:'A small checklist for your next plan.',scopes:['checklist'],publisher:'ZURI · first-party',version:'1.0'},{id:'notes',name:'Pocket notes',mark:'✎',description:'Keep a thought close to its Space.',scopes:['notes'],publisher:'ZURI · first-party',version:'1.0'},{id:'memory',name:'Pairs',mark:'◈',description:'A quiet, solo memory game. No chat, money or XP.',scopes:[],publisher:'ZURI · first-party',version:'1.0'}];
export function networkResults(d:LocalData,q:string,kind='all'){
 const match=(name:string)=>name.toLowerCase().includes(q.trim().toLowerCase());return [
 ...getSpaces(d).filter(s=>!('publication'in s)||s.publication==='preview').map(s=>({id:s.id,kind:'space',name:s.name,detail:s.location,image:s.image})),
 ...publicSocieties(d).map(s=>({id:s.id,kind:'society',name:s.name,detail:'Society',image:s.image})),
 ...events.map(e=>({id:e.id,kind:'event',name:e.name,detail:e.date,image:e.image})),
 ...[...(d.customPings||[]),...pings].filter(p=>!p.societyId||publicSocieties(d).some(s=>s.id===p.societyId)).map(p=>({id:p.id,kind:'ping',name:p.title,detail:p.isRecurring?p.recurringLabel||p.timestamp:/^\d{4}-\d{2}-\d{2}T/.test(p.timestamp)&&Number.isFinite(Date.parse(p.timestamp))?new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(p.timestamp)):p.timestamp,image:p.image})),
 ...users.filter(u=>u.id!=='me'&&visiblePerson(d,u.id)).map(u=>({id:u.id,kind:'person',name:u.name,detail:u.bio,image:u.avatar})),
 ...d.chapters.map(c=>({id:c.id,kind:'chapter',name:c.title,detail:'Your private chapter',image:undefined})),
 ...tools.map(t=>({id:t.id,kind:'tool',name:t.name,detail:t.description,image:undefined}))
 ].filter(r=>(kind==='all'||kind==='saved'&&d.saved.includes(r.id)||r.kind===kind)&&match(r.name+' '+r.detail));
}
export function weeklyOccurrences(first:string,exceptions:string[]=[],count=4){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(first)||!Number.isFinite(Date.parse(first+'+03:00')))return [];
 const result:string[]=[];for(let week=0;result.length<count&&week<520;week++){const dt=new Date(first+'+03:00');dt.setUTCDate(dt.getUTCDate()+week*7);const day=new Date(dt.getTime()+3*3600000).toISOString().slice(0,10);if(!exceptions.includes(day))result.push(day+'T'+first.slice(11,16));}return result;
}
export function chapterMomentIds(d:LocalData,chapterId:string){return [...new Set([...(d.chapters.find(c=>c.id===chapterId)?.momentIds||[]),...d.posts.filter(p=>(p.image||p.video)&&p.tags?.some(t=>t.kind==='chapter'&&t.id===chapterId)).map(p=>p.id)])];}
export function toggleChapterMoment(d:LocalData,chapterId:string,postId:string):LocalData{
 if(!d.chapters.some(c=>c.id===chapterId)||!d.posts.some(p=>p.id===postId&&(p.image||p.video)))throw new Error('Choose an existing moment and chapter.');const exists=chapterMomentIds(d,chapterId).includes(postId);
 return {...d,chapters:d.chapters.map(c=>c.id===chapterId?{...c,momentIds:exists?c.momentIds.filter(id=>id!==postId):[...new Set([...c.momentIds,postId])]}:c),posts:exists?d.posts.map(p=>p.id===postId?{...p,tags:p.tags?.filter(t=>!(t.kind==='chapter'&&t.id===chapterId))}:p):d.posts};
}
