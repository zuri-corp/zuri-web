import {CropPhotoInput} from './SpaceUI';
import {useEffect,useState,type FormEvent} from 'react';
import MediaViewer from './MediaViewer';
import {MomentTile} from './ObjectLayout';
import MomentViewer from './MomentViewer';
import ChapterWorkspace from './ChapterWorkspace';
import {AppGlyph} from './AppGlyph';
import type {CloudRecord} from './cloudClient';
import type {Route} from './model';
type Entry={id:string;text:string;created_at:string};
export function chapterEntries(value:unknown):Entry[]{return Array.isArray(value)?value.filter((item):item is Entry=>!!item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.text==='string'&&typeof item.created_at==='string'):[];}
type Props={route:Route;records:CloudRecord[];busy:boolean;onOpen:(kind:string,id:string)=>void;onSave:(record:CloudRecord|null,content:Record<string,unknown>,file:File|null)=>Promise<void>;onRun:(work:()=>Promise<void>)=>Promise<void>;onBack:()=>void;onDelete:(record:CloudRecord)=>Promise<void>};
export default function CloudLore({route,records,busy,onOpen,onSave,onRun,onBack,onDelete}:Props){
 const isChapter=route.tab==='Chapters',kind=isChapter?'chapter':'moment';
 const record=records.find(r=>r.id===route.id),creating=route.kind===`new-${kind}`;
 const [optionsId,setOptionsId]=useState('');
 const moments=records.filter(item=>item.kind==='moment');
 const [previewId,setPreviewId]=useState('');
 const previewIndex=moments.findIndex(item=>item.id===previewId);
 const optionsRecord=records.find(item=>item.id===optionsId);
 const [editing,setEditing]=useState(false),[title,setTitle]=useState(''),[text,setText]=useState(''),[note,setNote]=useState(''),[file,setFile]=useState<File|null>(null);
 useEffect(()=>{setEditing(false);setTitle('');setText('');setNote('');setFile(null);},[route.id,route.kind]);
 const beginEdit=()=>{setTitle(String(record?.content.title||''));setText(String(record?.content.text||''));setFile(null);setEditing(true);};
 const submit=(e:FormEvent)=>{e.preventDefault();void onRun(async()=>{await onSave(record||null,{...(record?.content||{}),title:title.trim(),text:text.trim()},file);setEditing(false);setFile(null);});};
 const add=<button type="button" className="cw-add" aria-label={isChapter?'Start a chapter':'Add a moment'} onClick={()=>onOpen(`new-${kind}`,'new')}><AppGlyph name="plus" size={24}/></button>;
 if(creating||editing)return <section className="cw-card"><div className="cw-heading"><h2>{creating?(isChapter?'Start a chapter':'Keep a moment'):'Edit '+kind}</h2><button type="button" className="cw-link" onClick={()=>editing?setEditing(false):onBack()}>Cancel</button></div><form onSubmit={submit}><label>Title<input autoFocus required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>{isChapter?'What is this chapter about?':'Your moment'}<textarea maxLength={4000} value={text} onChange={e=>setText(e.target.value)}/></label><CropPhotoInput label="Photo or video · optional" video ratio={4/3} onChange={setFile}/><p>Only you can access this {kind}.</p><button className="cw-primary" disabled={busy}>{busy?'Saving…':creating?'Create '+kind:'Save changes'}</button></form></section>;
 if(route.kind===kind){
  if(!record)return <section className="cw-empty"><h2>{busy?'Opening your '+kind+'…':'This '+kind+' is unavailable.'}</h2><p>{busy?'Loading your saved work.':'Return to your collection and refresh. Your saved work has not been deleted.'}</p><button className="cw-link" onClick={onBack}>← Your {isChapter?'chapters':'moments'}</button></section>;
  if(!isChapter)return <MomentViewer record={record} busy={busy} onSave={(content,file)=>onSave(record,content,file)} onDelete={()=>onDelete(record)}/>;
  return <ChapterWorkspace record={record} busy={busy} onEdit={beginEdit} onSave={content=>onSave(record,content,null)}/>;
 }
 if(!isChapter)return <div className="sr-moments-grid">{moments.map(record=><MomentTile key={record.id} record={record} onOpen={()=>setPreviewId(record.id)} onOptions={()=>setOptionsId(record.id)}/>)}{previewIndex>=0&&<MediaViewer index={previewIndex} count={moments.length} onChange={i=>setPreviewId(moments[i].id)} onClose={()=>setPreviewId('')}><MomentViewer key={previewId} record={moments[previewIndex]} busy={busy} onSave={(content,file)=>onSave(moments[previewIndex],content,file)} onDelete={async()=>{await onDelete(moments[previewIndex]);setPreviewId('');}}/></MediaViewer>}{optionsRecord&&<MomentViewer record={optionsRecord} busy={busy} onDismiss={()=>setOptionsId('')} onSave={(content,file)=>onSave(optionsRecord,content,file)} onDelete={()=>onDelete(optionsRecord)}/>} {!records.length&&<p>Tap + to keep a moment.</p>}</div>;
 return <><div className="cw-lore-collection">{records.filter(r=>r.kind===kind).map(r=><button className="cw-lore-card" key={r.id} onClick={()=>onOpen(kind,r.id)} aria-label={'Open '+kind+': '+String(r.content.title||'Untitled')}><AppGlyph name={isChapter?'Chapters':'Moments'} size={25}/><span><strong>{String(r.content.title||'Untitled')}</strong><small>{new Date(r.updated_at).toLocaleDateString()} · Private</small>{isChapter&&<small>{chapterEntries(r.content.entries).length} entries</small>}</span><AppGlyph name="next" size={18}/></button>)}</div>{!records.length&&<section className="cw-empty"><h3>{isChapter?'A story starts here.':'Make room for a moment.'}</h3><p>Tap + when you are ready.</p></section>}</>;
}
