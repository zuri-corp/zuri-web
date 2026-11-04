import type {LocalData,Route,World} from './model';
export type NoticeCategory='reminders'|'activity'|'messages'|'communities'|'updates'|'security';
export type NoticeItem={id:string;world:World;category:NoticeCategory;title:string;body:string;created:string;route:Route;attention?:boolean};
export type NoticeControl={read?:boolean;archived?:boolean;snoozedUntil?:string};
export type NotificationState={items:NoticeItem[];controls:Record<string,NoticeControl>;preferences:{muted:NoticeCategory[];quiet:boolean;start:string;end:string;previews:boolean}};
export const categories:NoticeCategory[]=['reminders','activity','messages','communities','updates','security'];
export const notificationDefaults=():NotificationState=>({items:[],controls:{},preferences:{muted:[],quiet:false,start:'22:00',end:'07:00',previews:false}});
export function validateNotifications(value:unknown):NotificationState{
 if(value===undefined)return notificationDefaults();const v=value as NotificationState;
 const date=(s:unknown)=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 if(!v||!Array.isArray(v.items)||v.items.length>1000||!v.items.every(n=>n&&typeof n.id==='string'&&n.id.length<300&&['lounge','aura','motion','rizz','lore'].includes(n.world)&&categories.includes(n.category)&&typeof n.title==='string'&&n.title.length<=300&&typeof n.body==='string'&&n.body.length<=1000&&date(n.created)&&n.route&&['lounge','aura','motion','rizz','lore'].includes(n.route.world)&&typeof n.route.tab==='string'&&[n.route.kind,n.route.id].every(x=>x===undefined||typeof x==='string')&&(n.attention===undefined||typeof n.attention==='boolean')))throw Error('Saved notifications are invalid.');
 if(!v.controls||typeof v.controls!=='object'||Array.isArray(v.controls)||Object.keys(v.controls).length>5000||!Object.values(v.controls).every(c=>c&&typeof c==='object'&&[c.read,c.archived].every(x=>x===undefined||typeof x==='boolean')&&(c.snoozedUntil===undefined||date(c.snoozedUntil))))throw Error('Saved notification controls are invalid.');
 const p=v.preferences;if(!p||!Array.isArray(p.muted)||!p.muted.every(c=>categories.includes(c))||typeof p.quiet!=='boolean'||typeof p.previews!=='boolean'||![p.start,p.end].every(t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('Saved notification preferences are invalid.');return v;
}
export function captureNotifications(before:LocalData,after:LocalData,now=new Date().toISOString()):LocalData{
 const state=after.notifications||notificationDefaults(),items:NoticeItem[]=[];
 for(const task of after.tasks)if(!before.tasks.some(t=>t.id===task.id))items.push({id:'task:'+task.id,world:'motion',category:'activity',title:'A next step, in place',body:task.text,created:now,route:{world:'motion',tab:'Planner'}});
 for(const chapter of after.chapters)if(!before.chapters.some(c=>c.id===chapter.id))items.push({id:'chapter:'+chapter.id,world:'lore',category:'activity',title:'Your chapter is ready',body:chapter.title,created:now,route:{world:'lore',tab:'Chapters',kind:'chapter',id:chapter.id}});
 for(const id of after.pingJoins||[])if(!before.pingJoins?.includes(id))items.push({id:'joined:'+id,world:'motion',category:'activity',title:'You joined a Ping on this device',body:'Open the Ping for its location, people and conversation.',created:now,route:{world:'motion',tab:'Pings',kind:'ping',id}});
 if(!items.length)return after;return {...after,notifications:{...state,items:[...items.filter(n=>!state.items.some(x=>x.id===n.id)),...state.items].slice(0,1000)}};
}
export function notificationItems(data:LocalData,now=new Date()):NoticeItem[]{
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const reminders=data.tasks.filter(t=>!t.done&&t.dueDate&&t.dueDate<=day).map(t=>({id:'due:'+t.id+':'+t.dueDate,world:'motion' as World,category:'reminders' as NoticeCategory,title:t.dueDate===day?'A little focus for today':'A task to revisit',body:t.text,created:t.dueDate+'T00:00:00+03:00',attention:true,route:{world:'motion' as World,tab:'Planner'}}));
 return [...reminders,...(data.notifications?.items||[])].sort((a,b)=>Date.parse(b.created)-Date.parse(a.created));
}
export function activeNotices(data:LocalData,now=new Date()):NoticeItem[]{const s=data.notifications||notificationDefaults();return notificationItems(data,now).filter(n=>!s.controls[n.id]?.archived&&!(Date.parse(s.controls[n.id]?.snoozedUntil||'')>now.getTime())&&!s.preferences.muted.includes(n.category));}
export function unreadNotices(data:LocalData){return activeNotices(data).filter(n=>!(data.notifications?.controls[n.id]?.read)).length;}
export function quietNow(p:NotificationState['preferences'],date=new Date()):boolean{if(!p.quiet)return false;const t=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Kampala',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);if(p.start===p.end)return true;return p.start<p.end?t>=p.start&&t<p.end:t>=p.start||t<p.end;}
