'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {conversationBrief,previewGuideReply,type ChatMessage} from '@/lib/chat/conversation';
import {sourceLinks,type KnowledgeSource} from '@/lib/ai/knowledge/types';
type SourcedMessage=ChatMessage&{sources?:KnowledgeSource[]};
export default function ZuriConversation({compact=false}:{compact?:boolean}){
 const [enabled,setEnabled]=useState<boolean|null>(null),[messages,setMessages]=useState<SourcedMessage[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[handoffOpen,setHandoffOpen]=useState(false),[brief,setBrief]=useState('');
 const router=useRouter(),log=useRef<HTMLDivElement>(null),inputRef=useRef<HTMLTextAreaElement>(null),pending=useRef<ChatMessage[]>([]),aiRequest=useRef({json:'',id:''});
 useEffect(()=>{const controller=new AbortController();fetch('/api/chat',{signal:controller.signal,cache:'no-store'}).then(r=>r.json()).then(r=>setEnabled(r.enabled===true)).catch(()=>{if(!controller.signal.aborted)setEnabled(false);});return()=>controller.abort();},[]);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[messages,busy]);
 async function reply(next:ChatMessage[]){
  if(busy)return;setError('');setBusy(true);pending.current=next;
  try{
   if(!enabled){setMessages([...next,{role:'assistant',content:previewGuideReply(next)}]);return;}
   const context=next.slice(-12).map(({role,content})=>({role,content})),json=JSON.stringify(context);if(aiRequest.current.json!==json)aiRequest.current={json,id:crypto.randomUUID()};
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:context,consent:true,requestId:aiRequest.current.id}),signal:AbortSignal.timeout(55000)}),result=await response.json();
   if(!response.ok||typeof result.reply!=='string')throw Error(result.error||'Unable to reply right now.');
   setMessages([...next,{role:'assistant',content:result.reply,sources:sourceLinks(result.sources)}]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to connect.');}finally{setBusy(false);}
 }
 function send(e:FormEvent){e.preventDefault();if(!input.trim()||busy||enabled===null)return;const next:ChatMessage[]=[...messages,{role:'user',content:input.trim()}];setMessages(next);setInput('');void reply(next);}
 function requestPerson(){setBrief(messages.some(m=>m.role==='user')?conversationBrief(messages):'');setHandoffOpen(true);setError('');}
 function handoff(){try{sessionStorage.setItem('zuri-reviewed-brief',brief.trim());router.push('/tech/enquire?from=conversation');}catch{setError('Your browser could not prepare the brief. Please copy your messages into the enquiry form.');}}
 return <section id="zuri-conversation" className={`zuri-conversation${compact?' conversation-compact':''}`} aria-label="Start a conversation with ZURI">
 {!compact&&<div className="conversation-intro"><p className="eyebrow">Start with a conversation</p><h2>Tell us the problem.<br/><em>Let’s find the way forward.</em></h2><p>What do you want to build? What is getting in the way? Start in your own words. Ask questions, explore ideas and tell us what you need. Choose a ZURI employee whenever you are ready.</p><div className="conversation-promises"><span>Basic guidance without an account</span><span>One useful question at a time</span><span>A person when you choose</span></div></div>}
 <div className="conversation-window"><header><span className="conversation-avatar">Z</span><div><strong>ZURI {enabled?'AI guide':'project guide'}</strong><span>{enabled===null?'Checking availability…':enabled?'Your questions. A real conversation.':'Guided chat · live AI not connected'}</span></div><button type="button" className="conversation-human" onClick={requestPerson}>Talk to a person ↗</button></header>
 <div className="conversation-log" ref={log} role="log" aria-label="Conversation with ZURI" aria-live="polite"><div className="conversation-message assistant"><span>{enabled?'ZURI AI':'ZURI guide'}</span><p>What would you like to build, fix or make easier?</p></div>{messages.map((m,i)=><div key={i} className={`conversation-message ${m.role}`}><span>{m.role==='user'?'You':enabled?'ZURI AI':'ZURI guide'}</span><p>{m.content}</p>{!!m.sources?.length&&<details><summary>Sources from ZURI</summary>{m.sources.map(s=><p key={s.id}><a href={s.href}>{s.title} ↗</a>{s.availability==='proposed'&&' · Proposed'}</p>)}</details>}</div>)}{busy&&<p role="status" className="conversation-thinking">Thinking it through…</p>}</div>

 {!messages.length&&<div className="conversation-starters">{['I want a website or app','I need better business tools','Help me secure my business','I want a Pamoja presence'].map(s=><button key={s} type="button" onClick={()=>{setInput(s);inputRef.current?.focus();}}>{s} ↗</button>)}</div>}
 {handoffOpen&&<section className="conversation-handoff" aria-label="Talk to a ZURI employee"><div><span>WHEN YOU ARE READY</span><button type="button" aria-label="Close employee handoff" onClick={()=>setHandoffOpen(false)}>×</button></div><h3>Bring a person into the conversation.</h3><p>Review what you want the team to know, then add your contact details. A ZURI employee can follow up after you send the request. This is not a live employee chat.</p><label>What should we know?<textarea value={brief} onChange={e=>setBrief(e.target.value)} maxLength={3200} rows={4}/></label><button type="button" className="conversation-handoff-send" disabled={brief.trim().length<3} onClick={handoff}>Continue to contact details ↗</button><button type="button" className="conversation-handoff-back" onClick={()=>setHandoffOpen(false)}>Keep chatting</button><small>Nothing is sent to an employee until you submit the enquiry.</small></section>}
 <form onSubmit={send} className="conversation-compose"><label className="sr-only" htmlFor="zuri-chat-message">Tell ZURI what you need</label><textarea ref={inputRef} id="zuri-chat-message" value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} rows={2} placeholder="Tell us what you have in mind…"/><button disabled={busy||enabled===null||!input.trim()} type="submit">{busy?'…':'Send ↗'}</button></form>
 {error&&<div className="conversation-error" role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>void reply(pending.current)}>Try again</button></div>}
 <footer>{!enabled&&<a href="/pamoja/login?next=/tech">Sign in for ZURI AI ↗</a>}<a href="/ai-knowledge">What ZURI AI knows ↗</a><a href="/ai-privacy">AI privacy &amp; data use ↗</a><p>{enabled?'Your messages go to OpenAI for AI replies. Choose “Talk to a person” when you want help from the ZURI team.':'Live AI is not connected in this preview. Guided questions stay in this page until you choose to send an enquiry.'} Leave passwords and sensitive information out.</p></footer></div></section>;
}
