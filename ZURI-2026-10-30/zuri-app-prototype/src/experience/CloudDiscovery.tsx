import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';
import {ActivityCard,type Activity} from './ObjectActivity';
import {WorldLoader} from './UsabilityUI';
import {SectionEmpty} from './ObjectLayout';
export default function CloudDiscovery({world,onOpen}:{world:string;onOpen:(kind:string,id:string)=>void}){
 const [rows,setRows]=useState<Activity[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0),[more,setMore]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);cloudRequest<Activity[]>('objects.discovery',{world}).then(value=>{if(active){setRows(value);setMore(value.length===40);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[world,version]);
 return <section className="oc-discovery">{loading&&<WorldLoader world={world} label="Finding the latest…"/>}{error&&<p role="alert">{error}</p>}{rows.map(post=><ActivityCard key={post.id} post={post} contextFirst={world==='aura'} onContext={()=>onOpen(post.context_kind!,post.entity_id!)}/>)}{!loading&&!error&&!rows.length&&<SectionEmpty title={world==='aura'?'Life in your Spaces and Societies starts with a shared moment.':'Updates from your communities will find a home here.'}/>}{more&&<button className="zs-text-button" disabled={busy} onClick={()=>{const last=rows.at(-1);if(!last||busy)return;setBusy(true);cloudRequest<Activity[]>('objects.discovery',{world,before_at:last.created_at,before_id:last.id}).then(value=>{setRows(previous=>[...previous,...value.filter(row=>!previous.some(p=>p.id===row.id))]);setMore(value.length===40);}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Older posts ↓</button>}<button className="zs-text-button" onClick={()=>{setError('');setVersion(v=>v+1);}}>Refresh feed</button></section>;
}
