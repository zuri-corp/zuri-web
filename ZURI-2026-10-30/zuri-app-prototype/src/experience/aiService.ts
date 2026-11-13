import {sourceLinks,type KnowledgeSource} from '../core/knowledge';
import {reviewedAIMessages,matchesAIReview} from '../core/privacy';
import {readConversationIntent,type ConversationIntent} from '../core/intents';
import publicConfig from '../data/publicBackend.json';
import {cloudAccessToken,directConfigured} from './cloudClient';
import {backendEndpoint} from './services';

type AIMode='viola'|'intent';
const apiBase=backendEndpoint();
const directAIUrl=`${publicConfig.url}/functions/v1/zuri-ai`;
let lastReviewedAI={json:"",id:""};

export function intentGatewayUrl(){return apiBase?`${apiBase}/ai`:`${directAIUrl}?mode=intent`;}
export function violaDestination(){return apiBase?apiBase+'/viola':`${publicConfig.url}/functions/v1/zuri-ai`;}

export async function requestAI(mode:AIMode,init:RequestInit={}){
  if(!apiBase&&!directConfigured())throw Error('Live Viola is not connected to this app yet.');
  const headers=new Headers(init.headers);
  if(!apiBase){
    headers.set('apikey',publicConfig.publishableKey);
    headers.set('Authorization',`Bearer ${await cloudAccessToken()}`);
  }
  if(init.body)headers.set('Content-Type','application/json');
  const url=apiBase?(mode==='viola'?`${apiBase}/viola`:`${apiBase}/ai?mode=${mode}`):`${directAIUrl}?mode=${mode}`;
  const response=await fetch(url,{...init,headers,credentials:apiBase?'include':'omit',cache:'no-store'});
  const value=await response.json();
  return {response,value};
}

export async function getViolaStatus(signal?:AbortSignal):Promise<{enabled:boolean;reason?:string}>{
  const {response,value}=await requestAI('viola',{method:'GET',headers:{Accept:'application/json'},signal});
  if(!response.ok)throw Error(typeof value.error==='string'?value.error:'The app service is unavailable.');
  return {enabled:value.enabled===true,reason:typeof value.reason==='string'?value.reason:undefined};
}

export async function askViola(messages:{role:'user'|'assistant';content:string}[],approvedJson?:string):Promise<{reply:string;intent:ConversationIntent|null;sources:KnowledgeSource[]}>{
  if(!approvedJson||!matchesAIReview(messages,approvedJson))throw Error('Review the exact conversation before sending.');
  messages=reviewedAIMessages(messages);
  const json=JSON.stringify(messages);
  if(lastReviewedAI.json!==json)lastReviewedAI={json,id:crypto.randomUUID()};
  const {response,value}=await requestAI('viola',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,consent:true,requestId:lastReviewedAI.id}),signal:AbortSignal.timeout(50000)});
  if(!response.ok||typeof value.reply!=='string'||!value.reply.trim())throw Error(typeof value.error==='string'?value.error:'Viola could not finish. Please retry.');
  return {reply:value.reply,intent:readConversationIntent(value.intent,messages,'app'),sources:sourceLinks(value.sources)};
}

export async function getIntentAIStatus(signal?:AbortSignal):Promise<{enabled:boolean;reason?:string;login?:string}>{
  const {response,value}=await requestAI('intent',{method:'GET',headers:{Accept:'application/json'},signal});
  if(!response.ok)throw Error(typeof value.error==='string'?value.error:'The AI service is unavailable.');
  return value;
}

export async function askIntentAI(input:unknown,requestId:string){
  return requestAI('intent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'intent',requestId,consent:true,input}),signal:AbortSignal.timeout(55000)});
}
