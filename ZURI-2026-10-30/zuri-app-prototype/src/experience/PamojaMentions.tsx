import {useEffect,useState} from 'react';
import {cloudRequest,discoverCloud,type CloudEntity,type CloudRecord} from './cloudClient';

type Mention={id:string;kind:string;title:string;about:string;visibility:string};
export default function PamojaMentions({onChoose}:{onChoose:(mention:Mention)=>void}){
 const [rows,setRows]=useState<Mention[]>([]),[query,setQuery]=useState(''),[kind,setKind]=useState('all');
 const [related,setRelated]=useState<Mention[]>([]);
 const [people,setPeople]=useState<Mention[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const reads=[
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
  <label>Find a person, place or object<input autoFocus type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, topic or skill"/></label>
  <label>Type<select value={kind} onChange={e=>setKind(e.target.value)}>
   <option value="all">All Pamoja</option>{['space','society','channel','event','ping','chapter','moment','task','person','business','offering','collection'].map(type=><option key={type} value={type}>{type[0].toUpperCase()+type.slice(1)}</option>)}
  </select></label>
  {loading&&<small role="status">Loading your context…</small>}
  {matches.map(item=><button key={item.kind+':'+item.id} type="button" onClick={()=>onChoose(item)}><strong>{item.title}</strong><small>{item.kind} · {item.visibility}</small></button>)}
  {!loading&&!matches.length&&<small>No matching objects.</small>}
  {error&&<small role="status">{error}</small>}
 </div>;
}
