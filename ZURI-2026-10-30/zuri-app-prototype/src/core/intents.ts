import {resolveIntent,validateIntentRequest,reviewTask,taskReview,type IntentRequest,type IntentPlan} from '@zuri/intent-engine';
import type {LocalData} from '../experience/model';
export {conversationIntent,readConversationIntent,validateIntentRequest,resolveIntent,intentCatalog,intentTarget,taskReview,reviewTask,INTENT_HANDOFF_KEY,readIntentHandoff} from '@zuri/intent-engine';
export type {ConversationIntent,IntentRequest,IntentPlan,IntentDetails} from '@zuri/intent-engine';
export type IntentRecord={id:string;request:IntentRequest;revision:number;status:'active'|'completed'|'cancelled';createdAt:string;updatedAt:string;taskId?:string;events:{kind:'saved'|'task-created'|'completed'|'cancelled'|'reopened';at:string}[]};
const safeId=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const timestamp=(v:unknown)=>typeof v==='string'&&v.length<40&&Number.isFinite(Date.parse(v));
export function validateIntentRecords(raw:unknown):IntentRecord[]{
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>100)throw Error('Intent records are invalid or exceed the local limit.');
 const seen=new Set();
 return raw.map(value=>{
  if(!value||!safeId(value.id)||seen.has(value.id)||!['active','completed','cancelled'].includes(value.status)||!Number.isSafeInteger(value.revision)||value.revision<1||!timestamp(value.createdAt)||!timestamp(value.updatedAt)||value.taskId!==undefined&&!safeId(value.taskId)||!Array.isArray(value.events)||value.events.length>50||value.events.some((e:{kind:string;at:string})=>!e||!['saved','task-created','completed','cancelled','reopened'].includes(e.kind)||!timestamp(e.at)))throw Error('A saved goal has an invalid format.');
  seen.add(value.id);return {id:value.id,request:validateIntentRequest(value.request),revision:value.revision,status:value.status,createdAt:value.createdAt,updatedAt:value.updatedAt,...(value.taskId?{taskId:value.taskId}:{}),events:value.events.map((e:IntentRecord['events'][number])=>({kind:e.kind,at:e.at}))};
 });
}
function event(record:IntentRecord,kind:IntentRecord['events'][number]['kind']){const at=new Date().toISOString();return {...record,revision:record.revision+1,updatedAt:at,events:[...record.events.slice(-49),{kind,at}]};}
export function saveIntent(data:LocalData,raw:unknown):{data:LocalData;id:string}{
 const request=validateIntentRequest(raw),plan=resolveIntent(request);
 if(plan.status!=='ready')throw Error('Clarify the goal before saving this plan.');
 const records=data.intents??[],existing=records.find(r=>r.status==='active'&&JSON.stringify(r.request)===JSON.stringify(request));
 if(existing)return {data,id:existing.id};
 if(records.length>=100)throw Error('This device already has 100 saved goals. Export a backup and remove old goal histories before starting another.');
 const id=crypto.randomUUID(),now=new Date().toISOString();
 return {id,data:{...data,intents:[...records,{id,request,revision:1,status:'active',createdAt:now,updatedAt:now,events:[{kind:'saved',at:now}]}]}};
}
export function intentTaskReview(data:LocalData,plan:IntentPlan,rawTask:unknown,recordId?:string){
 const planReview=taskReview(plan,rawTask),record=recordId?data.intents?.find(r=>r.id===recordId):undefined;
 if(recordId&&(!record||record.status!=='active'||JSON.stringify(record.request)!==JSON.stringify(plan.request)))throw Error('This saved goal changed or was closed. Review its current state.');
 return JSON.stringify({planReview,record:record?{id:record.id,revision:record.revision,status:record.status}:null});
}
/** This is a direct, reviewed action by the person in their own local workspace.
 * Tools and AI output cannot obtain write authority through this function. */
export function addIntentTask(data:LocalData,plan:IntentPlan,rawTask:unknown,approvedReview:string,recordId?:string):{data:LocalData;intentId:string;taskId:string;reused:boolean}{
 const expected=intentTaskReview(data,plan,rawTask,recordId);
 if(expected!==approvedReview)throw Error('The goal or task changed. Review the exact next step again.');
 const task=reviewTask(rawTask),saved=saveIntent(data,plan.request),record=saved.data.intents!.find(r=>r.id===saved.id)!;
 if(record.taskId){if(!data.tasks.some(t=>t.id===record.taskId))throw Error('The linked task was removed. Open Planner to review your next step.');return {data:saved.data,intentId:record.id,taskId:record.taskId,reused:true};}
 const taskId=crypto.randomUUID(),now=new Date(),localDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,next=event({...record,taskId},'task-created');
 return {intentId:record.id,taskId,reused:false,data:{...saved.data,tasks:[...saved.data.tasks,{id:taskId,text:task.title,done:false,date:localDate,...(task.dueDate?{dueDate:task.dueDate}:{})}],intents:saved.data.intents!.map(r=>r.id===record.id?next:r)}};
}
export function setIntentStatus(data:LocalData,id:string,status:IntentRecord['status']):LocalData{
 if(!['active','completed','cancelled'].includes(status))throw Error('Invalid goal status.');
 const current=data.intents?.find(r=>r.id===id);if(!current)throw Error('This goal is unavailable.');
 if(current.status===status)return data;
 const updated=event({...current,status},status==='active'?'reopened':status);
 return {...data,intents:data.intents!.map(r=>r.id===id?updated:r)};
}
export function removeIntent(data:LocalData,id:string):LocalData{
 if(!data.intents?.some(r=>r.id===id))throw Error('This saved goal is unavailable.');
 return {...data,intents:data.intents.filter(r=>r.id!==id)};
}
