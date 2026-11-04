import {matchesContext} from './contextFilter';
import {useEffect,useState,type ReactNode} from 'react';
import {tagLabel} from './activity';
import type {ContextTag,LocalData} from './model';
const kinds=[['space','Spaces'],['society','Societies'],['event','Events'],['ping','Pings'],['chapter','Chapters']] as const;
export function ContextBrowser<T>({data,items,tags,text,render,storageKey,query='',search=true}:{data:LocalData;items:T[];tags:(item:T)=>ContextTag[];text:(item:T)=>string;render:(items:T[])=>ReactNode;storageKey:string;query?:string;search?:boolean}){
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(storageKey)||'{}')}catch{return {}}};
 const [kind,setKind]=useState<string>(()=>read().kind||'all'),[context,setContext]=useState<string>(()=>read().context||''),[term,setTerm]=useState<string>(()=>read().term||'');
 useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify({kind,context,term}))}catch{}},[storageKey,kind,context,term]);
 const refs=Array.from(new Map(items.flatMap(tags).filter(t=>t.kind===kind).map(t=>[t.kind+':'+t.id,t])).values());
 const needle=(search?term:query).trim().toLowerCase();
 const filtered=items.filter(item=>{const refs=tags(item);return matchesContext(refs,kind,context)&&[text(item),...refs.map(t=>tagLabel(data,t))].join(' ').toLowerCase().includes(needle)});
 return <section className="cx-browser">{search&&<label className="zm-search"><span aria-hidden="true">⌕</span><input aria-label="Search moments and contexts" placeholder="Search moments, places, communities…" value={term} onChange={e=>setTerm(e.target.value)}/></label>}<div className="cx-filters" role="group" aria-label="Filter by context">{[['all','All'],...kinds,['untagged','Untagged']].map(([id,label])=><button key={id} aria-pressed={kind===id} onClick={()=>{setKind(id);setContext('')}}>{label}</button>)}</div>{kind!=='all'&&kind!=='untagged'&&<label className="cx-select">Show<select aria-label="Choose a specific context" value={context} onChange={e=>setContext(e.target.value)}><option value="">All {kinds.find(k=>k[0]===kind)?.[1].toLowerCase()}</option>{refs.map(t=><option key={t.id} value={t.id}>{tagLabel(data,t)}</option>)}</select></label>}<p className="cx-count" role="status">{filtered.length} {filtered.length===1?'result':'results'}</p>{filtered.length?render(filtered):<div className="xf-empty"><p>No matches in this context.</p><button className="zx-text" onClick={()=>{setKind('all');setContext('');setTerm('')}}>Clear context filters</button></div>}</section>;
}
