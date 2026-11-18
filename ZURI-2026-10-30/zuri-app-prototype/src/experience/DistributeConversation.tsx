import EntityEditor from './EntityScreens';
import {useEffect,useRef,useState} from 'react';
import {cloudRequest,type CloudAccountState,type CloudEntity} from './cloudClient';
type Result={id:string;state:'published'|'failed';message?:string};
export default function DistributeConversation({text,onClose}:{text:string;onClose:()=>void}){
 const [creating,setCreating]=useState(false);
 const [channels,setChannels]=useState<CloudEntity[]>([]),[selected,setSelected]=useState<string[]>([]),[body,setBody]=useState(text);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[results,setResults]=useState<Result[]>([]);
 const requests=useRef(new Map<string,{body:string;requestId:string}>()),gate=useRef(false);
 useEffect(()=>{
  let active=true;
  Promise.all([cloudRequest<CloudAccountState>('account.get'),cloudRequest<CloudEntity[]>('entities.list')]).then(([account,rows])=>{
   if(active)setChannels(rows.filter(row=>row.kind==='channel'&&row.owner_id===account.user_id&&row.status==='published'));
  }).catch(()=>{if(active)setError('Sign in to load your Channels.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 async function publish(){
  if(gate.current||!selected.length||!body.trim())return;
  gate.current=true;setBusy(true);setError('');
  try{
   for(const id of selected){
    if(results.some(result=>result.id===id&&result.state==='published'))continue;
    let request=requests.current.get(id);
    if(!request||request.body!==body.trim()){request={body:body.trim(),requestId:crypto.randomUUID()};requests.current.set(id,request);}
    try{
     await cloudRequest('objects.publish',{id,kind:'post',body:request.body,request_id:request.requestId});
     setResults(previous=>[...previous.filter(result=>result.id!==id),{id,state:'published'}]);
    }catch(e){setResults(previous=>[...previous.filter(result=>result.id!==id),{id,state:'failed',message:e instanceof Error?e.message:'Could not confirm publication.'}]);}
   }
  }finally{gate.current=false;setBusy(false);}
 }
 const published=results.some(result=>result.state==='published');
 return <section className="vw-compact" aria-label="Distribute to Channels">
  <strong>Distribute to Channels</strong>
  <label>Your post<textarea rows={4} maxLength={4000} value={body} disabled={busy||published} onChange={e=>setBody(e.target.value)}/></label>
  {channels.map(channel=><label className="cw-check" key={channel.id}><input type="checkbox" checked={selected.includes(channel.id)} disabled={busy||results.some(result=>result.id===channel.id&&result.state==='published')} onChange={e=>setSelected(previous=>e.target.checked?[...previous,channel.id]:previous.filter(id=>id!==channel.id))}/>{channel.title} · {channel.visibility}</label>)}
  {loading&&<small role="status">Loading your Channels…</small>}
  {!loading&&!error&&!creating&&<button type="button" className="vw-text" disabled={busy} onClick={()=>setCreating(true)}>Create a Channel</button>}
  {creating&&<EntityEditor kind="channel" inline initialFields={{visibility:'private'}} onCancel={()=>setCreating(false)} onCreated={row=>{
   setChannels(previous=>[row,...previous]);setSelected(previous=>[...previous,row.id]);setCreating(false);
  }}/>}
  {results.map(result=><p key={result.id} role="status">{channels.find(row=>row.id===result.id)?.title}: {result.state==='published'?'Published':result.message}</p>)}
  {error&&<p role="alert">{error}</p>}
  <div className="vw-card-actions"><button className="vw-primary" disabled={busy||!selected.length||!body.trim()||selected.every(id=>results.some(result=>result.id===id&&result.state==='published'))} onClick={()=>void publish()}>{busy?'Publishing…':'Publish to selected Channels'}</button><button className="vw-text" disabled={busy} onClick={onClose}>Close</button></div>
 </section>;
}
