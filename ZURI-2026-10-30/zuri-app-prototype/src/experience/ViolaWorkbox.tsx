import type {KnowledgeSource} from '../core/knowledge';
import {VoiceButton} from './MobileWorlds';
import ConversationNextStep from './ConversationNextStep';
import {createPortal} from 'react-dom';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {AppGlyph} from './AppGlyph';
import {resolveIntent,intentTarget,intentTaskReview,addIntentTask,type IntentPlan,type IntentDetails,type ConversationIntent,type IntentRequest} from '../core/intents';
import {parseRoute} from './model';
import type {MobileProps} from './MobileWorlds';
import {violaDestination} from './aiService';

type Message={role:'user'|'assistant';content:string;sources?:KnowledgeSource[]};
type Props=Pick<MobileProps,'data'|'update'|'go'|'open'|'notify'> & {visible:boolean;onClose:()=>void;input:string;setInput:(s:string)=>void;messages:Message[];intent:ConversationIntent|null;review:Message[]|null;enabled:boolean|null;busy:boolean;error:string;onAsk:()=>void;onApprove:()=>void;onCancelReview:()=>void};

export default function ViolaWorkbox(p:Props){
 const [expanded,setExpanded]=useState(false),[minimized,setMinimized]=useState(false),[showGoals,setShowGoals]=useState(false),[recordId,setRecordId]=useState<string>();
 const [plan,setPlan]=useState<IntentPlan|null>(null),[taskOpen,setTaskOpen]=useState(false),[task,setTask]=useState(''),[date,setDate]=useState(''),[approval,setApproval]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [frame,setFrame]=useState<CSSProperties>({visibility:'hidden'});
 useLayoutEffect(()=>{if(!p.visible)return;const app=document.querySelector('.zuri-exp');if(!app)return;const measure=()=>{const r=app.getBoundingClientRect();setFrame({left:r.left,top:r.top,width:r.width,height:r.height,borderRadius:getComputedStyle(app).borderRadius});};measure();const observer=new ResizeObserver(measure);observer.observe(app);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};},[p.visible]);
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLTextAreaElement>(null),body=useRef<HTMLDivElement>(null),restoreFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(p.visible)setMinimized(false);},[p.visible]);
 useEffect(()=>{const d=dialog.current;if(!p.visible||minimized)return;restoreFocus.current=document.activeElement as HTMLElement|null;if(d&&!d.open)d.show();input.current?.focus();return()=>{if(d?.open)d.close();restoreFocus.current?.focus();};},[p.visible,minimized]);
 useEffect(()=>{if(body.current)body.current.scrollTop=body.current.scrollHeight;},[p.messages,p.busy,p.review,p.intent,plan,taskOpen,notice]);
 useEffect(()=>{if(showGoals&&body.current)body.current.scrollTop=0;},[showGoals]);
 function analyse(text:string,goal='',details:IntentDetails={}){
  const result=resolveIntent({text,surface:'app',...(goal?{goal}:{}),details});
  setRecordId(undefined);setPlan(result);setTask(`${result.steps[0]?.title||'Choose my next step'}: ${result.request.text}`.slice(0,500));setDate('');setTaskOpen(false);setApproval('');setNotice('');setError('');return result;
 }
 function useConversation(request:IntentRequest){try{analyse(request.text,request.goal??'',request.details);p.setInput('');setShowGoals(false);}catch(e){setError((e as Error).message);}}
 function submit(){
  if(!p.input.trim()||p.busy)return;
  if(p.enabled){p.onAsk();return;}
  setError(p.error||'Live AI is unavailable. Sign in with a verified ZURI account and check the AI service connection.');
 }
 function clarify(goal=plan?.request.goal??'',details=plan?.request.details??{}){if(!plan)return;try{analyse(plan.request.text,goal,details);}catch(e){setError((e as Error).message);}}
 function save(){
  if(!plan||!approval)return;
  try{addIntentTask(p.data,plan,{title:task,dueDate:date},approval,recordId);p.update(d=>{try{return addIntentTask(d,plan,{title:task,dueDate:date},approval,recordId).data;}catch(e){queueMicrotask(()=>{setError((e as Error).message);setNotice('');});return d;}});setNotice('Your next step is in Planner.');setApproval('');setTaskOpen(false);}catch(e){setError((e as Error).message);}
 }
 function pickGoal(id:string){const r=p.data.intents?.find(item=>item.id===id);if(!r)return;try{const next=analyse(r.request.text,r.request.goal??'',r.request.details);setRecordId(r.id);setTask(r.taskId?p.data.tasks.find(t=>t.id===r.taskId)?.text||next.steps[0]?.title||'':next.steps[0]?.title||'');setShowGoals(false);}catch(e){setError((e as Error).message);}}
 const target=plan?.actions.some(a=>a.kind==='navigate')?intentTarget(plan,'open-workflow'):null;
 const linkedGoal=plan?p.data.intents?.find(r=>r.status==='active'&&JSON.stringify(r.request)===JSON.stringify(plan.request)):undefined;
 const linkedTask=linkedGoal?.taskId?p.data.tasks.find(t=>t.id===linkedGoal.taskId):undefined;
 const hasConversation=p.messages.length>0||!!plan;
 if(!p.visible)return null;
 if(minimized)return createPortal(<div className="vw-host" style={frame}><button className="vw-minimized" onClick={()=>setMinimized(false)} aria-label="Restore Viola"><span className="vw-orb">✦</span><span><strong>Viola</strong><small>{p.busy?'Thinking with you…':'Pick up the conversation'}</small></span></button></div>,document.body);
 return createPortal(<div className="vw-host" style={frame}><div className={'viola-edgeglow'+(p.busy?' viola-edgeglow-active':'')} aria-hidden="true"/><dialog ref={dialog} className={'vw-box vw-glass'+(expanded?' vw-expanded':'')} aria-labelledby="vw-title" aria-modal={false} onCancel={e=>{e.preventDefault();p.onClose();}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();p.onClose();}}}>
 <header className="vw-header"><span className={'vw-orb'+(p.busy?' vw-breathing':'')} aria-hidden="true">✦</span><div><h2 id="vw-title">Viola</h2><small>{p.busy?'Thinking with you…':p.enabled?'Your ZURI AI companion':p.enabled===null?'Connecting to ZURI AI…':'Live AI unavailable'}</small></div><button aria-label="Recent goals" aria-expanded={showGoals} onClick={()=>setShowGoals(!showGoals)}><AppGlyph name="Chapters" size={18}/></button><button aria-label="Viola privacy settings" onClick={()=>{p.onClose();p.open('assistant-settings','home');}}><AppGlyph name="options" size={18}/></button><button aria-label="Minimize Viola" onClick={()=>setMinimized(true)}>−</button><button aria-label={expanded?'Shrink Viola':'Expand Viola'} onClick={()=>setExpanded(!expanded)}><AppGlyph name={expanded?'back':'plus'} size={17}/></button><button aria-label="Close Viola" onClick={p.onClose}>×</button></header>
 <div ref={body} className="vw-body" aria-busy={p.busy}>
 {showGoals&&<section className="vw-artifact vw-recent" aria-label="Recent goals"><header><strong>Pick up where you left off.</strong></header>{p.data.intents?.some(r=>r.status==='active')?p.data.intents.filter(r=>r.status==='active').slice().reverse().map(r=><button className="vw-choice" key={r.id} onClick={()=>pickGoal(r.id)}>{r.request.text}<span>↗</span></button>):<p>Your saved goals will be here when you need them.</p>}</section>}
 {!hasConversation&&!p.review&&<div className="vw-welcome"><span className="vw-welcome-star" aria-hidden="true">✦</span><h3>A thought.<br/><em>A little possibility.</em></h3><p>Hi {p.data.name.split(' ')[0]||'there'}. What’s on your mind?</p><div className="vw-starters">{[['Make a little room','Help me plan my study tasks'],['Build an idea','I want to build an app'],['Find my next step','I want people to find my business']].map(([label,text])=><button key={label} onClick={()=>{p.setInput(text);input.current?.focus();}}>{label}<span>↗</span></button>)}</div></div>}
 <div className="vw-conversation" role="log" aria-label="Conversation with Viola" aria-live="polite">{p.messages.map((m,i)=><div key={'ai'+i} className={m.role==='user'?'vw-user':'vw-ai-message'}>{m.role==='assistant'&&<small>VIOLA · AI</small>}<p>{m.content}</p>{!!m.sources?.length&&<details className="vw-sources"><summary>Sources from ZURI</summary>{m.sources.map(s=><a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer">{s.title}{s.availability==='proposed'?' · Proposed':''} ↗</a>)}</details>}</div>)}{p.busy&&<div className="vw-working" role="status"><span/><span/><span/><small>A little thinking space…</small></div>}</div>
 {p.intent&&!p.busy&&!p.review&&<ConversationNextStep key={JSON.stringify(p.intent)} draft={p.intent} onContinue={useConversation}/>}
 {plan&&<section className="vw-artifact vw-next" aria-label="Suggested next step"><header><span aria-hidden="true">✧</span><strong>{plan.status==='ready'?'Something to work with.':plan.status==='blocked'?'Permission still matters.':'One little thing first.'}</strong><small>FOR YOUR REVIEW</small></header><h3>{plan.title}</h3>{plan.status!=='ready'&&<p>{plan.question||plan.interpretation}</p>}
 {plan.status==='clarify'&&plan.candidates.map(c=><button className="vw-choice" key={c.id} onClick={()=>clarify(c.id)}>{c.title}<span>↗</span></button>)}
 {plan.missing.includes('audience')&&<div className="vw-chips"><button onClick={()=>clarify(plan.request.goal??'',{...plan.request.details,audience:'personal'})}>For me</button><button onClick={()=>clarify(plan.request.goal??'',{...plan.request.details,audience:'business'})}>For my business</button></div>}
 {plan.missing.includes('location')&&<form className="vw-location" onSubmit={e=>{e.preventDefault();clarify(plan.request.goal??'',{...plan.request.details,location:String(new FormData(e.currentTarget).get('location')||'')});}}><label>Which town or area?<input name="location" required maxLength={80} placeholder="For example, Jinja"/></label><button className="vw-primary">Continue</button></form>}
 {plan.status==='ready'&&<><p>{plan.steps[0]?.detail}</p><div className="vw-card-actions">{linkedTask?<button className="vw-primary" onClick={()=>{p.onClose();p.go({world:"motion",tab:"Planner"});}}>Open linked Planner task ↗</button>:<button className="vw-primary" onClick={()=>{setTaskOpen(!taskOpen);setApproval('');}}>Make this a task ↗</button>}{target&&(target.scope==='app'?<button className="vw-text" onClick={()=>{p.onClose();p.go(parseRoute(target.href!));}}>{target.label} ↗</button>:import.meta.env.MODE==='website'?<a className="vw-text" href={target.href} target="_top">{target.label} ↗</a>:null)}</div><details className="vw-path"><summary>A little more detail</summary><ol>{plan.steps.map((s,i)=><li key={s.id}><span>{i+1}</span><div><strong>{s.title}</strong><p>{s.detail}</p></div></li>)}</ol></details></>}
 {taskOpen&&!linkedTask&&plan.status==='ready'&&<div className="vw-task-draft"><label>Your next step<textarea value={task} onChange={e=>{setTask(e.target.value);setApproval('');setNotice('');}} maxLength={500}/></label><label>When · optional<input type="date" value={date} onChange={e=>{setDate(e.target.value);setApproval('');}}/></label>{approval?<div className="vw-review"><strong>{task}</strong><p>{date||'No date selected'} · Saves one goal and linked task on this device. Nothing is sent, booked or published.</p><button className="vw-primary" onClick={save}>Confirm & add to Planner</button><button className="vw-text" onClick={()=>setApproval('')}>Keep editing</button></div>:<button className="vw-primary" onClick={()=>{try{setApproval(intentTaskReview(p.data,plan,{title:task,dueDate:date},recordId));setError('');}catch(e){setError((e as Error).message);}}}>Review this task ↗</button>}</div>}
 </section>}
 {notice&&<div className="vw-success" role="status"><span>✓</span>{notice}<button onClick={()=>{p.onClose();p.go({world:'motion',tab:'Planner'});}}>Open Planner ↗</button></div>}
 {p.review&&<section className="vw-artifact vw-send-review" aria-label="Review AI disclosure"><header><strong>Before this leaves your device.</strong></header><p>Send this conversation to {violaDestination()} and its AI provider? Your AI allowance applies. Relevant public ZURI catalogue excerpts are included. No private ZURI records are attached.</p><details><summary>See the exact conversation · {p.review.length} messages</summary>{p.review.map((m,i)=><p key={i}><strong>{m.role==='user'?'You':'Viola'}:</strong> {m.content}</p>)}</details><div className="vw-card-actions"><button className="vw-primary" onClick={p.onApprove}>Send to Viola</button><button className="vw-text" onClick={p.onCancelReview}>Keep it here</button></div></section>}
 {error&&<p className="vw-error" role="alert">{error}</p>}{p.error&&p.enabled!==false&&<p className="vw-error" role="alert">{p.error}</p>}
 </div>
 <footer className="vw-compose"><form onSubmit={e=>{e.preventDefault();submit();}}><textarea ref={input} aria-label="Message Viola" placeholder="Tell Viola what’s on your mind…" value={p.input} onChange={e=>{p.setInput(e.target.value);setApproval('');p.onCancelReview();}} rows={2} maxLength={1500} required disabled={p.busy}/><VoiceButton onText={p.setInput} notify={p.notify}/><button aria-label="Send to Viola" disabled={p.busy||!p.input.trim()}><AppGlyph name="send" size={20}/></button></form><div className="vw-footnote"><span>{p.enabled?'AI messages are reviewed before sending.':(p.error||'Live AI is not connected. Local goal help stays here.')}</span><span>Actions by your approval.</span></div></footer>
 </dialog></div>,document.body);
}
