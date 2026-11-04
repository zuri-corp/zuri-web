import {useEffect,useState} from 'react';
import {contextOptions,tagLabel} from './activity';
import {Photo} from './MobileWorlds';
import type {LocalData,ContextTag} from './model';
export function ContextPicker({data,tags,onChange,kinds=['space','society','event','ping','chapter']}:{data:LocalData;tags:ContextTag[];onChange:(t:ContextTag[])=>void;kinds?:ContextTag['kind'][]}){
 const memoryKey='zuri-context-'+window.location.hash+'-'+kinds.join(',');
 useEffect(()=>{try{const stored=JSON.parse(sessionStorage.getItem(memoryKey)||'[]');if(Array.isArray(stored)&&stored.length&&stored.every(t=>t&&kinds.includes(t.kind)&&typeof t.id==='string'))onChange(stored);}catch{}},[]);
 useEffect(()=>{try{sessionStorage.setItem(memoryKey,JSON.stringify(tags));}catch{}},[memoryKey,tags]);
 const[kind,setKind]=useState<ContextTag['kind']>(kinds[0]),[search,setSearch]=useState('');const options=contextOptions(data,kind,search);
 return <div className="xf-context"><div className="xf-context-title"><span>⌘</span><label>Context<select aria-label="Context type" value={kind} onChange={e=>{setKind(e.target.value as ContextTag['kind']);setSearch('')}}>{kinds.map(k=><option key={k} value={k}>{k[0].toUpperCase()+k.slice(1)}</option>)}</select></label></div><div className="xf-context-search"><span>⌕</span><input aria-label={`Search ${kind} context`} placeholder={`Find a ${kind} to tag…`} value={search} onChange={e=>setSearch(e.target.value)}/></div>{search.trim()&&<div className="xf-context-results">{options.length?options.map(o=><button type="button" key={o.id} onClick={()=>{if(!tags.some(t=>t.kind===kind&&t.id===o.id))onChange([...tags,{kind,id:o.id}]);setSearch('');}}><Photo src={o.image}/><span><strong>{o.name}</strong><small>{o.detail}</small></span><b>＋</b></button>):<p>No matching {kind} in the available catalog.</p>}</div>}<div className="xf-tag-list">{tags.map(t=><button type="button" key={t.kind+t.id} aria-label={`Remove tag ${tagLabel(data,t)}`} onClick={()=>onChange(tags.filter(x=>x.kind!==t.kind||x.id!==t.id))}>{t.kind==='space'?'⌖':t.kind==='society'?'◎':t.kind==='event'?'◷':'↗'} {tagLabel(data,t)} ×</button>)}</div></div>;
}
