import {AppGlyph} from './AppGlyph';
import {useEffect,useState} from 'react';
import {browseEntities,cloudRequest,type CloudEntity} from './cloudClient';
import {getPlacesPage,directionsUrl,type Business} from '../lib/geoapify-places';
import OfferingEditor,{type OfferingDraft} from './OfferingEditor';
import type {OfferingFields} from './violaDrafts';
import type {Route} from './model';

import {matchesArea,resolvePlaceArea,type AuraSearch} from './auraSearch';

export function AuraSearchCard({search,onOpen,go}:{search:AuraSearch;onOpen:(kind:string,id:string)=>void;go:(route:Route)=>void}){
 const [area,setArea]=useState(search.area),[query,setQuery]=useState(search),[result,setResult]=useState<{spaces:CloudEntity[];places:Business[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setResult(null);setError('');
  if(!query.area)return ()=>controller.abort();
  async function load(){
   if(query.mode==='spaces'){
    const rows=await browseEntities('space',query.term||query.area);
    return {spaces:rows.filter(row=>matchesArea(row,query.area)).slice(0,4),places:[]};
   }
   const center=await resolvePlaceArea(query.area,controller.signal);
   const page=await getPlacesPage({query:query.category==='all'?query.term:'',category:query.category,latitude:center.latitude,longitude:center.longitude},controller.signal);
   return {places:page.businesses.slice(0,4),spaces:[]};
  }
  load().then(rows=>{if(!controller.signal.aborted)setResult(rows);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Search failed.');});
  return ()=>controller.abort();
 },[query]);
 return <section className="vw-compact vw-aura-card" aria-label="Aura search"><strong>{query.term||'Spaces'}{query.area&&` · ${query.area}`}</strong>
  {!query.area||error?<form onSubmit={e=>{e.preventDefault();if(area.trim())setQuery({...query,area:area.trim()});}}><label>Which town or area?<input value={area} onChange={e=>setArea(e.target.value)} required maxLength={80}/></label><button className="vw-primary">Search</button></form>:null}
  {!result&&query.area&&!error&&<small role="status">Searching Aura…</small>}{error&&<small role="alert">{error}</small>}
  {result?.spaces.map(row=><button className="vw-choice" key={row.id} onClick={()=>onOpen('space',row.id)}>{row.title}<small>{String(row.details.location||'')}</small></button>)}
  {result?.places.map(row=><a className="vw-choice" key={row.id} href={directionsUrl(row)} target="_blank" rel="noopener noreferrer">{row.name}<small>{row.address}</small></a>)}
  {result&&!result.spaces.length&&!result.places.length&&<small>No matching {query.mode} in this area.</small>}
  {query.area&&<button className="vw-text" onClick={()=>go({world:'aura',tab:query.mode==='spaces'?'Spaces':'Find',searchTerm:query.term,searchArea:query.area,placeCategory:query.category})}>Open this search in Aura <AppGlyph name="next" size={16}/></button>}
 </section>;
}

export function AuraOfferingCard({currentSpace,initial}:{currentSpace?:string;initial?:OfferingFields}){
 const [spaces,setSpaces]=useState<CloudEntity[]|null>(null),[spaceId,setSpaceId]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState(''),[lookup,setLookup]=useState(initial?.space||''),[lookupBusy,setLookupBusy]=useState(false),[lookupNotice,setLookupNotice]=useState(''),[draft,setDraft]=useState<OfferingDraft|null>(null);
 useEffect(()=>{let active=true;
  Promise.all([cloudRequest<{user_id:string}>('account.get'),cloudRequest<CloudEntity[]>('entities.list',{})]).then(([account,entities])=>{
   if(!active)return;
   const owned=entities.filter(row=>row.kind==='space'&&row.owner_id===account.user_id);
   setSpaces(owned);
   const named=initial?.space?owned.filter(row=>row.title.trim().toLowerCase()===initial.space!.trim().toLowerCase()):[];
   if(named.length===1){setSpaceId(named[0].id);return;}
   if(currentSpace&&!initial?.space){
    if(owned.some(row=>row.id===currentSpace))setSpaceId(currentSpace);
    else void cloudRequest<{owner:boolean;entity:CloudEntity}>('objects.summary',{id:currentSpace}).then(summary=>{
     if(active&&summary.owner&&summary.entity.kind==='space'){setSpaces([...owned,summary.entity]);setSpaceId(currentSpace);}
    }).catch(()=>{});
   }
  }).catch(()=>{if(active)setError('Sign in to load the Spaces you can manage.');});
  return ()=>{active=false;};
 },[currentSpace,initial?.space]);
 async function findSpace(){
  if(!lookup.trim()||lookupBusy)return;
  setLookupBusy(true);setLookupNotice('');
  try{
   const rows=await browseEntities('space',lookup.trim());
   const summaries=await Promise.allSettled(rows.slice(0,8).map(row=>cloudRequest<{owner:boolean;entity:CloudEntity}>('objects.summary',{id:row.id})));
   const owned=summaries.flatMap(item=>item.status==='fulfilled'&&item.value.owner&&item.value.entity.kind==='space'?[item.value.entity]:[]);
   if(!owned.length){setLookupNotice('No Space you manage matched that name. Check the name or open the Space directly and ask Viola again.');return;}
   setSpaces(previous=>[...new Map([...(previous||[]),...owned].map(row=>[row.id,row])).values()]);
   if(owned.length===1)setSpaceId(owned[0].id);
  }catch{setLookupNotice('Space search could not be completed. Try again.');}finally{setLookupBusy(false);}
 }
 return <section className="vw-compact vw-aura-card" aria-label="Offering draft"><strong>{saved?'Offering published':'Add an offering'}</strong>
  {error&&<p role="alert">{error}</p>}{!spaces&&!error&&<small role="status">Finding your Spaces…</small>}
  {spaces&&!saved&&!draft&&<details open={!spaces.length}><summary>{spaces.length?'Can’t see your Space?':'Which Space do you want to manage?'}</summary><form onSubmit={e=>{e.preventDefault();void findSpace();}}><label>Space name<input required maxLength={100} value={lookup} onChange={e=>setLookup(e.target.value)}/></label><button className="vw-text" disabled={lookupBusy}>{lookupBusy?'Checking access…':'Find my Space'}</button>{lookupNotice&&<small role="status">{lookupNotice}</small>}</form></details>}
  {saved?<p>Published to {saved}.</p>:draft?<OfferingEditor entityId={spaceId} existing={null} initialDraft={draft} onCancel={()=>setDraft(null)} onSaved={()=>{setSaved(spaces?.find(row=>row.id===spaceId)?.title||'your Space');setDraft(null);}}/>:!!spaces?.length&&<form onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);const title=String(fields.get('name')||'').trim(),description=String(fields.get('included')||'').trim();if(title&&description&&spaceId)setDraft({title,description,priceLabel:String(fields.get('price')||'').trim(),category:initial?.category,delivery:initial?.delivery,priceMode:initial?.priceMode});}}>
   <label>Which Space is this for?<select required value={spaceId} onChange={e=>setSpaceId(e.target.value)}><option value="">Choose a Space</option>{spaces.map(row=><option key={row.id} value={row.id}>{row.title}{row.details.location?' · '+String(row.details.location):''}</option>)}</select></label>
   {spaceId&&<><label>What are you offering?<input name="name" defaultValue={initial?.title} required maxLength={120} placeholder="Offering name"/></label><label>What’s included?<textarea name="included" defaultValue={initial?.description} required maxLength={3000} rows={2}/></label><label>Price or starting point · optional<input name="price" defaultValue={initial?.priceLabel} maxLength={100}/></label><button className="vw-primary">Review draft</button></>}
  </form>}
 </section>;
}
