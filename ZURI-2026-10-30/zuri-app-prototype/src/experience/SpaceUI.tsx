import {useEffect,useState} from 'react';
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
 const [draft,setDraft]=useState<{file:File;url:string}|null>(null),[zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50),[error,setError]=useState('');
 useEffect(()=>()=>{if(draft)URL.revokeObjectURL(draft.url);},[draft]);
 async function crop(){
  if(!draft)return;
  try{
   const image=new Image();image.src=draft.url;await image.decode();
   const w=Math.min(image.naturalWidth,image.naturalHeight*ratio)/zoom,h=w/ratio;
   const canvas=document.createElement('canvas');canvas.width=Math.min(1600,Math.round(w));canvas.height=Math.round(canvas.width/ratio);
   const context=canvas.getContext('2d');if(!context)throw Error('Photo crop unavailable.');
   context.drawImage(image,(image.naturalWidth-w)*x/100,(image.naturalHeight-h)*y/100,w,h,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.88));if(!blob)throw Error('Could not crop this photo.');
   onChange(new File([blob],draft.file.name.replace(/\.[^.]+$/,'.webp'),{type:'image/webp'}));setDraft(null);
  }catch(e){setError(e instanceof Error?e.message:'Could not crop this photo.');}
 }
 return <><label>{label}<input type="file" accept={video?"image/jpeg,image/png,image/webp,video/mp4":"image/jpeg,image/png,image/webp"} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file?.type==='video/mp4'&&video){onChange(file);return;}if(file){setZoom(1);setX(50);setY(50);setError('');setDraft({file,url:URL.createObjectURL(file)});}}}/></label>
  {draft&&<Modal label="Crop photo" onClose={()=>setDraft(null)}><h3>Crop photo</h3><div className="oc-crop-preview" style={{aspectRatio:ratio}}><img src={draft.url} alt="Crop preview" style={{objectPosition:`${x}% ${y}%`,transformOrigin:`${x}% ${y}%`,transform:`scale(${zoom})`}}/></div><label>Zoom<input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><label>Horizontal position<input type="range" value={x} onChange={e=>setX(Number(e.target.value))}/></label><label>Vertical position<input type="range" value={y} onChange={e=>setY(Number(e.target.value))}/></label>{error&&<p role="alert">{error}</p>}<button type="button" className="zs-primary" onClick={()=>void crop()}>Use crop</button><button type="button" className="zs-text-button" onClick={()=>{onChange(draft.file);setDraft(null);}}>Keep original</button></Modal>}
 </>;
}
