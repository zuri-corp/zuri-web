import 'server-only';
import {responseText} from '@/lib/chat/conversation';

export type AIProvider='openai'|'gemini';
export type ProviderConfig={provider:AIProvider;key:string;model:string;inputRate:number;outputRate:number};
export type ProviderPayload={model:string;instructions:string;input:unknown;max_output_tokens:number;store:false;text?:unknown};
export type ProviderFailureCategory='provider_http_error'|'provider_timeout'|'provider_network_error'|'provider_incomplete'|'provider_blocked'|'provider_finish_reason'|'provider_usage_unavailable'|'provider_response_invalid'|'provider_schema_invalid';
export class ProviderFailure extends Error {
  constructor(
    readonly category:ProviderFailureCategory,
    readonly httpStatus?:number,
    readonly finishReason?:string,
  ){super(category);}
}

async function providerFetch(url:string,init:RequestInit) {
  try{return await fetch(url,init);}
  catch(error){
    const name=error instanceof Error?error.name:'';
    throw new ProviderFailure(name==='TimeoutError'||name==='AbortError'?'provider_timeout':'provider_network_error');
  }
}

async function providerJson(response:Response) {
  let data;
  try{data=await response.json();}
  catch{throw new ProviderFailure('provider_response_invalid',response.status);}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new ProviderFailure('provider_response_invalid',response.status);
  return data;
}

export async function openAIResponse(payload:ProviderPayload,key=process.env.OPENAI_API_KEY) {
  if(!key)throw Error('AI provider unavailable.');
  const response=await providerFetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store',
  });
  if(!response.ok)throw new ProviderFailure('provider_http_error',response.status);
  const data=await providerJson(response);
  if(data.output!==undefined&&(!Array.isArray(data.output)||data.output.some((item:unknown)=>{
    if(!item||typeof item!=='object'||Array.isArray(item))return true;
    const content=(item as Record<string,unknown>).content;
    return content!==undefined&&(!Array.isArray(content)||content.some((part:unknown)=>!part||typeof part!=='object'||Array.isArray(part)));
  })))throw new ProviderFailure('provider_response_invalid',response.status);
  if(data.status!=='completed')throw new ProviderFailure('provider_incomplete');
  if(data.output?.some((item:{content?:{type?:string}[]})=>item.content?.some(part=>part.type==='refusal')))throw new ProviderFailure('provider_blocked');
  const input=data.usage?.input_tokens,output=data.usage?.output_tokens,text=responseText(data);
  if(!text || !Number.isSafeInteger(input) || input<0 || !Number.isSafeInteger(output) || output<0)throw new ProviderFailure('provider_usage_unavailable');
  return {text,inputTokens:input as number,outputTokens:output as number};
}

function objectValue(value:unknown):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid Gemini response schema.');
  return value as Record<string,unknown>;
}

function geminiSchema(value:unknown):Record<string,unknown> {
  const schema=objectValue(value);
  let type=schema.type,nullable=false;
  if(Array.isArray(type)){
    const types=type.filter((item):item is string=>typeof item==='string');
    nullable=types.includes('null');
    type=types.find(item=>item!=='null');
  }
  if(schema.anyOf!==undefined){
    if(!Array.isArray(schema.anyOf))throw Error('Invalid Gemini response schema.');
    const branches=schema.anyOf.map(objectValue),nonNull=branches.filter(branch=>branch.type!=='null');
    if(nonNull.length!==1||branches.length!==2)throw Error('Unsupported Gemini response schema.');
    nullable=true;
    return {...geminiSchema(nonNull[0]),nullable:true};
  }
  if(type==='null')return {type:'STRING',nullable:true};
  if(typeof type!=='string')throw Error('Invalid Gemini response schema.');
  const result:Record<string,unknown>={type:type.toUpperCase()};
  if(nullable)result.nullable=true;
  for(const key of ['description','format','enum','minimum','maximum','minItems','maxItems'] as const){
    const item=schema[key];
    if(item!==undefined)result[key]=key==='enum'&&Array.isArray(item)?item.filter(entry=>entry!==null):item;
  }
  if(Array.isArray(schema.required))result.required=schema.required;
  if(schema.properties!==undefined){
    const properties=objectValue(schema.properties);
    result.properties=Object.fromEntries(Object.entries(properties).map(([key,item])=>[key,geminiSchema(item)]));
  }
  if(schema.items!==undefined)result.items=geminiSchema(schema.items);
  return result;
}

export async function geminiResponse(payload:ProviderPayload,key:string) {
  let schema:Record<string,unknown>;
  try{
    const format=objectValue(payload.text),configuration=objectValue(format.format);
    schema=geminiSchema(configuration.schema);
  }catch{throw new ProviderFailure('provider_schema_invalid');}
  const response=await providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(payload.model)}:generateContent`,{
    method:'POST',
    headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:payload.instructions}]},
      contents:[{role:'user',parts:[{text:typeof payload.input==='string'?payload.input:JSON.stringify(payload.input)}]}],
      generationConfig:{maxOutputTokens:payload.max_output_tokens,responseMimeType:'application/json',responseSchema:schema},
    }),
    signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store',
  });
  if(!response.ok)throw new ProviderFailure('provider_http_error',response.status);
  const data=await providerJson(response);
  if(data.promptFeedback?.blockReason)throw new ProviderFailure('provider_blocked');
  const candidate=data.candidates?.[0],finishReason=candidate?.finishReason;
  if(!candidate)throw new ProviderFailure('provider_incomplete');
  if(finishReason!=='STOP'){
    const safeReason=typeof finishReason==='string'&&['MAX_TOKENS','SAFETY','RECITATION','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MALFORMED_FUNCTION_CALL','IMAGE_SAFETY','UNEXPECTED_TOOL_CALL','NO_IMAGE'].includes(finishReason)?finishReason:'OTHER';
    throw new ProviderFailure('provider_finish_reason',undefined,safeReason);
  }
  const parts=candidate.content?.parts;
  const text=Array.isArray(parts)?parts.map((part:{text?:string}|null)=>typeof part?.text==='string'?part.text:'').join('').trim():'';
  const input=data.usageMetadata?.promptTokenCount,candidates=data.usageMetadata?.candidatesTokenCount,thoughts=data.usageMetadata?.thoughtsTokenCount??0;
  if(!text||!Number.isSafeInteger(input)||input<0||!Number.isSafeInteger(candidates)||candidates<0||!Number.isSafeInteger(thoughts)||thoughts<0)throw new ProviderFailure('provider_usage_unavailable');
  const outputTokens=(candidates as number)+(thoughts as number);
  if(!Number.isSafeInteger(outputTokens))throw new ProviderFailure('provider_usage_unavailable');
  return {text,inputTokens:input as number,outputTokens};
}

export function providerResponse(config:ProviderConfig,payload:ProviderPayload) {
  return config.provider==='gemini'?geminiResponse(payload,config.key):openAIResponse(payload,config.key);
}
