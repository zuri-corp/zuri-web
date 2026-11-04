'use client';
import {useEffect,useRef,useState} from 'react';
import {intentCatalog,type IntentRequest} from '@/lib/intent/engine';

export default function GoalAI({request,onUse}:{request:IntentRequest;onUse:(goal:string)=>void}){
  const [expanded,setExpanded]=useState(false);
  const [status,setStatus]=useState<{enabled:boolean;reason?:string;login?:string}|null>(null),[approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{goal:string|null;explanation:string;question:string|null}|null>(null);
  const requestId=useRef('');
  useEffect(()=>{if(!expanded)return;const controller=new AbortController();fetch('/api/ai',{cache:'no-store',signal:controller.signal}).then(r=>r.json()).then(setStatus).catch(()=>{if(!controller.signal.aborted)setStatus({enabled:false,reason:'AI could not connect. You can still use on-device planning.'});});return()=>controller.abort();},[expanded]);
  async function ask(){
    if(!approved||busy||!status?.enabled)return;
    setBusy(true);setError('');requestId.current ||= crypto.randomUUID();
    try{const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'intent',requestId:requestId.current,consent:true,input:request}),signal:AbortSignal.timeout(55000)}),body=await response.json();
      if(!response.ok)throw Error(body.error||'AI could not finish.');
      const suggestion=body.suggestion;
      if(!suggestion||typeof suggestion.explanation!=='string'||!(suggestion.goal===null||intentCatalog.some(g=>g.id===suggestion.goal)))throw Error('AI did not return a supported direction.');
      setResult(suggestion);
    }catch(e){setError(e instanceof Error?e.message:'AI could not connect.');}finally{setBusy(false);}
  }
  return <details className="intent-ai" onToggle={e=>setExpanded(e.currentTarget.open)}><summary>✦ A little help from ZURI AI</summary><p><a href="/ai-privacy" target="_top">AI privacy &amp; data use ↗</a></p><p>Ask Viola to interpret your goal. You choose whether to use the suggested direction.</p>{status===null?<p role="status">Checking AI availability…</p>:!status.enabled?<p>{status.reason} {status.login&&<a href="/pamoja/login?next=/intent">Sign in ↗</a>}</p>:<><p>Only the goal and details below will be sent to OpenAI. No private workspace information is attached. Your account’s AI allowance applies.</p><blockquote><p>{request.text}</p>{Object.entries(request.details).map(([key,value])=><p key={key}>{key}: {value}</p>)}</blockquote><label className="intent-ai-consent"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>I approve sending these details to ZURI AI and OpenAI.</label><button type="button" className="intent-primary" disabled={!approved||busy||!!result} onClick={()=>void ask()}>{busy?'Understanding your goal…':'Ask ZURI AI ↗'}</button></>}{error&&<p role="alert">{error}</p>}{result&&<div aria-live="polite"><strong>Viola · AI suggestion</strong><p>{result.explanation}</p>{result.question&&<p>{result.question}</p>}{result.goal&&!result.question&&<button type="button" className="intent-primary" onClick={()=>onUse(result.goal!)}>Review this direction ↗</button>}<small>A suggestion does not save a goal or perform an action.</small></div>}</details>;
}
