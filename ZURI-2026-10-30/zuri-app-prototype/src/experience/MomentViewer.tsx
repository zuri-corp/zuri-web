import {useEffect,useRef,useState} from 'react';
import {cloudRequest,downloadCloud,type CloudRecord} from './cloudClient';
import {ScopedMedia} from './ObjectLayout';
import {CropPhotoInput} from './SpaceUI';
import {Modal} from './UsabilityUI';

export default function MomentViewer({record,busy,onSave,onDelete,onDismiss}:{record:CloudRecord;busy:boolean;onSave:(content:Record<string,unknown>,file:File|null)=>Promise<void>;onDelete:()=>Promise<void>;onDismiss?:()=>void}){
 const title=String(record.content.title||'Moment'),media=typeof record.content.mediaId==='string'?record.content.mediaId:undefined;
 const [menu,setMenu]=useState(Boolean(onDismiss)),[action,setAction]=useState(''),[name,setName]=useState(title);
 const [file,setFile]=useState<File|null>(null),[chapters,setChapters]=useState<CloudRecord[]>([]);
 const [chapter,setChapter]=useState(''),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [shareFile,setShareFile]=useState<File|null>(null);
 const press=useRef<{timer:number;x:number;y:number}|null>(null);
 function cancelPress(){if(press.current)window.clearTimeout(press.current.timer);press.current=null;}
 useEffect(()=>cancelPress,[]);
 function open(){setAction('');setError('');setName(title);setFile(null);setChapter('');setShareFile(null);setMenu(true);}
 function dismiss(){setMenu(false);onDismiss?.();}
 async function work(fn:()=>Promise<unknown>,close=true){
  if(working||busy)return;
  setWorking(true);setError('');
  try{await fn();if(close)dismiss();}
  catch(e){setError(e instanceof Error?e.message:'This action could not be completed.');}
  finally{setWorking(false);}
 }
 async function exportMedia(share:boolean){
  if(!media)return;
  const response=await fetch(await downloadCloud(media));
  if(!response.ok)throw Error('Could not download this media.');
  const blob=await response.blob();
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'} as Record<string,string>)[blob.type]||'bin';
  const exported=new File([blob],title+'.'+ext,{type:blob.type});
  if(share&&navigator.canShare?.({files:[exported]})){setShareFile(exported);setAction('share');return;}
  if(share)throw Error('Sharing is unavailable here. You can download the file.');
  const url=URL.createObjectURL(exported),link=document.createElement('a');
  link.href=url;link.download=exported.name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 return <article className="oc-workspace">
  {!onDismiss&&<div className="oc-moment-view" onContextMenu={e=>{e.preventDefault();open();}} onPointerDown={e=>{
   if(e.pointerType==='mouse'||!e.isPrimary||(e.target as Element).closest('button,video'))return;
   cancelPress();press.current={timer:window.setTimeout(open,550),x:e.clientX,y:e.clientY};
  }} onPointerMove={e=>{if(press.current&&Math.hypot(e.clientX-press.current.x,e.clientY-press.current.y)>12)cancelPress();}}
   onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}>
   {media?<ScopedMedia id={media} scope="private" mime={String(record.content.mime||'')} alt={title}/>:<p>{String(record.content.text||title)}</p>}
   <button type="button" className="oc-moment-menu" aria-label="Moment options" onClick={open}>⋯</button>
  </div>}
  {menu&&<Modal label="Moment options" onClose={()=>{if(!working)dismiss();}}>
   <div className="oc-moment-actions">
    <strong>{title}</strong>
    {!action&&<>
     <button onClick={()=>setAction('rename')}>Rename</button>
     <button onClick={()=>void work(async()=>{setChapters(await cloudRequest<CloudRecord[]>('records.list',{kind:'chapter'}));setAction('context');},false)} disabled={working}>Add to a Chapter</button>
     <button onClick={()=>setAction('replace')}>Replace media</button>
     {media&&<><button disabled={working} onClick={()=>void work(()=>exportMedia(false))}>Download</button><button disabled={working} onClick={()=>void work(()=>exportMedia(true),false)}>Share a copy</button></>}
     <button onClick={()=>setAction('delete')}>Delete</button>
    </>}
    {action==='rename'&&<form onSubmit={e=>{e.preventDefault();void work(()=>onSave({...record.content,title:name.trim()},null));}}>
     <label>Name<input required autoFocus maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
     <button className="zs-primary" disabled={working||!name.trim()}>Save name</button>
    </form>}
    {action==='context'&&<><label>Chapter<select value={chapter} onChange={e=>setChapter(e.target.value)}><option value="">Choose a Chapter</option>{chapters.map(ch=><option key={ch.id} value={ch.id}>{String(ch.content.title||'Untitled')}</option>)}</select></label>
     {chapters.length===0&&<p>Create a Chapter to group your Moments.</p>}
     <button className="zs-primary" disabled={working||!chapter} onClick={()=>void work(async()=>{
      const ch=chapters.find(item=>item.id===chapter);if(!ch)return;
      const ids=Array.isArray(ch.content.momentIds)?ch.content.momentIds:[];
      await cloudRequest('records.put',{id:ch.id,revision:ch.revision,kind:'chapter',content:{...ch.content,momentIds:[...new Set([...ids,record.id])]}});
     })}>Add Moment</button></>}
    {action==='replace'&&<><CropPhotoInput label="Choose new media" ratio={4/3} video onChange={setFile}/>
     <button className="zs-primary" disabled={working||!file} onClick={()=>void work(()=>onSave(record.content,file))}>Replace media</button></>}
    {action==='share'&&shareFile&&<button className="zs-primary" disabled={working} onClick={()=>void work(async()=>{
     try{await navigator.share({files:[shareFile]});}
     catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))throw e;}
    })}>Choose where to share</button>}
    {action==='delete'&&<><p>Delete this Moment from your collection?</p><button disabled={working} onClick={()=>void work(onDelete)}>Delete Moment</button></>}
    {action&&<button type="button" disabled={working} onClick={()=>{setAction('');setError('');}}>Back to options</button>}
    {error&&<p role="alert">{error}</p>}
   </div>
  </Modal>}
 </article>;
}
