import {useEffect,useState} from 'react';
import {AppGlyph} from './AppGlyph';

export type CloudNotice={id:string;kind:string;reference_id:string|null;read_at:string|null;created_at:string};
type NoticeView={world:'aura'|'motion'|'rizz'|'lore'|'lounge';label:string;title:string;body:string;action:string};
export function noticeView(n:CloudNotice):NoticeView{
 const type=n.kind;
 if(type==='message')return {world:'rizz',label:'Rizzlr · chat',title:'A conversation has a new message',body:'Open the conversation to reply.',action:'Open chat'};
 if(type==='conversation-invitation')return {world:'rizz',label:'Rizzlr · chat',title:'Someone wants to talk',body:'A private conversation invitation is waiting for you.',action:'View conversation'};
 if(type==='entity-invitation')return {world:'aura',label:'Aura · invitation',title:'You have been invited',body:'An invitation to a ZURI place or community is ready to review.',action:'View invitation'};
 if(type==='space-team-invitation')return {world:'aura',label:'Aura · Space team',title:'You have been added to a Space team',body:'Open the Space to see the role and business controls you have been given.',action:'Open Space'};
 if(type==='space-transfer')return {world:'aura',label:'Aura · Space ownership',title:'A Space ownership transfer needs you',body:'Review the Space and accept ownership only if you recognise the request.',action:'Review transfer'};
 if(type.includes('event'))return {world:'motion',label:'Motion',title:'An event update is waiting',body:'Your plan has new information.',action:'Open event'};
 if(type.includes('ping'))return {world:'motion',label:'Motion',title:'A Ping has an update',body:'Open it for the latest plan and people involved.',action:'Open Ping'};
 if(type.includes('chapter')||type.includes('moment'))return {world:'lore',label:'LORe',title:'Your story has an update',body:'Open your private record to continue it.',action:'Open LORe'};
 return {world:'lounge',label:'ZURI',title:type.replace(/[-_]/g,' '),body:'There is a new update in your ZURI world.',action:'Open update'};
}
function age(value:string){const seconds=Math.max(0,Math.floor((Date.now()-Date.parse(value))/1000));if(seconds<60)return 'now';if(seconds<3600)return Math.floor(seconds/60)+'m';if(seconds<86400)return Math.floor(seconds/3600)+'h';return Math.floor(seconds/86400)+'d';}
export function CloudNotificationToast({notice,onOpen,onDismiss}:{notice:CloudNotice|null;onOpen:(n:CloudNotice)=>void;onDismiss:()=>void}){
 if(!notice)return null;const view=noticeView(notice);
 return <aside className={'zn-toast zn-'+view.world} role="status" aria-live="polite"><span className="zn-toast-mark"><AppGlyph name={view.world} size={23}/></span><div><small>{view.label}</small><strong>{view.title}</strong><p>{view.body}</p><button onClick={()=>onOpen(notice)}>{view.action}</button></div><button className="zn-toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">×</button></aside>;
}
export default function CloudNotificationCenter({items,onOpen,onRead,onReadAll}:{items:CloudNotice[];onOpen:(n:CloudNotice)=>void;onRead:(n:CloudNotice)=>void;onReadAll:()=>void}){
 const [filter,setFilter]=useState<'all'|NoticeView['world']>('all');
 const unread=items.filter(n=>!n.read_at);const rows=items.filter(n=>filter==='all'||noticeView(n).world===filter);
 return <section className="zn-center"><header><span className="zn-bell"><AppGlyph name="bell" size={25}/></span><div><small>YOUR ZURI INBOX</small><h2>What needs you.</h2><p>{unread.length?`${unread.length} unread update${unread.length===1?'':'s'} across your world.`:'You are all caught up.'}</p></div>{unread.length>0&&<button className="zs-text-button" onClick={onReadAll}>Mark all read</button>}</header><nav className="zn-filters" aria-label="Filter notifications"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Everything</button>{(['aura','motion','rizz','lore'] as const).map(world=><button key={world} aria-pressed={filter===world} onClick={()=>setFilter(world)}><AppGlyph name={world} size={17}/>{world}</button>)}</nav><div className="zn-list">{rows.map(n=>{const view=noticeView(n);return <article key={n.id} className={'zn-item zn-'+view.world+(!n.read_at?' zn-unread':'')}><span className="zn-world-mark"><AppGlyph name={view.world} size={24}/></span><button className="zn-open" onClick={()=>onOpen(n)}><small>{view.label}<time>{age(n.created_at)}</time></small><strong>{view.title}</strong><p>{view.body}</p></button><div className="zn-actions"><button onClick={()=>onRead(n)}>{n.read_at?'Mark unread':'Mark read'}</button><button className="zs-text-button" onClick={()=>onOpen(n)}>{view.action}<AppGlyph name="next" size={15}/></button></div></article>;})}</div>{!rows.length&&<div className="zn-empty"><AppGlyph name={filter==='all'?'bell':filter} size={35}/><h3>{filter==='all'?'Nothing pulling at you.':'Nothing in this world yet.'}</h3><p>Messages, invitations, business access and plans will arrive here with their source attached.</p></div>}</section>;
}
