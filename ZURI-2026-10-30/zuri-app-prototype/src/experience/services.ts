import {sourceLinks,type KnowledgeSource} from '../core/knowledge';
import {reviewedAIMessages,matchesAIReview} from '../core/privacy';
import {readConversationIntent,type ConversationIntent} from '../core/intents';
/** Only a public API location belongs in the client. Provider keys stay on a server. */
export function resolveApiBase(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const base = value.trim().replace(/\/$/, '');
  if (/^\/(?!\/)/.test(base)) return base;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return base;
  } catch { /* A missing or invalid service does not disable the local workspace. */ }
  return null;
}
const apiBase = resolveApiBase(import.meta.env?.VITE_ZURI_API_BASE);
export function backendEndpoint(){return apiBase?`${apiBase}/backend`:null;}
export function opportunityEndpoint(){return apiBase?`${apiBase}/opportunities`:null;}
let lastReviewedAI={json:"",id:""};
export function intentGatewayUrl(){return apiBase?`${apiBase}/ai`:null;}
export function violaDestination(){return apiBase?apiBase+'/viola':'No AI service configured';}
export async function getViolaStatus(signal?: AbortSignal): Promise<{enabled:boolean;reason?:string}> {
  if (!apiBase) return {enabled:false};
  const response = await fetch(`${apiBase}/viola`, {signal, credentials:'include', headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error('The app service is unavailable.');
  const value = await response.json();
  return {enabled:value.enabled === true,reason:typeof value.reason==="string"?value.reason:undefined};
}
export async function askViola(messages: {role:'user'|'assistant'; content:string}[],approvedJson?:string): Promise<{reply:string;intent:ConversationIntent|null;sources:KnowledgeSource[]}> {
  if (!apiBase) throw new Error('Live Viola is not connected to this app yet.');
  if(!approvedJson||!matchesAIReview(messages,approvedJson))throw Error('Review the exact conversation before sending.');
  messages=reviewedAIMessages(messages);
  const json=JSON.stringify(messages);if(lastReviewedAI.json!==json)lastReviewedAI={json,id:crypto.randomUUID()};
  const response = await fetch(`${apiBase}/viola`, {method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages,consent:true,requestId:lastReviewedAI.id}), signal:AbortSignal.timeout(50000)});
  const value = await response.json();
  if (!response.ok || typeof value.reply !== 'string' || !value.reply.trim()) throw new Error(typeof value.error === 'string' ? value.error : 'Viola could not finish. Please retry.');
  return {reply:value.reply,intent:readConversationIntent(value.intent,messages,'app'),sources:sourceLinks(value.sources)};
}

