import {useEffect,useState} from 'react';
import {cloudRequest,type CloudEntity,type CloudRecord} from './cloudClient';
import {ObjectComposer} from './ObjectActivity';
import {ScopedMedia} from './ObjectLayout';
import {Modal} from './UsabilityUI';

export default function PublishLore({record,onClose}:{record:CloudRecord;onClose:()=>void}){
 const [channels,setChannels]=useState<CloudEntity[]>([]),[channel,setChannel]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[published,setPublished]=useState(false);
 useEffect(()=>{
  let active=true;
  cloudRequest<CloudEntity[]>('entities.list',{}).then(rows=>{
   if(active)setChannels(rows.filter(row=>row.kind==='channel'&&row.owner_id===record.owner_id&&row.status==='published'));
  }).catch(()=>{if(active)setError('Your Channels could not be loaded.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[record.owner_id]);
 const destination=channels.find(item=>item.id===channel);
 const media=typeof record.content.mediaId==='string'?record.content.mediaId:'';
 const copy=[String(record.content.title||''),String(record.content.text||'')].filter(Boolean).join('\n\n');
 return <Modal label="Publish to Channel" onClose={onClose}><section className="oc-moment-actions">
  <h3>Publish to Channel</h3>
  {published?<><p role="status">Published to {destination?.title}.</p><button className="zs-primary" onClick={onClose}>Done</button></>:<>
   <label>Channel<select value={channel} disabled={loading} onChange={e=>setChannel(e.target.value)}><option value="">Choose your Channel</option>{channels.map(item=><option key={item.id} value={item.id}>{item.title} · {item.visibility}</option>)}</select></label>
   {loading&&<p role="status">Loading your Channels…</p>}
   {!loading&&!error&&!channels.length&&<p>Create a Channel in Rizz to publish here.</p>}
   {error&&<p role="alert">{error}</p>}
   {destination&&<><p>{destination.visibility==='public'?'This post will be visible in your public Channel.':'This post will follow your private Channel’s visibility.'}</p>
    {media&&<ScopedMedia id={media} scope="private" mime={String(record.content.mime||'')} preview className="oc-post-media"/>}
    <ObjectComposer key={channel} entityId={channel} initialText={copy} initialMediaId={media} onCancel={onClose} onSaved={()=>setPublished(true)}/>
   </>}
  </>}
 </section></Modal>;
}
