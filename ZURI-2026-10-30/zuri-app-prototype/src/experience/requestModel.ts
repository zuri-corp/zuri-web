import type {LocalData} from './model';
import {pj,changePamoja,draftOrder,getSpaces} from './pamojaModel';
import {validDueDate} from './taskPlanning';
export type RequestFields={kind:string;date:string;endDate:string;time:string;people:string;variant:string;notes:string};
export function readRequestFields(raw:string):RequestFields|undefined{try{const x=JSON.parse(raw);return x.version===2&&['product','rental','appointment','subscription','pass'].includes(x.kind)&&['date','endDate','time','people','variant','notes'].every(k=>typeof x[k]==='string')?x:undefined;}catch{return undefined;}}
export function createOfferingRequest(d:LocalData,offer:{id:string;spaceId:string;name:string;price:number;type:string},quantity:number,f:RequestFields){
 if(f.kind!==offer.type)throw new Error('The request type no longer matches this offering.');
 if(f.kind!=='product'&&!validDueDate(f.date))throw new Error('Choose your preferred date.');
 if(f.endDate&&(!validDueDate(f.endDate)||f.endDate<f.date))throw new Error('The end date must be on or after the start date.');
 if(f.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time))throw new Error('Choose a valid preferred time.');
 if(f.people&&(!/^\d+$/.test(f.people)||+f.people<1||+f.people>10000))throw new Error('Choose a valid number of people, up to 10,000.');
 return draftOrder(d,offer,f.kind==='product'?quantity:1,JSON.stringify({version:2,...f}));
}
export function enquiryDrafts(d:LocalData){return pj(d).notes.flatMap(n=>{try{const x=JSON.parse(n.text);if(x.type!=='enquiry'||typeof x.spaceId!=='string'||typeof x.text!=='string'&&typeof x.message!=='string')return [];return [{id:n.id,context:typeof x.context==='string'?x.context:'space:'+x.spaceId,spaceId:x.spaceId,name:typeof x.offerName==='string'?x.offerName:typeof x.spaceName==='string'?x.spaceName:getSpaces(d).find(s=>s.id===x.spaceId)?.name||'Space enquiry',message:typeof x.message==='string'?x.message:x.text,when:typeof x.when==='string'?x.when:'',guests:typeof x.guests==='string'?x.guests:'',created:typeof x.created==='string'?x.created:'',cancelled:x.status==='cancelled'}];}catch{return [];}});}
export function changeEnquiry(d:LocalData,id:string,fields:{message:string;when:string;guests:string}|'cancel'|'restore'){
 const draft=enquiryDrafts(d).find(n=>n.id===id);if(!draft)throw new Error('This enquiry draft is unavailable.');
 if(typeof fields!=='string'){if(!fields.message.trim())throw new Error('Write your enquiry first.');if(fields.when&&!validDueDate(fields.when))throw new Error('Choose a valid date.');if(fields.guests&&(!/^\d+$/.test(fields.guests)||+fields.guests<1||+fields.guests>10000))throw new Error('Choose a valid number of people or items.');}
 return changePamoja(d,p=>({...p,notes:p.notes.map(n=>n.id===id?{...n,text:JSON.stringify({...JSON.parse(n.text),...(typeof fields==='string'?{status:fields==='cancel'?'cancelled':'draft'}:fields),context:draft.context})}:n)}));
}

export function reviseOfferingRequest(d:LocalData,id:string,offer:Parameters<typeof createOfferingRequest>[1],quantity:number,fields:RequestFields){
 const previous=pj(d).orders.find(o=>o.id===id);
 if(!previous||previous.status!=='draft')throw new Error('Only an available request draft can be edited.');
 if(previous.offerId!==offer.id)throw new Error('This offering does not match the saved request.');
 const next=createOfferingRequest(d,offer,quantity,fields),candidate=pj(next).orders[0];
 return changePamoja(next,p=>({...p,orders:p.orders.filter(o=>o.id!==candidate.id).map(o=>o.id===id?{...candidate,id,created:previous.created}:o)}));
}
