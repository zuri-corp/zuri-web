import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';
import type {Activity} from './ObjectActivity';

export function zuriGreeting(name='',now=new Date()){
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Kampala',hour:'numeric',hourCycle:'h23'}).format(now));
 const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
 const first=name.trim().split(/\s+/)[0];
 return first?`${greeting}, ${first}.`:`${greeting}.`;
}

export function AuraBrief({onOpen,format='updates',hideHeading=false}:{hideHeading?:boolean;onOpen:(kind:string,id:string)=>void;format?:'updates'|'report'}){
 const [rows,setRows]=useState<Activity[]|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;cloudRequest<Activity[]>('objects.discovery',{world:'aura'}).then(items=>{
  if(active)setRows(items.filter(item=>item.kind!=='chat'&&item.entity_id&&['space','society'].includes(item.context_kind||'')).slice(0,8));
 }).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 const echoes=rows?.filter(row=>row.context_kind==='space')||[],topics=rows?.filter(row=>row.context_kind==='society')||[];
 if(!rows)return <small role="status">{error?'Sign in to see your Aura updates.':'Checking Aura for updates…'}</small>;
 if(!rows.length)return <small>No recent Space Echoes or Society topics to share.</small>;
 return <section className="oc-aura-brief" aria-label="Aura briefing">{!hideHeading&&<strong>{format==='report'?'Aura activity report':'Around Aura'}</strong>}<small>{echoes.length} Space {echoes.length===1?'Echo':'Echoes'} · {topics.length} Society {topics.length===1?'topic':'topics'} in this briefing</small>
  {rows.slice(0,format==='report'?8:3).map(row=><button key={row.id} className="vw-choice" onClick={()=>onOpen(row.context_kind!,row.entity_id!)}><strong>{row.context_title||'Aura'}</strong><span>{(row.title||row.body||'Shared media').replace(/\s+/g,' ').slice(0,130)}</span></button>)}
 </section>;
}

export function RizzDraft({initial,onSaved}:{initial:string;onSaved:()=>void}){
 const [text,setText]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[id]=useState(()=>crypto.randomUUID());
 return <form className="vw-compact" onSubmit={async e=>{e.preventDefault();if(busy||!text.trim())return;setBusy(true);setError('');try{await cloudRequest('records.put',{id,kind:'draft',revision:0,content:{title:text.trim().slice(0,100),text:text.trim()}});onSaved();}catch(e){setError(e instanceof Error?e.message:'Could not save this draft.');}finally{setBusy(false);}}}><strong>Rizz post draft</strong><label>What do you want to share?<textarea value={text} required rows={3} maxLength={4000} onChange={e=>setText(e.target.value)}/></label><button className="vw-primary" disabled={busy}>Save draft and open Rizz</button>{error&&<small role="alert">{error}</small>}</form>;
}
