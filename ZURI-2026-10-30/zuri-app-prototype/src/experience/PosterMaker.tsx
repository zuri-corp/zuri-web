import {useState} from 'react';
import {makePoster} from './aiService';
import type {OfferingDraft} from './OfferingEditor';

type Ratio='1:1'|'4:5'|'9:16'|'16:9';

function posterPrompt(draft:OfferingDraft,style:string){
 const price=draft.priceMode==='quote'?'Ask for a quote':draft.priceLabel;
 return `Create a polished ${style||'modern'} promotional poster for a local business offering. Main heading: ${draft.title}. Supporting copy: ${draft.description}. ${price?`Price or call to action: ${price}.`:''} ${draft.delivery?`Delivery: ${draft.delivery}.`:''} Use a clear visual hierarchy, generous negative space, a premium product-focused composition, and legible English typography. Do not invent a brand name, contact details, discounts, or claims.`;
}

function imageFile(data:string,mime:string,title:string){
 const bytes=Uint8Array.from(atob(data),value=>value.charCodeAt(0));
 const extension=mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png';
 return new File([bytes],`${title.toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'zuri-offering'}-poster.${extension}`,{type:mime});
}

export default function PosterMaker({draft,onUse}:{draft:OfferingDraft;onUse:(file:File)=>void}){
 const [style,setStyle]=useState('modern, editorial'),[ratio,setRatio]=useState<Ratio>('4:5'),[preview,setPreview]=useState(''),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function generate(){
  setBusy(true);setError('');
  try{
   const image=await makePoster(posterPrompt(draft,style),ratio);
   const next=imageFile(image.data,image.mime,draft.title);
   if(preview)URL.revokeObjectURL(preview);
   setFile(next);setPreview(URL.createObjectURL(next));
  }catch(reason){setError(reason instanceof Error?reason.message:'Poster generation could not be completed.');}
  finally{setBusy(false);}
 }
 return <section className="vw-compact" aria-label="Make a poster">
  <strong>Make a poster with Viola</strong>
  <label>Style<input value={style} maxLength={120} onChange={event=>setStyle(event.target.value)} placeholder="Modern, bold, calm…"/></label>
  <label>Format<select value={ratio} onChange={event=>setRatio(event.target.value as Ratio)}><option value="4:5">Feed poster</option><option value="9:16">Story poster</option><option value="1:1">Square post</option><option value="16:9">Wide banner</option></select></label>
  <button type="button" className="vw-text" disabled={busy} onClick={()=>void generate()}>{busy?'Making poster…':preview?'Make another poster':'Generate poster'}</button>
  {preview&&<><img className="sr-offer-preview" src={preview} alt={`Poster for ${draft.title}`}/><button type="button" className="vw-primary" onClick={()=>file&&onUse(file)}>Use as offering cover</button></>}
  {error&&<small role="alert">{error}</small>}
 </section>;
}
