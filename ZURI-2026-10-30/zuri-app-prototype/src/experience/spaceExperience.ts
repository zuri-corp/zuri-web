import {spaces as seedSpaces,content} from '../data/catalog';
import {pj,getSpaces,visiblePost,changePamoja} from './pamojaModel';
import type {LocalData} from './model';
import {validDueDate} from './taskPlanning';
export function matchesSpace(d:LocalData,spaceId:string,query:string){
 const s=getSpaces(d).find(s=>s.id===spaceId);if(!s)return false;
 const offerings=[...(s.businessCategories||[]).flatMap(c=>c.offerings),...pj(d).offers.filter(o=>o.spaceId===spaceId&&!o.paused)];
 return [s.name,s.location,s.description,...offerings.map(o=>o.name+' '+o.description)].join(' ').toLowerCase().includes(query.trim().toLowerCase());
}
export function allOffers(d:LocalData){return [...pj(d).offers.filter(o=>!o.paused).map(o=>({...o,priceLabel:'UGX '+o.price.toLocaleString()+(o.unit?' / '+o.unit:''),image:o.image||getSpaces(d).find(s=>s.id===o.spaceId)?.image,source:'Your local offering',options:o.options||[] as string[]})),...seedSpaces.flatMap(s=>(s.businessCategories||[]).flatMap(c=>c.offerings.filter(o=>o.price!==undefined).map(o=>({id:o.id,spaceId:s.id,name:o.name,description:o.description,price:o.price!,priceLabel:o.priceLabel||'UGX '+o.price!.toLocaleString(),type:o.offeringType,image:o.images[0],source:'Sample merchant catalog',options:o.variants||o.slots||[]}))))];}
export function placeMoments(d:LocalData,id:string,society=false){
 const own=d.posts.filter(p=>!p.chapterOnly&&visiblePost(d,p.id,'me',p.tags?.filter(t=>t.kind==='society').map(t=>t.id))&&(society?p.tags?.some(t=>t.kind==='society'&&t.id===id):p.spaceId===id||p.tags?.some(t=>t.kind==='space'&&t.id===id))).map(p=>({id:p.id,creatorId:'me',caption:p.text,media:p.image,video:p.video,sample:false}));
 const archive=content.filter(p=>visiblePost(d,p.id,p.creatorId,p.taggedSocietyIds)&&(society?p.taggedSocietyIds.includes(id):p.taggedSpaceIds.includes(id))).map(p=>({id:p.id,creatorId:p.creatorId,caption:p.caption,media:p.mediaType==='photo'?p.media:undefined,video:undefined,sample:true}));return [...own,...archive];
}
export function enquiryContext(d:LocalData,key:string){
 const[type,id]=key.split(':');if(type==='space'){const space=getSpaces(d).find(s=>s.id===id);return space?{space,offer:undefined}:undefined;}
 if(type!=='offer')return undefined;
 const local=pj(d).offers.find(o=>o.id===id&&!o.paused);const seed=getSpaces(d).flatMap(s=>(s.businessCategories||[]).flatMap(c=>c.offerings.map(o=>({...o,spaceId:s.id})))).find(o=>o.id===id);const offer=local||seed;const space=offer&&getSpaces(d).find(s=>s.id===offer.spaceId);return offer&&space?{space,offer}:undefined;
}
export function saveEnquiry(d:LocalData,key:string,fields:{message:string;when:string;guests:string}){
 const context=enquiryContext(d,key);if(!context)throw new Error('This enquiry context is unavailable.');if(!fields.message.trim())throw new Error('Write your enquiry first.');
 if(fields.when&&!validDueDate(fields.when))throw new Error('Choose a valid preferred date.');
 if(fields.guests&&(!/^\d+$/.test(fields.guests)||Number(fields.guests)<1||Number(fields.guests)>10000))throw new Error('Choose a positive number of people or items, up to 10,000.');
 return changePamoja(d,p=>({...p,notes:[...p.notes,{id:crypto.randomUUID(),text:JSON.stringify({type:'enquiry',context:key,spaceId:context.space.id,spaceName:context.space.name,offerId:context.offer?.id,offerName:context.offer?.name,...fields,message:fields.message.trim(),created:new Date().toISOString()})}]}));
}
