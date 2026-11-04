import type {LocalData} from './model';
import {chapterMomentIds} from './pamojaModel';
import {saveChannelPost} from './channelModel';
import {validDueDate} from './taskPlanning';
export function chapterTimeline(data:LocalData,id:string){
 const chapter=data.chapters.find(c=>c.id===id);if(!chapter)return [];
 return [...data.posts.filter(p=>chapterMomentIds(data,id).includes(p.id)&&(p.image||p.video)).map(post=>({id:'moment-'+post.id,created:post.created,post,block:undefined})),...(chapter.blocks||[]).map(block=>({id:'entry-'+block.id,created:block.created,block,post:undefined}))].sort((a,b)=>Date.parse(b.created)-Date.parse(a.created));
}
export function momentToChannel(data:LocalData,momentId:string,channelId:string,text:string){const post=data.posts.find(p=>p.id===momentId);if(!post)throw Error('This moment is unavailable.');return saveChannelPost(data,channelId,{id:crypto.randomUUID(),sourceMomentId:post.id,text:text.trim(),...(post.image?{image:post.image}:{}),...(post.video?{video:post.video}:{}),kind:'update',created:new Date().toISOString()});}
export function momentToTask(data:LocalData,momentId:string,text:string,dueDate:string){if(!data.posts.some(p=>p.id===momentId))throw Error('This moment is unavailable.');if(!text.trim())throw Error('Name your next step.');if(dueDate&&!validDueDate(dueDate))throw Error('Choose a valid due date.');return {...data,tasks:[...data.tasks,{id:crypto.randomUUID(),sourceMomentId:momentId,text:text.trim(),date:new Date().toISOString().slice(0,10),dueDate:dueDate||undefined,done:false}]};}
export function displayDate(raw:string){const value=new Date(raw);return Number.isNaN(value.getTime())?'Date unavailable':new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Kampala',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(value);}
