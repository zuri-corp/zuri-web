import {getMotionEvents} from '../lib/motion-events';
import {useEffect,useState} from 'react';
import {cloudRequest,discoverCloud,type CloudEntity,type CloudRecord} from './cloudClient';
import {AppGlyph} from './AppGlyph';

type Mention={id:string;kind:string;title:string;about:string;visibility:string;imported?:boolean};
export default function PamojaMentions({onChoose}:{onChoose:(mention:Mention)=>void}){
 const [rows,setRows]=useState<Mention[]>([]),[query,setQuery]=useState(''),[kind,setKind]=useState('all');
 const [related,setRelated]=useState<Mention[]>([]);
 const [people,setPeople]=useState<Mention[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const reads=[
   getMotionEvents().then(items=>items.map(item=>({id:item.id,kind:'event',title:item.title,about:[item.next_occurrence_at,item.location?.venue,item.description?.slice(0,220)].filter(Boolean).join(' · '),visibility:'public',imported:true}))),
   cloudRequest<CloudEntity[]>('entities.contexts').then(items=>items.map(item=>({id:item.id,kind:item.kind,title:item.title,about:item.description,visibility:item.visibility}))),
   ...['chapter','moment','task'].map(kind=>cloudRequest<CloudRecord[]>('records.list',{kind}).then(items=>items.map(item=>({id:item.id,kind,title:String(item.content.title||item.content.text||'Untitled').slice(0,120),about:String(item.content.text||'').slice(0,400),visibility:'private'}))))
  ];
  Promise.allSettled(reads).then(results=>{
   if(!active)return;
   setRows(results.flatMap(result=>result.status==='fulfilled'?result.value:[]));
   if(results.some(result=>result.status==='rejected'))setError('Some objects could not be loaded.');
   setLoading(false);
  });
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  setPeople([]);
  if(query.trim().length<2)return;
  const controller=new AbortController();
  const timer=window.setTimeout(()=>void discoverCloud(query.trim(),controller.signal).then(items=>{
   if(!controller.signal.aborted)setPeople(items.map(item=>({id:item.id,kind:item.kind,title:item.name,about:item.description||'',visibility:'public'})));
  }).catch(()=>{}),400);
  return()=>{window.clearTimeout(timer);controller.abort();};
 },[query]);
 useEffect(()=>{
  setRelated([]);
  if(kind!=='offering'&&kind!=='collection')return;
  let active=true;
  const parents=rows.filter(item=>item.kind===(kind==='offering'?'space':'channel')).slice(0,10);
  Promise.allSettled(parents.map(parent=>cloudRequest<{id:string;title?:string;name?:string;description?:string}[]>(kind==='offering'?'objects.offerings':'collections.list',{id:parent.id}).then(items=>items.map(item=>({
   id:item.id,kind,title:String(item.title||item.name||'Untitled'),
   about:parent.title+(item.description?' · '+String(item.description).slice(0,250):''),visibility:parent.visibility
  }))))).then(results=>{if(active)setRelated(results.flatMap(result=>result.status==='fulfilled'?result.value:[]));});
  return()=>{active=false;};
 },[kind,rows]);
 const matches=[...new Map([...rows,...people,...related].map(item=>[item.kind+':'+item.id,item])).values()]
  .filter(item=>(kind==='all'||kind===item.kind)&&(item.title+' '+item.about).toLowerCase().includes(query.trim().toLowerCase())).slice(0,30);
 return <div className="vw-context-menu" aria-label="Pamoja context">
  <div className="vw-mention-search"><AppGlyph name="lounge" size={18}/><input autoFocus type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a person, place, plan or moment"/></div>
  <div className="vw-mention-kinds">{['all','space','society','channel','event','ping','chapter','moment','task','person','offering','collection'].map(type=><button type="button" key={type} aria-pressed={kind===type} onClick={()=>setKind(type)}>{type==='all'?'All':<><AppGlyph name={type==='person'?'Profile':type==='task'?'Planner':type==='moment'?'Moments':type==='chapter'?'Chapters':type==='space'||type==='society'||type==='offering'?'aura':type==='channel'||type==='collection'?'rizz':'motion'} size={14}/>{type}</>}</button>)}</div>
  {loading&&<small role="status">Loading your context…</small>}
  {matches.map(item=><button key={item.kind+':'+item.id} type="button" onClick={()=>onChoose(item)}><strong>{item.title}</strong><small>{item.kind} · {item.visibility}</small></button>)}
  {!loading&&!matches.length&&<small>No matching objects.</small>}
  {error&&<small role="status">{error}</small>}
 </div>;
}
