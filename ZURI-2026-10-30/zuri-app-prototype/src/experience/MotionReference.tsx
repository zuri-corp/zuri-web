import {requestedAgenda,kampalaAgendaDate,isOnAgenda} from './plannerAgenda';
import {useEffect,useState} from 'react';
import {browseEntities,cloudRequest,type CloudEntity,type CloudRecord} from './cloudClient';
import {getMotionEvents} from '../lib/motion-events';

export type MotionReferenceRequest={kind:'task'|'event'|'ping'|'motion';query:string;discoveryDay?:'today'|'tomorrow';day?:'today'|'tomorrow'};
type Match={id:string;kind:'edit-task'|'event'|'external-event'|'ping';title:string;detail:string};
export function motionReference(text:string):MotionReferenceRequest|null{
 const day=requestedAgenda(text);if(day)return {kind:'task',query:'',day};
 const compact=text.toLowerCase().replace(/[’']/g,'').replace(/[?.!]+$/g,'').trim();
 const browse=/^(?:whats (?:todays|tomorrows) motion|(?:whats|what is|what) (?:happening|on)(?: in .+?)? (?:today|tomorrow)|(?:show me |browse )?motion (?:today|tomorrow))$/.test(compact);
 if(browse)return {kind:'motion',query:/\bin (.+?) (?:today|tomorrow)$/.exec(compact)?.[1]||'',discoveryDay:compact.includes('tomorrow')?'tomorrow':'today'};
 const match=text.trim().match(/^(?:(?:can|could) you\s+)?(?:reference|find|show(?: me)?|open|look up|pull up)\s+(?:(?:my|a|an|the|saved)\s+)*(?:planner\s+)?(tasks?|events?|pings?)\b(?:\s+(?:called|named|about|for)\b)?\s*(.*)$/i);
 if(!match)return null;
 return {kind:/^task/i.test(match[1])?'task':/^ping/i.test(match[1])?'ping':'event',query:match[2].trim().replace(/[?.!]+$/,'').slice(0,100)};
}
function date(value:unknown){
 if(typeof value!=='string')return '';
 const when=new Date(value);
 return Number.isFinite(when.getTime())?when.toLocaleDateString('en-UG',{timeZone:'Africa/Kampala',dateStyle:'medium'}):'';
}

export default function MotionReference({request,onOpen}:{request:MotionReferenceRequest;onOpen:(kind:string,id:string)=>void}){
 const [input,setInput]=useState(request.query),[query,setQuery]=useState(request.query),[rows,setRows]=useState<Match[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const agendaDate=request.day?kampalaAgendaDate(request.day):null;
 useEffect(()=>{
  let active=true;setBusy(true);setError('');setRows([]);
  const matches=(value:string)=>value.toLowerCase().includes(query.toLowerCase());
  async function search():Promise<Match[]>{
   if(request.kind==='task'){
    const tasks=await cloudRequest<CloudRecord[]>('records.list',{kind:'task'});
    return tasks.filter(task=>(!agendaDate||isOnAgenda(task.content,agendaDate))&&matches(String(task.content.text||task.content.title||''))).slice(0,agendaDate?100:6).map(task=>({id:task.id,kind:'edit-task',title:String(task.content.text||task.content.title||'Planner task'),detail:[task.content.done?'Done':'Open',...(agendaDate&&typeof task.content.startsAt==='string'&&Number.isFinite(Date.parse(task.content.startsAt))?[new Date(task.content.startsAt).toLocaleTimeString('en-UG',{timeZone:'Africa/Kampala',hour:'2-digit',minute:'2-digit'})+' EAT']:[]),date(task.content.dueDate)].filter(Boolean).join(' · ')}));
   }
   const targetDate=request.discoveryDay?kampalaAgendaDate(request.discoveryDay):null;
   const onDate=(start?:string|null,end?:string|null)=>!targetDate||!!start&&Number.isFinite(Date.parse(start))&&kampalaAgendaDate('today',new Date(start))<=targetDate&&kampalaAgendaDate('today',new Date(end&&Number.isFinite(Date.parse(end))?end:start))>=targetDate;
   const description=(row:CloudEntity)=>[date(row.starts_at),String(row.details.location||'')].filter(Boolean).join(' · ');
   const wantEvents=request.kind!=='ping',wantPings=request.kind!=='event';
   const results=await Promise.allSettled([cloudRequest<CloudEntity[]>('entities.list',{}),wantEvents?browseEntities('event',query):Promise.resolve([]),wantEvents?getMotionEvents():Promise.resolve([]),wantPings?browseEntities('ping',query):Promise.resolve([])] as const);
   if(results.every((result,index)=>result.status==='rejected'||index===3&&!wantPings||(index===1||index===2)&&!wantEvents))throw Error('Motion search is unavailable. Try again.');
   const local=results[0].status==='fulfilled'?results[0].value:[],publicEvents=results[1].status==='fulfilled'?results[1].value:[],external=results[2].status==='fulfilled'?results[2].value:[],publicPings=results[3].status==='fulfilled'?results[3].value:[];
   const entries=[...new Map([...publicEvents,...publicPings,...local].filter(row=>!row.invitation_pending&&(wantEvents&&row.kind==='event'||wantPings&&row.kind==='ping')).map(row=>[row.id,row])).values()].filter(row=>onDate(row.starts_at,row.ends_at)&&matches(`${row.title} ${row.description} ${row.details.location||''}`));
   const events:Match[]=[...entries.filter(row=>row.kind==='event').map(row=>({id:row.id,kind:'event' as const,title:row.title,detail:description(row)})),...external.filter(row=>onDate(row.next_occurrence_at||row.starts_at,row.ends_at)&&matches([row.title,row.location?.venue,row.location?.city].filter(Boolean).join(' '))).map(row=>({id:row.id,kind:'external-event' as const,title:row.title,detail:[date(row.next_occurrence_at||row.starts_at),row.location?.city].filter(Boolean).join(' · ')}))];
   const pings:Match[]=entries.filter(row=>row.kind==='ping').map(row=>({id:row.id,kind:'ping',title:row.title,detail:description(row)}));
   return request.kind==='motion'?[...events.slice(0,4),...pings.slice(0,4)]:[...events,...pings].slice(0,6);
  }
  search().then(found=>{if(active)setRows(found);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Motion search is unavailable.');}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[request.kind,request.discoveryDay,query,agendaDate]);
 return <section className="vw-compact" aria-label="Motion references"><strong>{request.day?`Your Planner ${request.day}`:request.kind==='task'?'Your Planner tasks':request.kind==='motion'?'Motion '+request.discoveryDay:request.kind==='ping'?'Pings in Motion':'Events in Motion'}</strong>{!agendaDate&&<form onSubmit={e=>{e.preventDefault();setQuery(input.trim());}}><label>{request.kind==='task'?'Task name':request.kind==='motion'?'Area or keyword':request.kind==='ping'?'Ping name':'Event name'}<input value={input} onChange={e=>setInput(e.target.value)} maxLength={100}/></label><button className="vw-text">Search</button></form>}
 {rows.map(row=><button className="vw-choice" key={row.kind+row.id} onClick={()=>onOpen(row.kind,row.id)}>{row.title}<small>{row.kind==='ping'?'Ping · ':request.kind==='motion'?'Event · ':''}{row.detail}</small></button>)}
 {request.kind==='motion'&&!busy&&!error&&<small>{!rows.some(row=>row.kind==='ping')?'No matching Pings for this day.':''}</small>}
 {busy&&<small role="status">Searching Motion…</small>}{error&&<small role="alert">{error}</small>}{!busy&&!error&&!rows.length&&<small>{request.day?`Nothing is scheduled in your ZURI Planner for ${request.day}.`:request.kind==='task'?'No matching tasks in your Planner.':request.kind==='motion'?'No matching Events or Pings for this day.':request.kind==='ping'?'No matching Pings.':'No matching events.'}</small>}</section>;
}
