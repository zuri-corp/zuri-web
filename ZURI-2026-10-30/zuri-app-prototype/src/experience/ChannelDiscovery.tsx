import {AppGlyph} from './AppGlyph';
import {useState} from 'react';
import {cloudRequest} from './cloudClient';

type ExperienceMatch={id:string;channel_id:string;channel_title:string;excerpt:string};

export function ChannelExperienceSearch({onOpen}:{onOpen:(kind:string,id:string)=>void}){
 const [query,setQuery]=useState(''),[matches,setMatches]=useState<ExperienceMatch[]|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section aria-label="Channel experiences">
  <form onSubmit={async e=>{
   e.preventDefault();
   if(busy||query.trim().length<2)return;
   setBusy(true);setError('');setMatches(null);
   try{setMatches(await cloudRequest<ExperienceMatch[]>('channels.experiences.search',{query:query.trim()}));}
   catch{setError('Channel experiences could not be searched. Try again.');}
   finally{setBusy(false);}
  }}>
   <label>Search Channel experiences<input type="search" value={query} onChange={e=>setQuery(e.currentTarget.value)} maxLength={120} required minLength={2} placeholder="Try a place or activity"/></label>
   <button className="zs-primary" disabled={busy||query.trim().length<2}>{busy?'Searching…':'Search'}</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {matches?.length===0&&<p role="status">No matching Channel experiences.</p>}
  {matches?.map(match=><article className="oc-post" key={match.id}>
   <button className="oc-source" onClick={()=>onOpen('channel',match.channel_id)}>{match.channel_title} <AppGlyph name="next" size={16}/></button>
   <p>{match.excerpt}</p>
  </article>)}
 </section>;
}

export function ChannelDiscoveryChoice({id}:{id:string}){
 const [enabled,setEnabled]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function update(value?:boolean){
  setBusy(true);setError('');
  try{setEnabled(await cloudRequest<boolean>('channels.experiences.choice',{id,enabled:value}));}
  catch{setError('Discovery setting could not be loaded or saved.');}
  finally{setBusy(false);}
 }
 return <div>
  {enabled===null?<button type="button" className="zs-text-button" disabled={busy} onClick={()=>void update()}>Discovery settings</button>:<label>
   <input type="checkbox" checked={enabled} disabled={busy} onChange={e=>void update(e.currentTarget.checked)}/>
   Let ZURI search and Viola use an excerpt of this public post
  </label>}
  {error&&<small role="alert">{error}</small>}
 </div>;
}
