import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';
import {ScopedMedia} from './ObjectLayout';

type PendingPost={id:string;title:string;body:string;author_name:string;media_id:string|null;media_mime?:string};
export default function SpaceReviewPanel({id}:{id:string}){
 const [rows,setRows]=useState<PendingPost[]|null>(null),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;cloudRequest<PendingPost[]>('spaces.media.review.list',{id}).then(value=>{if(active)setRows(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
 async function decide(post_id:string,decision:'approved'|'declined'){
  if(busy)return;setBusy(post_id);setError('');setMessage('');
  try{await cloudRequest('spaces.media.review.decide',{id,post_id,decision});setRows(current=>current?.filter(row=>row.id!==post_id)||[]);setMessage(decision==='approved'?'Added to Space Media.':'Tag declined.');}
  catch(e){setError(e instanceof Error?e.message:'Could not review the post.');}finally{setBusy('');}
 }
 return <section className="oc-space-review"><h3>Tagged posts</h3><p>Approve a post to add it to this Space’s Media.</p>
  {!rows&&!error&&<p role="status">Loading tagged posts…</p>}{rows?.length===0&&<p>No tags waiting for review.</p>}
  {rows?.map(row=><article key={row.id} className="oc-review-row"><small>{row.author_name}</small>{row.title&&<strong>{row.title}</strong>}<p>{row.body}</p>{row.media_id&&<ScopedMedia id={row.id} mime={row.media_mime} scope="activity" preview/>}<div><button type="button" className="zs-primary" disabled={!!busy} onClick={()=>void decide(row.id,'approved')}>Approve for Media</button><button type="button" className="zs-text-button" disabled={!!busy} onClick={()=>void decide(row.id,'declined')}>Decline</button></div></article>)}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
