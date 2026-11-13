import MotionReference,{motionReference,type MotionReferenceRequest} from './MotionReference';
import EntityEditor,{entityNames} from './EntityScreens';
import {creationDraft,reviseCreation,type CreationDraft} from './violaDrafts';
import {AuraBrief,RizzDraft,zuriGreeting} from './ZuriGreeting';
import {AppGlyph} from './AppGlyph';
import type {KnowledgeSource} from '../core/knowledge';
import ConversationNextStep from './ConversationNextStep';
import {createPortal} from 'react-dom';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {resolveIntent,intentTarget,intentTaskReview,addIntentTask,type IntentPlan,type IntentDetails,type ConversationIntent,type IntentRequest} from '../core/intents';
import {parseRoute} from './model';
import type {MobileProps} from './MobileWorlds';
import {AuraOfferingCard,AuraSearchCard} from './AuraViola';
import {auraSearch,type AuraSearch} from './auraSearch';
import LoreViola,{loreRequest,type LoreRequest} from './LoreViola';
import type {ViolaEventResult,ViolaPingResult,ViolaPingDraft} from './services';
import {cloudRequest,type CloudEntity} from './cloudClient';

type Message={role:'user'|'assistant';content:string;sources?:KnowledgeSource[];events?:ViolaEventResult[];pings?:ViolaPingResult[];pingDraft?:ViolaPingDraft|null};
type Props=Pick<MobileProps,'data'|'update'|'go'|'open'|'notify'> & {visible:boolean;canPublish:boolean;onClose:()=>void;input:string;setInput:(s:string)=>void;messages:Message[];intent:ConversationIntent|null;currentSpace?:string;onReset:()=>void;enabled:boolean|null;busy:boolean;error:string;onAsk:()=>void;};

export default function ViolaWorkbox(p:Props){
 const [brief,setBrief]=useState<'updates'|'report'|null>(null),[rizzDraft,setRizzDraft]=useState<string|null>(null);
 const [lore,setLore]=useState<LoreRequest|null>(null);
 const [plan,setPlan]=useState<IntentPlan|null>(null),[turns,setTurns]=useState<Message[]>([]),[taskOpen,setTaskOpen]=useState(false),[task,setTask]=useState(''),[date,setDate]=useState(''),[approval,setApproval]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pingDraft,setPingDraft]=useState<ViolaPingDraft|null>(null),[pingApproved,setPingApproved]=useState(false),[pingBusy,setPingBusy]=useState(false),[publishedPing,setPublishedPing]=useState(''),[pingError,setPingError]=useState('');
 const [reference,setReference]=useState<MotionReferenceRequest|null>(null);
 const [creationSession,setCreationSession]=useState(0);
 const [creation,setCreation]=useState<CreationDraft|null>(null),[draftVisibility,setDraftVisibility]=useState<'public'|'private'|null>(null),[savedEntity,setSavedEntity]=useState<{id:string;title:string}|null>(null);
 const [aura,setAura]=useState<AuraSearch|'offering'|null>(null);
 const [frame,setFrame]=useState<CSSProperties>({visibility:'hidden'});
 useLayoutEffect(()=>{if(!p.visible)return;const app=document.querySelector('.zuri-exp');if(!app)return;const measure=()=>{const r=app.getBoundingClientRect();setFrame({left:r.left,top:r.top,width:r.width,height:r.height,borderRadius:getComputedStyle(app).borderRadius});};measure();const observer=new ResizeObserver(measure);observer.observe(app);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};},[p.visible]);
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLTextAreaElement>(null),body=useRef<HTMLDivElement>(null),restoreFocus=useRef<HTMLElement|null>(null),pingRequest=useRef({key:'',id:''});
 useEffect(()=>{const d=dialog.current;if(!p.visible)return;restoreFocus.current=document.activeElement as HTMLElement|null;if(d&&!d.open)d.show();input.current?.focus();return()=>{if(d?.open)d.close();restoreFocus.current?.focus();};},[p.visible]);
 useEffect(()=>{if(body.current)body.current.scrollTop=body.current.scrollHeight;},[p.messages,p.busy,p.intent,turns,plan,taskOpen,notice]);
 useEffect(()=>{const draft=[...p.messages].reverse().find(message=>message.pingDraft)?.pingDraft;if(draft){setPingDraft({...draft});setPingApproved(false);setPublishedPing('');setPingError('');}},[p.messages]);
 function analyse(text:string,goal='',details:IntentDetails={}){
  const result=resolveIntent({text,surface:'app',...(goal?{goal}:{}),details});
  setPlan(result);setTask(`${result.steps[0]?.title||'Choose my next step'}: ${result.request.text}`.slice(0,500));setDate('');setTaskOpen(false);setApproval('');setNotice('');setError('');return result;
 }
 function useConversation(request:IntentRequest){try{analyse(request.text,request.goal??'',request.details);p.setInput('');}catch(e){setError((e as Error).message);}}
 function clearArtifacts(){setReference(null);setCreation(null);setDraftVisibility(null);setSavedEntity(null);setPlan(null);setPingDraft(null);setTaskOpen(false);setApproval('');setAura(null);setLore(null);setBrief(null);setRizzDraft(null);setNotice('');setError('');setPingApproved(false);setPublishedPing('');setPingError('');}
 function newTopic(){clearArtifacts();setTurns([]);p.onReset();input.current?.focus();}
 function submit(){
  if(!p.input.trim()||p.busy)return;
  const request=p.input.trim();
  if(/^(?:new topic|start over|clear chat|change topic)[.!\s]*$/i.test(request)){newTopic();return;}
  const greet=/^(?:hi|hey|hello|good morning|good afternoon|good evening)(?:\s+viola)?[.!]*$/i.test(request);
  const updates=/\b(?:updates|news|report|brief|summari[sz]e|what.s new)\b/i.test(request)&&/\b(?:aura|spaces?|societ(?:y|ies)|echoes|topics)\b/i.test(request)||/^what.s new[?!.]*$/i.test(request);
  const post=request.match(/^(?:(?:can|could) you\s+)?(?:draft|write|create|prepare)\s+(?:a\s+)?(?:rizz\s+)?(?:post|channel update)(?:\s+(?:about|saying|that says)\s+(.+))?[.!]?$/i);
  if(greet||updates||post){clearArtifacts();p.onReset();setTurns([{role:'user',content:request},...(greet?[{role:'assistant' as const,content:zuriGreeting(p.data.name)}]:[])]);if(post)setRizzDraft(post[1]||'');else setBrief(/\breport\b/i.test(request)?'report':'updates');return;}
  if(/^(?:open|show(?: me)?)\s+(?:my\s+)?(?:rizz\s+)?(?:chats|channels|rizz feed)[.!]*$/i.test(request)){p.onClose();p.go({world:'rizz',tab:/chats/i.test(request)?'Chats':/channels/i.test(request)?'Channels':'Feed'});return;}
  const fresh=creationDraft(request);
  const correction=creation&&!savedEntity&&/^(?:actually\b|change\b|make it\b|(?:venue|location|description|category|visibility|capacity|price|admission)\s*:|UGX\b|we deliver\b)/i.test(request)?reviseCreation(creation,request):null;
  if(fresh||correction){
   const next=(fresh||correction)!;
   if(fresh){clearArtifacts();p.onReset();setCreationSession(id=>id+1);}
   else p.setInput('');
   setCreation(next);
   if(next.kind!=='offering'&&next.fields.visibility)setDraftVisibility(next.fields.visibility);
   const question=next.kind==='offering'?!next.fields.space?'Which Space should this offering go in?':!next.fields.description?'What’s included in the offering?':'Check the offering details below.':!next.fields.title?`What should the ${next.kind} be called?`:!next.fields.starts&&['event','ping'].includes(next.kind)?'When does it start? Enter the date and time in EAT.':!next.fields.location&&['event','ping','space'].includes(next.kind)?'Where is it?':!next.fields.visibility&&(fresh||!draftVisibility)?'Who should be able to see it?':`Check the ${next.kind} details below.`;
   setTurns(previous=>[...(fresh?[]:previous),{role:'user',content:request},{role:'assistant',content:question}]);
   return;
  }
  const match=motionReference(request);
  if(match){clearArtifacts();p.onReset();setTurns([{role:'user',content:request}]);setReference(match);return;}
  const loreAction=loreRequest(request);
  const search=loreAction?null:auraSearch(request);
  const offering=/\b(?:add|create|publish|list|draft|put up)\b.{0,60}\bofferings?\b/i.test(request);
  clearArtifacts();
  if(loreAction||search||offering){
   p.onReset();
   setTurns([{role:'user',content:request}]);
   if(loreAction)setLore(loreAction);
   else setAura(offering?'offering':search);
   return;
  }
  if(p.enabled){setTurns([]);p.onAsk();return;}
  try{const text=p.input.trim(),result=analyse(text);setTurns(t=>[...t,{role:'user',content:text},{role:'assistant',content:result.status==='blocked'?result.interpretation:result.question||`We can start here: ${result.title.toLowerCase()}. I’ve put a possible next step below for you to review.`}]);p.setInput('');}catch(e){setError((e as Error).message);}
 }
 function clarify(goal=plan?.request.goal??'',details=plan?.request.details??{}){if(!plan)return;try{analyse(plan.request.text,goal,details);}catch(e){setError((e as Error).message);}}
 function save(){
  if(!plan||!approval)return;
  try{addIntentTask(p.data,plan,{title:task,dueDate:date},approval);p.update(d=>{try{return addIntentTask(d,plan,{title:task,dueDate:date},approval).data;}catch(e){queueMicrotask(()=>{setError((e as Error).message);setNotice('');});return d;}});setNotice('Your next step is in Planner.');setApproval('');setTaskOpen(false);}catch(e){setError((e as Error).message);}
 }
 function editPingDraft(patch:Partial<ViolaPingDraft>){setPingDraft(current=>current?{...current,...patch}:current);setPingApproved(false);setPingError('');}
 function localStart(value:string|null){return value?new Date(Date.parse(value)+3*60*60*1000).toISOString().slice(0,16):'';}
 async function publishPing(){
  if(!pingDraft||!pingApproved||pingBusy||publishedPing)return;
  const startsAt=pingDraft.startsAt?Date.parse(pingDraft.startsAt):NaN;
  if(!pingDraft.title.trim()||!pingDraft.description.trim()||!pingDraft.location.trim()||!Number.isFinite(startsAt)||!pingDraft.visibility||!pingDraft.joinPolicy){setPingError('Complete the title, plan, time, location, visibility and participation rule before publishing.');return;}
  if(pingDraft.linkedEvent?.visibility==='private'&&pingDraft.visibility!=='private'){setPingError('A Ping linked to a private Event must also be private.');return;}
  const payload={
   kind:'ping',title:pingDraft.title.trim(),description:pingDraft.description.trim(),visibility:pingDraft.visibility,
   join_policy:pingDraft.visibility==='private'?'invite':pingDraft.joinPolicy,consent:true,
   consent_reference:`Creator reviewed and explicitly confirmed publication of this ${pingDraft.visibility} Ping in Motion.`,
   starts_at:new Date(startsAt).toISOString(),ends_at:null,
   capacity:pingDraft.participantCount?pingDraft.participantCount+1:null,
   details:{location:pingDraft.location.trim(),category:pingDraft.category.trim()},
   ...(pingDraft.linkedEvent?.reference.source==='zuri_entities'?{contexts:[pingDraft.linkedEvent.reference.id]}:{})
  };
  const key=JSON.stringify(payload);if(pingRequest.current.key!==key)pingRequest.current={key,id:crypto.randomUUID()};
  setPingBusy(true);setPingError('');
  try{
   const entity=await cloudRequest<CloudEntity>('entities.create',{...payload,request_id:pingRequest.current.id});
   if(entity.kind!=='ping'||typeof entity.id!=='string'||!entity.id)throw Error('The server did not confirm the created Ping.');
   setPublishedPing(entity.id);setPingApproved(false);p.notify('Your Ping was published in Motion.');
  }catch(e){setPingError(e instanceof Error?e.message:'Ping publication was not confirmed.');}
  finally{setPingBusy(false);}
 }
 const target=plan?.actions.some(a=>a.id==='open-workflow')?intentTarget(plan,'open-workflow'):null;
 const peopleTarget=plan?.actions.some(a=>a.id==='find-people')?intentTarget(plan,'find-people'):null;
 const recentEventResults=[...p.messages].reverse().find(message=>message.role==='assistant'&&message.events?.length)?.events??[];
 const recentPingResults=[...p.messages].reverse().find(message=>message.role==='assistant'&&message.pings?.length)?.pings??[];
 function eventCard(event:ViolaEventResult){
  return <article className="vw-event-card" key={`${event.reference.source}:${event.reference.id}`}>
   <header><span><strong>{event.title}</strong><small>{event.source} · {event.status==='ongoing'?'Happening now':'Upcoming'}</small></span>{event.visibility==='private'&&<small>Private</small>}</header>
   <p>{new Date(event.startsAt).toLocaleString('en-GB',{timeZone:'Africa/Kampala',dateStyle:'medium',timeStyle:'short'})} EAT{event.location.venue||event.location.city||event.location.country?` · ${[event.location.venue,event.location.city,event.location.country].filter(Boolean).join(', ')}`:''}</p>
   {event.description&&<p>{event.description}</p>}
   <div className="vw-card-actions">{event.canonicalUrl&&<a href={event.canonicalUrl} target="_blank" rel="noopener noreferrer">Open event listing <AppGlyph name="next" size={16}/></a>}{event.reference.source==='zuri_entities'&&<button className="vw-text" onClick={()=>{p.onClose();p.open('event',event.reference.id);}}>Open in Motion <AppGlyph name="next" size={16}/></button>}</div>
  </article>;
 }
 function pingCard(ping:ViolaPingResult){
  return <article className="vw-ping-card" key={ping.reference.id}>
   <header><strong>{ping.title}</strong><small>{ping.status==='ongoing'?'Happening now':'Upcoming'} · {ping.visibility}</small></header>
   <p>{new Date(ping.startsAt).toLocaleString('en-GB',{timeZone:'Africa/Kampala',dateStyle:'medium',timeStyle:'short'})} EAT{ping.location.venue||ping.location.city?` · ${[ping.location.venue,ping.location.city].filter(Boolean).join(', ')}`:''}</p>
   {ping.category&&<small>{ping.category}</small>}{ping.description&&<p>{ping.description}</p>}
   {ping.capacity&&<small>Capacity including host: {ping.capacity}</small>}
   <button className="vw-text" onClick={()=>{p.onClose();p.open('ping',ping.reference.id);}}>Open Ping in Motion <AppGlyph name="next" size={16}/></button>
  </article>;
 }
 function pingDraftCard(){
  if(!pingDraft)return null;
  const privateEvent=pingDraft.linkedEvent?.visibility==='private';
  return <section className="vw-artifact vw-ping-draft" aria-label="Review Motion Ping draft">
   <header><strong>Review your Motion Ping</strong><small>NOT PUBLISHED</small></header>
   {pingDraft.linkedEvent&&<p className="vw-ping-context">For Event: <strong>{pingDraft.linkedEvent.title}</strong>{pingDraft.linkedEvent.reference.source==='zuri_entities'?' · linked to its ZURI event record':' · Motion source reference retained in this conversation'}</p>}
   <label>Ping title<input maxLength={120} value={pingDraft.title} onChange={event=>editPingDraft({title:event.target.value})}/></label>
   <label>What’s the plan?<textarea maxLength={1000} value={pingDraft.description} onChange={event=>editPingDraft({description:event.target.value})}/></label>
   <label>When · EAT (Africa/Kampala)<input type="datetime-local" value={localStart(pingDraft.startsAt)} onChange={event=>editPingDraft({startsAt:event.target.value?new Date(event.target.value+'+03:00').toISOString():null})}/></label>
   <label>Location<input maxLength={120} value={pingDraft.location} onChange={event=>editPingDraft({location:event.target.value})}/></label>
   <label>Looking for · optional<input type="number" min={1} max={100} value={pingDraft.participantCount??''} onChange={event=>editPingDraft({participantCount:event.target.value?Number(event.target.value):null})}/><small>Number of additional people; Motion capacity includes you as host.</small></label>
   <label>Category · optional<input maxLength={80} value={pingDraft.category} onChange={event=>editPingDraft({category:event.target.value})}/></label>
   <label>Visibility<select value={pingDraft.visibility??''} onChange={event=>editPingDraft({visibility:event.target.value==='public'||event.target.value==='private'?event.target.value:null,joinPolicy:event.target.value==='private'?'invite':null})}><option value="">Choose visibility</option><option value="public" disabled={privateEvent}>Public</option><option value="private">Private</option></select></label>
   {pingDraft.visibility==='public'?<label>Participation<select value={pingDraft.joinPolicy??''} onChange={event=>editPingDraft({joinPolicy:event.target.value==='open'||event.target.value==='approval'||event.target.value==='invite'?event.target.value:null})}><option value="">Choose how people respond</option><option value="open">Anyone may join</option><option value="approval">You approve requests</option><option value="invite">Invited people only</option></select></label>:pingDraft.visibility==='private'?<p>Participation: invited people only.</p>:null}
   {pingDraft.linkedEvent&&privateEvent&&pingDraft.visibility==='public'&&<p role="alert">This private Event requires a private Ping.</p>}
   {pingError&&<p role="alert" className="vw-error">{pingError}</p>}
   {publishedPing?<div role="status"><p>Published in Motion. Viola has not invited participants or confirmed attendance.</p><button className="vw-primary" onClick={()=>{p.onClose();p.open('ping',publishedPing);}}>Open published Ping <AppGlyph name="next" size={16}/></button></div>:<>
    <p>Publishing uses your signed-in Motion account and existing creation limits. A public Ping can be discovered; a private Ping is visible only under Motion’s permissions.</p>
    <label className="vw-ping-consent"><input type="checkbox" checked={pingApproved} onChange={event=>setPingApproved(event.target.checked)}/>I reviewed this Ping and explicitly approve publishing it with the selected visibility and participation rule.</label>
    {!p.canPublish&&<p>Publishing is disabled in this on-device workspace. Return to your live ZURI account to continue.</p>}
    <div className="vw-card-actions"><button className="vw-primary" disabled={!pingApproved||pingBusy||!p.canPublish} onClick={()=>void publishPing()}>{pingBusy?'Publishing…':'Publish Ping'}</button><button className="vw-text" disabled={pingBusy} onClick={()=>{setPingDraft(null);setPingApproved(false);setPingError('');}}>Cancel draft</button></div>
   </>}
  </section>;
 }
 if(!p.visible)return null;
 return createPortal(<div className="vw-host" style={frame}><div className={'viola-edgeglow'+(p.busy?' viola-edgeglow-active':'')} aria-hidden="true"/><dialog ref={dialog} className="vw-box vw-glass vw-simple" aria-labelledby="vw-title" aria-modal={false} onCancel={e=>{e.preventDefault();p.onClose();}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();p.onClose();}}}>
 <header className="vw-header"><div><h2 id="vw-title"><AppGlyph name="viola" size={25}/> Viola</h2></div><button type="button" onClick={newTopic} aria-label="New topic" title="New topic">↺</button><button type="button" aria-label="Close Viola" onClick={p.onClose}>×</button></header>
 <div ref={body} className="vw-body" aria-busy={p.busy}>
 <div className="vw-conversation" role="log" aria-label="Conversation with Viola" aria-live="polite">
  {turns.map((m,i)=><div key={'local'+i} className={m.role==='user'?'vw-user':'vw-ai-message'}><p>{m.content}</p></div>)}
  {p.messages.map((m,i)=><div key={'ai'+i} className={m.role==='user'?'vw-user':'vw-ai-message'}>
   <p>{m.content}</p>
   {i===p.messages.length-1&&!!m.events?.length&&<section className="vw-events" aria-label="Verified event matches">{m.events.map(eventCard)}</section>}
   {i===p.messages.length-1&&!!m.pings?.length&&<section className="vw-pings" aria-label="Visible Motion Ping matches">{m.pings.map(pingCard)}</section>}
   {i===p.messages.length-1&&!!m.sources?.length&&<details className="vw-sources"><summary>Sources from ZURI</summary>{m.sources.map(s=><a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer">{s.title}{s.availability==='proposed'?' · Proposed':''} <AppGlyph name="next" size={16}/></a>)}</details>}
  </div>)}
  {p.busy&&<div className="vw-working" role="status"><span/><span/><span/><span className="zs-sr-only">Thinking</span></div>}
 </div>
 {brief&&<AuraBrief format={brief} onOpen={(kind,id)=>{p.onClose();p.open(kind,id);}}/>}
 {rizzDraft!==null&&<RizzDraft initial={rizzDraft} onSaved={()=>{setRizzDraft(null);p.onClose();p.go({world:'rizz',tab:'Create'});}}/>}
 {reference&&<MotionReference key={JSON.stringify(reference)} request={reference} onOpen={(kind,id)=>{p.onClose();p.open(kind,id);}}/>}
 {lore&&<LoreViola key={JSON.stringify(lore)} request={lore} onOpen={(kind,id)=>{p.onClose();p.open(kind,id);}}/>}
 {creation?.kind==='offering'&&<AuraOfferingCard key={JSON.stringify(creation)} initial={creation.fields} currentSpace={p.currentSpace}/>}
 {creation&&creation.kind!=='offering'&&<section className="vw-compact" aria-label={entityNames[creation.kind]+' draft'}><strong>{entityNames[creation.kind]+(savedEntity?' created':' draft')}</strong>{savedEntity?<button className="vw-primary" onClick={()=>{p.onClose();p.open(creation.kind,savedEntity.id);}}>Open {savedEntity.title} <AppGlyph name="next" size={16}/></button>:<>{!draftVisibility&&<small>{[creation.fields.title,creation.fields.location,creation.fields.starts?.replace("T"," ")].filter(Boolean).join(" · ")}</small>}<label>Who can see it?<select value={draftVisibility||''} onChange={e=>setDraftVisibility(e.target.value==='public'?'public':e.target.value==='private'?'private':null)}><option value="">Choose visibility</option><option value="public">Public</option><option value="private">Private</option></select></label>{draftVisibility&&<EntityEditor key={creationSession} kind={creation.kind} inline initialFields={{...creation.fields,visibility:draftVisibility}} onCreated={row=>setSavedEntity(row)} onCancel={()=>setCreation(null)}/>}</>}</section>}
 {aura==='offering'&&<AuraOfferingCard currentSpace={p.currentSpace}/>}
 {aura&&aura!=='offering'&&<AuraSearchCard search={aura} onOpen={(kind,id)=>{p.onClose();p.open(kind,id);}} go={route=>{p.onClose();p.go(route);}}/>}
 {pingDraftCard()}
 {p.intent&&!plan&&!p.busy&&<ConversationNextStep key={JSON.stringify(p.intent)} draft={p.intent} onContinue={useConversation}/>}
 {plan&&<section className="vw-artifact vw-next" aria-label="Suggested next step"><strong>{plan.title}</strong>{plan.status!=='ready'&&<p>{plan.question||plan.interpretation}</p>}
 {plan.status==='clarify'&&plan.candidates.map(c=><button className="vw-choice" key={c.id} onClick={()=>clarify(c.id)}>{c.title}<span> <AppGlyph name="next" size={16}/></span></button>)}
 {plan.missing.includes('audience')&&<div className="vw-chips"><button onClick={()=>clarify(plan.request.goal??'',{...plan.request.details,audience:'personal'})}>For me</button><button onClick={()=>clarify(plan.request.goal??'',{...plan.request.details,audience:'business'})}>For my business</button></div>}
 {plan.missing.includes('location')&&<form className="vw-location" onSubmit={e=>{e.preventDefault();clarify(plan.request.goal??'',{...plan.request.details,location:String(new FormData(e.currentTarget).get('location')||'')});}}><label>Which town or area?<input name="location" required maxLength={80} placeholder="For example, Jinja"/></label><button className="vw-primary">Continue</button></form>}
 {plan.status==='ready'&&<><p>{plan.steps[0]?.detail}</p><div className="vw-card-actions">{peopleTarget&&<button className="vw-text" onClick={()=>{p.onClose();p.go(parseRoute(peopleTarget.href!));}}>{peopleTarget.label} <AppGlyph name="next" size={16}/></button>}{!peopleTarget&&<button className="vw-primary" onClick={()=>{setTaskOpen(!taskOpen);setApproval('');}}>Make this a task <AppGlyph name="next" size={16}/></button>}{target&&(target.scope==='app'?<button className="vw-text" onClick={()=>{p.onClose();p.go(parseRoute(target.href!));}}>{target.label} <AppGlyph name="next" size={16}/></button>:import.meta.env.MODE==='website'?<a className="vw-text" href={target.href} target="_top">{target.label} <AppGlyph name="next" size={16}/></a>:null)}</div><details className="vw-path"><summary>A little more detail</summary><ol>{plan.steps.map((s,i)=><li key={s.id}><span>{i+1}</span><div><strong>{s.title}</strong><p>{s.detail}</p></div></li>)}</ol></details></>}
 {taskOpen&&plan.status==='ready'&&<div className="vw-task-draft"><label>Your next step<textarea value={task} onChange={e=>{setTask(e.target.value);setApproval('');setNotice('');}} maxLength={500}/></label><label>When · optional<input type="date" value={date} onChange={e=>{setDate(e.target.value);setApproval('');}}/></label>{approval?<div className="vw-review"><strong>{task}</strong><p>{date||'No date selected'} · Saves one goal and linked task on this device. Nothing is sent, booked or published.</p><button className="vw-primary" onClick={save}>Confirm & add to Planner</button><button className="vw-text" onClick={()=>setApproval('')}>Keep editing</button></div>:<button className="vw-primary" onClick={()=>{try{setApproval(intentTaskReview(p.data,plan,{title:task,dueDate:date}));setError('');}catch(e){setError((e as Error).message);}}}>Review this task <AppGlyph name="next" size={16}/></button>}</div>}
 </section>}
 {notice&&<div className="vw-success" role="status"><span>✓</span>{notice}<button onClick={()=>{p.onClose();p.go({world:'motion',tab:'Planner'});}}>Open Planner <AppGlyph name="next" size={16}/></button></div>}
 {error&&<p className="vw-error" role="alert">{error}</p>}{p.error&&p.enabled!==false&&<p className="vw-error" role="alert">{p.error}</p>}
 </div>
 <footer className="vw-compose"><form onSubmit={e=>{e.preventDefault();submit();}}><textarea ref={input} aria-label="Message Viola" placeholder="Message Viola…" value={p.input} onChange={e=>{p.setInput(e.target.value);setApproval('');}} rows={2} maxLength={1500} required disabled={p.busy}/><button aria-label="Send to Viola" disabled={p.busy||!p.input.trim()}><AppGlyph name="send" size={20}/></button></form></footer>
 </dialog></div>,document.body);
}
