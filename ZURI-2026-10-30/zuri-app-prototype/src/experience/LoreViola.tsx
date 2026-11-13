import {draftCopy} from './violaDrafts';
import {AppGlyph} from './AppGlyph';
import {CropPhotoInput} from './SpaceUI';
import {useEffect,useRef,useState} from 'react';
import {cloudRequest,discoverCloud,uploadCloud,type CloudRecord,type DirectoryItem} from './cloudClient';

export type LoreRequest={kind:'people'|'chapter'|'moment';mode:'find'|'draft';term:string;body?:string};
export function loreRequest(text:string):LoreRequest|null{
 const request=text.trim().replace(/[.!?]+$/,'');
 const entry=request.match(/^(?:please\s+)?(?:i (?:want|need) to\s+)?(?:start|create|make|draft|add|save|find|open|show(?: me)?)\s+(?:(?:a|an|my|the|new|private)\s+)*(chapter|moment)s?\b(?:\s+(?:called|named|on)\s+)?\s*(.*)$/i);
 if(entry){
  const mode=/\b(?:find|open|show)\b/i.test(request.split(/\b(?:chapter|moment)s?\b/i)[0])?'find':'draft';
  const [title,...notes]=mode==='draft'?entry[2].split(/\s*[;.]\s+(?=(?:notes?|description|text)\s*:)/i):[entry[2]];
  const copy=mode==='draft'?draftCopy(request,title):{};
  const body=copy.description||notes.join(' ').replace(/^(?:notes?|description|text)\s*:\s*/i,'');
  return {kind:entry[1].toLowerCase() as 'chapter'|'moment',mode,term:(copy.title||title).slice(0,120),...(body?{body:body.slice(0,4000)}:{})};
 }
 const people=request.match(/^(?:please\s+)?(?:find|show me|look for|search for)\s+(?:(?:a|an|some|people who can|people with)\s+)?(.+)$/i);
 if(!people)return null;
 const capability=people[1].trim();
 if(!/\b(?:developers?|devs|engineers?|designers?|creators?|photographers?|mentors?|athletes?|writers?|founders?|people)\b/i.test(people[0]))return null;
 if(/\b(?:schedule|meetup|set up a ping)\b/i.test(request))return null;
 return {kind:'people',mode:'find',term:capability.slice(0,100)};
}

export default function LoreViola({request,onOpen}:{request:LoreRequest;onOpen:(kind:string,id:string)=>void}){
 const [query,setQuery]=useState(request.term),[filter,setFilter]=useState(request.term),[people,setPeople]=useState<DirectoryItem[]>([]),[records,setRecords]=useState<CloudRecord[]>([]),[title,setTitle]=useState(request.term),[text,setText]=useState(request.body||''),[file,setFile]=useState<File|null>(null),[review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<CloudRecord|null>(null);
 const submission=useRef(false),saveId=useRef(''),uploaded=useRef<{file:File;id:string}|null>(null);
 const noun=request.kind==='chapter'?'Chapter':'Moment';
 useEffect(()=>{
  if(request.mode!=='find')return;
  if(request.kind==='people'&&filter.trim().length<2)return;
  const controller=new AbortController();setBusy(true);setError('');setPeople([]);setRecords([]);
  const work=request.kind==='people'?discoverCloud(filter,controller.signal).then(items=>{if(!controller.signal.aborted)setPeople(items.filter(item=>item.kind==='person').slice(0,6));}):cloudRequest<CloudRecord[]>('records.list',{kind:request.kind}).then(items=>{if(!controller.signal.aborted)setRecords(items.filter(item=>String(item.content.title||'').toLowerCase().includes(filter.toLowerCase())).slice(0,6));});
  work.catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Lore could not be reached.');}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return ()=>controller.abort();
 },[request.kind,request.mode,filter]);

 async function save(){
  if(submission.current||!review||!title.trim())return;
  submission.current=true;setBusy(true);setError('');
  try{
   if(file&&uploaded.current?.file!==file){const media=await uploadCloud(file);if(!media.id)throw Error('The photo upload could not be confirmed.');uploaded.current={file,id:media.id};}
   saveId.current ||= crypto.randomUUID();
   const content={title:title.trim(),text:text.trim(),...(file&&uploaded.current?.file===file?{mediaId:uploaded.current.id,mime:file.type}:{})};
   const row=await cloudRequest<CloudRecord>('records.put',{id:saveId.current,kind:request.kind,revision:0,content});
   setSaved(row);
  }catch(error){setError(error instanceof Error?error.message:'Saving could not be confirmed.');}
  finally{submission.current=false;setBusy(false);}
 }
 return <section className="vw-compact" aria-label="Lore workspace">
  <strong>{request.kind==='people'?'Find people in Lore':request.mode==='find'?`Your ${noun}s`:saved?`${noun} saved`:`New ${noun}`}</strong>
  {request.mode==='find'?<>
   <form onSubmit={e=>{e.preventDefault();setFilter(query.trim());}}><label>{request.kind==='people'?'Name or capability':`${noun} name`}<input value={query} onChange={e=>setQuery(e.target.value)} maxLength={100}/></label><button className="vw-primary">Search</button></form>
   {people.map(person=><button className="vw-choice" key={person.id} onClick={()=>onOpen('person',person.id)}>{person.name}<small>{person.description}</small></button>)}
   {records.map(row=><button className="vw-choice" key={row.id} onClick={()=>onOpen(row.kind,row.id)}>{String(row.content.title||noun)}</button>)}
   {!busy&&!error&&(request.kind!=='people'||filter.length>=2)&&!people.length&&!records.length&&<small>No matching results.</small>}
  </>:saved?<button className="vw-primary" onClick={()=>onOpen(saved.kind,saved.id)}>Open {noun} <AppGlyph name="next" size={16}/></button>:review?<>
   <strong>{title}</strong>{text&&<p>{text}</p>}{file&&<small>{file.name}</small>}<small>Private to your account</small>
   <div className="vw-card-actions"><button className="vw-text" disabled={busy} onClick={()=>setReview(false)}>Edit</button><button className="vw-primary" disabled={busy} onClick={()=>void save()}>Save {noun}</button></div>
  </>:<form onSubmit={e=>{e.preventDefault();if(title.trim())setReview(true);}}><label>What should it be called?<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>{request.kind==='chapter'?'What is this chapter about?':'What do you want to remember?'}<textarea rows={2} maxLength={4000} value={text} onChange={e=>setText(e.target.value)}/></label>{request.kind==='moment'&&<CropPhotoInput label="Photo · optional" ratio={4/3} onChange={setFile}/>}<button className="vw-primary">Review draft</button></form>}
  {busy&&<small role="status">{request.mode==='find'?'Searching Lore…':'Saving…'}</small>}{error&&<small role="alert">{error}</small>}
 </section>;
}
