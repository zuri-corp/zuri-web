import {enquiryDrafts} from './requestModel';
import {events,users} from '../data/catalog';
import {getSpaces,getSocieties,pj} from './pamojaModel';
import {allPings} from './activity';
import {allOffers} from './spaceExperience';
import {saveChannelPost} from './channelModel';
import {validDueDate} from './taskPlanning';
import type {LocalData,ObjectRef} from './model';
export const refEqual=(a:ObjectRef,b:ObjectRef)=>a.kind===b.kind&&a.id===b.id;
export function refTitle(d:LocalData,r:ObjectRef):string|undefined{
 if(r.kind==='order')return pj(d).orders.find(x=>x.id===r.id)?.name;
 if(r.kind==='enquiry-draft')return enquiryDrafts(d).find(x=>x.id===r.id)?.name;
 if(r.kind==='person')return pj(d).blocked.includes(r.id)?undefined:r.id==='me'?d.name:users.find(x=>x.id===r.id)?.name;
 if(r.kind==='space')return getSpaces(d).find(x=>x.id===r.id)?.name;
 if(r.kind==='society'){const s=getSocieties(d).find(x=>x.id===r.id);return s&&(s.privacy!=='private'||pj(d).societies.some(x=>x.id===s.id))?s.name:undefined;}
 if(r.kind==='event')return events.find(x=>x.id===r.id)?.name;
 if(r.kind==='ping')return allPings(d).find(x=>x.id===r.id)?.title;
 if(r.kind==='chapter')return d.chapters.find(x=>x.id===r.id)?.title;
 return allOffers(d).find(x=>x.id===r.id)?.name;
}
function available(d:LocalData,r:ObjectRef){if(!refTitle(d,r))throw Error('This source is unavailable or restricted.');}
export function linkToChapter(d:LocalData,r:ObjectRef,id:string):LocalData{available(d,r);if(!d.chapters.some(c=>c.id===id))throw Error('Choose an existing Chapter.');if(r.kind==='chapter'&&r.id===id)throw Error('A Chapter cannot link to itself.');return {...d,chapters:d.chapters.map(c=>c.id===id?{...c,links:c.links?.some(x=>refEqual(x,r))?c.links:[...(c.links||[]),r]}:c)};}
export function taskFromSource(d:LocalData,r:ObjectRef,text:string,dueDate:string,chapterId:string):LocalData{available(d,r);if(!text.trim())throw Error('Write your next step.');if(dueDate&&!validDueDate(dueDate))throw Error('Choose a valid due date.');if(chapterId&&!d.chapters.some(c=>c.id===chapterId))throw Error('Choose an existing Chapter.');const task={id:crypto.randomUUID(),text:text.trim(),date:new Date().toISOString().slice(0,10),done:false,sourceRef:r,...(dueDate?{dueDate}:{}),...(chapterId?{chapterId}:{})};const next={...d,tasks:[...d.tasks,task],chapters:d.chapters.map(c=>c.id===chapterId?{...c,blocks:[...(c.blocks||[]),{id:crypto.randomUUID(),kind:'task' as const,taskId:task.id,created:new Date().toISOString()}]}:c)};return chapterId?linkToChapter(next,r,chapterId):next;}
export function channelFromSource(d:LocalData,r:ObjectRef,channelId:string,text:string){available(d,r);return saveChannelPost(d,channelId,{id:crypto.randomUUID(),text:text.trim(),created:new Date().toISOString(),sourceRef:r,kind:r.kind==='event'||r.kind==='ping'?'invitation':'update'});}
export function recapChapter(d:LocalData,r:ObjectRef,title:string,text:string):{data:LocalData;id:string}{available(d,r);if(!['event','ping'].includes(r.kind))throw Error('Recaps need an event or Ping.');if(!title.trim())throw Error('Name this Chapter.');const id=crypto.randomUUID();return {id,data:{...d,chapters:[...d.chapters,{id,title:title.trim(),description:'',momentIds:[],links:[r],blocks:text.trim()?[{id:crypto.randomUUID(),kind:'text',text:text.trim(),created:new Date().toISOString()}]:[]}]}};}
