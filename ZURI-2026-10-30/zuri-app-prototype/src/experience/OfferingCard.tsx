import {AppGlyph} from './AppGlyph';
import {useEffect,useState} from 'react';
import OfferingPhoto,{useContextPhoto} from './OfferingPhoto';
import type {Offering} from './OfferingEditor';
import {Modal} from './UsabilityUI';
import {safeEventUrl} from '../lib/motion-event-dates';

function GalleryItem({id,video,title}:{id:string;video:boolean;title:string}){
 const url=useContextPhoto(id,'offering-photo');
 return url?(video?<video controls playsInline preload="metadata" src={url}/>:<img loading="lazy" src={url} alt={title}/>):null;
}
export default function OfferingCard({offer,owner,onEdit,cartKey}:{offer:Offering;owner:boolean;onEdit:()=>void;cartKey:string}){
 const [open,setOpen]=useState(false),[notice,setNotice]=useState(''),[quote,setQuote]=useState(false);
 const details=offer.details||{},quoteOnly=details.priceMode==='quote'||!offer.price_label.trim(),link=offer.links.find(item=>safeEventUrl(item.url));
 const cartStorage=`zuri-cart:${cartKey}`;
 const readCart=():{id:string;name:string;price:string;quantity:number}[]=>{try{return JSON.parse(localStorage.getItem(cartStorage)||'[]');}catch{return [];}};
 const [cart,setCart]=useState(readCart);
 useEffect(()=>{if(open)setCart(readCart());},[open,cartStorage]);
 function updateCart(remove=false){
  try{
   const rows=readCart(),previous=rows.find(row=>row.id===offer.id);
   const next=rows.filter(row=>row.id!==offer.id);
   if(!remove)next.push({id:offer.id,name:offer.title,price:offer.price_label,quantity:(previous?.quantity||0)+1});
   localStorage.setItem(cartStorage,JSON.stringify(next));setCart(next);setNotice(remove?'Removed from cart.':'Added to your cart on this device.');
  }catch{setNotice('The cart could not be updated.');}
 }
 return <article className="oc-offering oc-offering-compact">
  <button className="oc-offering-open" onClick={()=>{setNotice('');setQuote(false);setOpen(true);}}><OfferingPhoto id={offer.id} title=""/><span><strong>{offer.title}</strong><small>{details.category||details.kind||'Offering'}</small>{(quoteOnly||offer.price_label)&&<b>{quoteOnly?'Ask for a quote':offer.price_label}</b>}</span><span aria-hidden="true"> <AppGlyph name="next" size={16}/></span></button>
  {owner&&<button className="zs-text-button" onClick={onEdit}>Edit</button>}
  {open&&<Modal label={offer.title} onClose={()=>setOpen(false)}><h2>{offer.title}</h2><div className="oc-offer-gallery"><OfferingPhoto id={offer.id} title={offer.title}/>{details.gallery?.map(item=><GalleryItem key={item.id} id={item.id} video={item.mime.startsWith('video/')} title={offer.title}/>)}</div><p>{offer.description}</p><dl className="sr-offer-facts">{[['Category',details.category],['Quantity or duration',details.duration],['Delivery',details.delivery],['Availability',details.availability]].map(([label,value])=>value&&<div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   {quoteOnly?<button className="zs-primary" onClick={()=>setQuote(true)}>Ask for a quote</button>:offer.price_label?<button className="zs-primary" onClick={()=>updateCart()}>Add to cart</button>:null}
   {link&&<a className="zs-text-button" href={link.url} target="_blank" rel="noopener noreferrer">{quoteOnly?'Contact the business':'Visit offering website'} <AppGlyph name="next" size={16}/></a>}
   {quote&&<label>Quote request draft<textarea defaultValue={`Hi, could you share a quote for ${offer.title}, including availability and delivery options?`} rows={3}/><small>{link?'Use the business link to send your request.':'Copy this draft to share with the business.'}</small></label>}
   {cart.length>0&&<details><summary>Cart · {cart.reduce((n,row)=>n+row.quantity,0)}</summary>{cart.map(row=><p key={row.id}>{row.quantity} × {row.name} {row.price}</p>)}{cart.some(row=>row.id===offer.id)&&<button className="zs-text-button" onClick={()=>updateCart(true)}>Remove this offering</button>}</details>}{notice&&<p role="status">{notice}</p>}
  </Modal>}
 </article>;
}
