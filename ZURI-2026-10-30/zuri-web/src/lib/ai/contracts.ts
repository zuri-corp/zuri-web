import {intentCatalog, resolveIntent, validateIntentRequest, conversationIntent, type IntentRequest} from '@/lib/intent/engine';
import {validateConversation, type ChatMessage} from '@/lib/chat/conversation';
export type AIMode = 'intent' | 'guide' | 'viola';
export type AIInput = {mode:AIMode; requestId:string; input:IntentRequest | {messages:ChatMessage[];surface:'app'|'website'}};
export function validateAIInput(raw:unknown, forcedMode?:AIMode):AIInput {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Send a valid AI request.');
  const value=raw as Record<string,unknown>;
  if(value.consent!==true) throw Error('Review and approve sending this request to ZURI AI and OpenAI.');
  if(typeof value.requestId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) throw Error('A new request ID is required.');
  const mode=forcedMode??value.mode;
  if(mode!=='intent' && mode!=='guide' && mode!=='viola') throw Error('Choose a supported AI mode.');
  const input=mode==='intent'?validateIntentRequest(value.input):{messages:validateConversation(forcedMode?value:value.input),surface:mode==='guide'?'website' as const:'app' as const};
  // Narrow secret screening, not a general sensitive-data classifier.
  if(/\bsk-(?:proj-)?[a-z0-9_-]{16,}|\b(?:password|api[ _-]?key|secret|otp|recovery code)\s*[:=]\s*\S{4,}|\b(?:\d[ -]?){15,19}\b/i.test(JSON.stringify(input))) throw Error('Remove secrets and payment-card numbers before using AI.');
  return {mode,requestId:value.requestId,input};
}
export const intentOutputSchema={type:'object',additionalProperties:false,properties:{goal:{type:['string','null'],enum:[...intentCatalog.map(item=>item.id),null]},explanation:{type:'string'},question:{type:['string','null']}},required:['goal','explanation','question']};
export const conversationOutputSchema={type:'object',additionalProperties:false,properties:{reply:{type:'string'},intent:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,properties:{goal:{type:['string','null'],enum:[...intentCatalog.map(item=>item.id),null]},sourceIndices:{type:'array',items:{type:'integer',minimum:0,maximum:11},minItems:1,maxItems:4}},required:['goal','sourceIndices']}]}},required:['reply','intent']};
export const websiteConversationSchema={...conversationOutputSchema,properties:{reply:{type:'string'},intent:{type:'null'}}};
export function interpretConversationReply(raw:unknown,messages:ChatMessage[],surface:'app'|'website',allowIntent=true){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid conversation reply.');
  const value=raw as Record<string,unknown>;
  if(Object.keys(value).some(k=>!['reply','intent'].includes(k))||typeof value.reply!=='string'||!value.reply.trim()||value.reply.length>2000||value.intent===undefined)throw Error('Invalid conversation reply.');
  if(!allowIntent&&value.intent!==null)throw Error('Website chat does not open goal-planning flows.');
  const intent=conversationIntent(messages,value.intent as {goal:string|null;sourceIndices:number[]}|null,surface);
  return {reply:value.reply.trim(),intent,execution:false as const};
}
export function interpretAIIntent(raw:unknown, request:IntentRequest) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Invalid intent proposal.');
  const p=raw as Record<string,unknown>;
  if(Object.keys(p).some(k=>!['goal','explanation','question'].includes(k)) || !(p.goal===null || intentCatalog.some(item=>item.id===p.goal)) || typeof p.explanation!=='string' || !p.explanation.trim() || p.explanation.length>800 || !(p.question===null || (typeof p.question==='string' && p.question.trim().length>0 && p.question.length<=300)))throw Error('Invalid intent proposal.');
  const original=resolveIntent(request),goal=request.goal??p.goal;
  // AI cannot overturn a deterministic security boundary or an explicit choice.
  const plan=original.status==='blocked'?original:resolveIntent({...request,...(goal?{goal}: {})});
  if(original.status!=='blocked' && (p.question || !goal)){plan.status='clarify';plan.actions=[];plan.steps=[];plan.question=(p.question as string|null)??'Which supported outcome would you like help with?';}
  return {plan,suggestion:{goal,explanation:p.explanation,question:p.question},execution:false as const};
}
