import type {LocalData,ObjectRef} from '../experience/model';
import {today} from '../experience/model';
import {pj,changePamoja,ownsSpace,getSocieties} from '../experience/pamojaModel';
import {refTitle} from '../experience/connections';
import {manifests,type Capability} from './manifest';
export {manifests} from './manifest';
export type ToolContext={kind:'personal';id:'me'}|{kind:'space'|'society'|'chapter'|'event'|'ping';id:string};
export function manifest(id:string){const m=manifests.find(m=>m.id===id);if(!m)throw Error('This tool is not registered with ZURI Core.');return m;}
export const contextKey=(c:ToolContext)=>c.kind==='personal'?'personal':c.kind+':'+c.id;
export function parseToolContext(key='personal'):ToolContext{if(['home','personal','create'].includes(key))return {kind:'personal',id:'me'};const [kind,...rest]=key.split(':');if(['space','society','chapter','event','ping'].includes(kind)&&rest.join(':'))return {kind:kind as Exclude<ToolContext['kind'],'personal'>,id:rest.join(':')};return {kind:'space',id:key};}
export function contextTitle(data:LocalData,c:ToolContext){if(c.kind==='personal')return 'My workspace';if(c.kind==='space'&&!ownsSpace(data,c.id))throw Error('Only your own Space workspace can use tools.');if(c.kind==='society'&&!getSocieties(data).some(s=>s.id===c.id&&(s.privacy==='public'||pj(data).societies.some(x=>x.id===s.id))))throw Error('This Society context is unavailable.');const title=refTitle(data,c as ObjectRef);if(!title)throw Error('This context is unavailable.');return title;}
export function grantTool(data:LocalData,id:string,c:ToolContext):LocalData{const m=manifest(id);contextTitle(data,c);const key=contextKey(c);return changePamoja(data,p=>({...p,grants:[...p.grants.filter(g=>!(g.toolId===id&&g.spaceId===key)),{id:id+':'+key,toolId:id,spaceId:key,scopes:[...m.capabilities]}]}));}
export function revokeTool(data:LocalData,id:string,c:ToolContext){return changePamoja(data,p=>({...p,grants:p.grants.filter(g=>!(g.toolId===id&&g.spaceId===contextKey(c)))}));}
export function hasToolAccess(data:LocalData,id:string,c:ToolContext){const m=manifest(id);return pj(data).grants.some(g=>g.toolId===id&&g.spaceId===contextKey(c)&&m.capabilities.every(cap=>g.scopes.includes(cap)));}
export type CoreHost={read:()=>LocalData;write:(change:(data:LocalData)=>LocalData)=>void};
/** Local first-party adapter. External code requires a separate sandboxed transport. */
export function createLocalCore(host:CoreHost,toolId:string,context:ToolContext){
 const spec=manifest(toolId),scope=contextKey(context);
 function assert(data:LocalData,cap:Capability){contextTitle(data,context);if(!spec.capabilities.includes(cap)||!hasToolAccess(data,toolId,context))throw Error('Access is missing or has been revoked. Review tool permissions.');}
 const key=(name:string)=>{if(!/^[a-zA-Z0-9_-]{1,60}$/.test(name))throw Error('Invalid storage key.');return 'core:'+toolId+':'+scope+':'+name};
 return {apiVersion:1 as const,context:{...context},
 storage:{get(name:string){const d=host.read();assert(d,'storage.read');return pj(d).notes.find(n=>n.id===key(name))?.text??(name==='content'?pj(d).notes.find(n=>n.id===toolId+':'+(context.kind==='space'?context.id:scope))?.text:undefined);},set(name:string,value:string){if(typeof value!=='string'||value.length>20000)throw Error('Keep tool content below 20,000 characters.');host.write(d=>{assert(d,'storage.write');const id=key(name);return changePamoja(d,p=>({...p,notes:[...p.notes.filter(n=>n.id!==id),{id,text:value}]}));});}},
 planner:{create(input:{text:string;dueDate?:string}){const text=input.text.trim();if(!text||text.length>500)throw Error('Write a next step under 500 characters.');if(input.dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)||new Date(input.dueDate).toISOString().slice(0,10)!==input.dueDate))throw Error('Choose a valid due date.');const id=crypto.randomUUID();host.write(d=>{assert(d,'planner.create');return {...d,tasks:[...d.tasks,{id,text,done:false,date:today(),dueDate:input.dueDate||undefined,sourceRef:context.kind==='personal'?undefined:context as ObjectRef,chapterId:context.kind==='chapter'?context.id:undefined}],chapters:context.kind==='chapter'?d.chapters.map(c=>c.id===context.id?{...c,blocks:[...(c.blocks||[]),{id:crypto.randomUUID(),kind:'task' as const,taskId:id,created:new Date().toISOString()}]}:c):d.chapters}});return id;}}
 };
}
