'use client';
import {useEffect,useRef,useState} from 'react';
import {validZuriAppHash} from '@/lib/navigation/zuri-app';
export default function ZuriWebApp(){
 const [route,setRoute]=useState<string|null>(null);
 const [welcomeTour]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('tour')==='welcome');
 const frame=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{
  const read=()=>setRoute(validZuriAppHash(window.location.hash)?window.location.hash:'#/lounge');
  const sync=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow||event.data?.type!=='zuri-app-route'||!validZuriAppHash(event.data.hash))return;
   window.history.replaceState(null,'',window.location.pathname+event.data.hash);
  };
  read();window.addEventListener('hashchange',read);
  window.addEventListener('message',sync);
  return()=>{window.removeEventListener('hashchange',read);window.removeEventListener('message',sync)};
 },[]);
 return <main id="main" className="zuri-web-workspace" aria-label="ZURI web app">
  {route?<iframe ref={frame} title="ZURI — Lounge, Aura, Motion, Rizz and Lore" src={`/zuri-app/index.html${welcomeTour?'?tour=welcome':''}${route}`} allow="microphone; camera"/>:<p role="status">Opening your ZURI workspace…</p>}
 </main>;
}
