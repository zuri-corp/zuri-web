import {useEffect,useRef,useState} from 'react';
import {cloudRequest,browseEntities,type CloudEntity} from './cloudClient';
import EntityEditor from './EntityScreens';
import EntityCard from './EntityCard';
import {Modal} from './UsabilityUI';

export const spaceCategories=['Food & hospitality','Retail','Health & wellness','Sports & recreation','Technology','Creative services','Education','Professional services','Community','Accommodation','Other'];
export const offeringCategories=['Food & drink','Furniture & home','Fashion','Electronics','Beauty & wellness','Sport','Education','Software & technology','Creative services','Professional services','Accommodation','Other'];
export function CategoryOptions({value,options}:{value:string;options:string[]}){
 return <><option value="">Choose a category</option>{value&&!options.includes(value)&&<option>{value}</option>}{options.map(option=><option key={option}>{option}</option>)}</>;
}

export function SpaceConnections({space,kind,owner,onOpen}:{space:CloudEntity;kind:'society'|'channel';owner:boolean;onOpen:(kind:string,id:string)=>void}){
 const [rows,setRows]=useState<CloudEntity[]>([]),[creating,setCreating]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);
  Promise.allSettled([browseEntities(kind),cloudRequest<CloudEntity[]>('entities.list',{})]).then(results=>{
   if(!active)return;
   const data=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
   setRows([...new Map(data.filter(row=>row.kind===kind&&row.details.parentId===space.id).map(row=>[row.id,row])).values()]);
   if(results.every(result=>result.status==='rejected'))setError('Could not load connections.');
   setLoading(false);
  });return()=>{active=false;};
 },[space.id,kind]);
 const label=kind==='society'?'Society':'Channel';
 return <section className="oc-space-links">{owner&&<button className="zs-primary" onClick={()=>setCreating(true)}>Create {label}</button>}
  {rows.map(row=><EntityCard key={row.id} entity={row} onOpen={onOpen}/>)}
  {!rows.length&&<p role="status">{error||(loading?'Loading…':kind==='society'?'No connected Societies yet.':'No connected Channels yet.')}</p>}
  {creating&&<Modal label={'Create '+label+' for '+space.title} onClose={()=>setCreating(false)}><EntityEditor kind={kind} parent={{id:space.id,visibility:space.visibility,title:space.title}} onCancel={()=>setCreating(false)} onCreated={row=>{setRows(old=>[row,...old]);setCreating(false);}}/></Modal>}
 </section>;
}

export function CropPhotoInput({label,onChange,ratio=1,video=false}:{label:string;video?:boolean;onChange:(file:File|null)=>void;ratio?:number}){
 const [draft,setDraft]=useState<{file:File;url:string}|null>(null);
 const [image,setImage]=useState<HTMLImageElement|null>(null);
 const [zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50);
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 const drag=useRef<{id:number;left:number;top:number;x:number;y:number}|null>(null);
 useEffect(()=>()=>{if(draft)URL.revokeObjectURL(draft.url);},[draft]);
 const width=image?Math.min(image.naturalWidth,image.naturalHeight*ratio)/zoom:0;
 const height=width/ratio;
 const excessX=image?image.naturalWidth-width:0,excessY=image?image.naturalHeight-height:0;
 const clamp=(value:number)=>Math.max(0,Math.min(100,value));

 function close(){setDraft(null);setImage(null);drag.current=null;}
 async function crop(){
  if(!draft||!image||saving)return;
  setSaving(true);setError('');
  try{
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.min(1600,Math.round(width)));
   canvas.height=Math.max(1,Math.round(canvas.width/ratio));
   const context=canvas.getContext('2d');
   if(!context)throw Error('Photo cropping is unavailable.');
   context.drawImage(image,excessX*x/100,excessY*y/100,width,height,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.88));
   if(!blob)throw Error('Could not crop this photo.');
   const extension=blob.type==='image/webp'?'webp':'png';
   onChange(new File([blob],draft.file.name.replace(/\.[^.]+$/,'')+'.'+extension,{type:blob.type}));
   close();
  }catch(e){setError(e instanceof Error?e.message:'Could not crop this photo.');}
  finally{setSaving(false);}
 }
 return <>
  <label className="oc-photo-picker">{label}<input type="file" accept={video?'image/*,video/mp4':'image/*'} onChange={e=>{
   const file=e.currentTarget.files?.[0];e.currentTarget.value='';
   if(!file)return;
   setError('');
   if(file.type==='video/mp4'&&video){onChange(file);return;}
   setImage(null);setZoom(1);setX(50);setY(50);setDraft({file,url:URL.createObjectURL(file)});
  }}/></label>
  {draft&&<Modal label="Crop photo" onClose={()=>{if(!saving)close();}}><div className="oc-crop-dialog">
   <h3>Crop photo</h3>
   <div className="oc-crop-preview" style={{aspectRatio:ratio,width:`min(100%, ${36*ratio}dvh)`}}
    onPointerDown={e=>{
     if(!image||saving||!e.isPrimary||e.button!==0)return;
     e.currentTarget.setPointerCapture(e.pointerId);
     drag.current={id:e.pointerId,left:e.clientX,top:e.clientY,x,y};
    }}
    onPointerMove={e=>{
     const start=drag.current;
     if(start?.id!==e.pointerId)return;
     if(excessX>0)setX(clamp(start.x-(e.clientX-start.left)*width/e.currentTarget.clientWidth/excessX*100));
     if(excessY>0)setY(clamp(start.y-(e.clientY-start.top)*height/e.currentTarget.clientHeight/excessY*100));
    }}
    onLostPointerCapture={()=>{drag.current=null;}}>
    <img src={draft.url} alt="Crop preview" draggable={false}
     onLoad={e=>setImage(e.currentTarget)}
     onError={()=>setError('This photo could not be opened. Try JPEG, PNG or WebP.')}
     style={image?{width:`${image.naturalWidth/width*100}%`,height:`${image.naturalHeight/height*100}%`,left:(-excessX*x/width)+'%',top:(-excessY*y/height)+'%'}:{visibility:'hidden'}}/>
   </div>
   <label>Zoom<input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.currentTarget.value))}/></label>
   <details><summary>Adjust position</summary>
    <label>Horizontal position<input type="range" value={x} onChange={e=>setX(Number(e.currentTarget.value))}/></label>
    <label>Vertical position<input type="range" value={y} onChange={e=>setY(Number(e.currentTarget.value))}/></label>
   </details>
   {error&&<p role="alert">{error}</p>}
   <div className="oc-crop-actions">
    <button type="button" className="zs-text-button" disabled={saving||!image||!['image/jpeg','image/png','image/webp'].includes(draft.file.type)} onClick={()=>{onChange(draft.file);close();}}>Keep original</button>
    <button type="button" className="zs-primary" disabled={!image||saving} onClick={()=>void crop()}>{saving?'Preparing…':'Use crop'}</button>
   </div>
  </div></Modal>}
 </>;
}

export function AttachmentPreview({file,onRemove,disabled=false}:{file:File;onRemove:()=>void;disabled?:boolean}){
 const [preview,setPreview]=useState<{file:File;url:string}|null>(null);
 useEffect(()=>{
  const url=URL.createObjectURL(file);
  setPreview({file,url});
  return()=>URL.revokeObjectURL(url);
 },[file]);
 const url=preview?.file===file?preview.url:'';
 return <figure className="oc-attachment-preview">
  {url&&(file.type.startsWith('video/')?<video src={url} controls playsInline preload="metadata"/>:<img src={url} alt="Attachment preview"/>)}
  <button type="button" className="zs-text-button" disabled={disabled} onClick={onRemove}>Remove attachment</button>
 </figure>;
}
