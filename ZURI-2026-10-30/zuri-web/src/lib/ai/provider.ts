import 'server-only';
import {responseText} from '@/lib/chat/conversation';

export type AIProvider='openai'|'gemini';
export type ProviderConfig={provider:AIProvider;key:string;model:string;inputRate:number;outputRate:number};
export type ProviderPayload={model:string;instructions:string;input:unknown;max_output_tokens:number;store:false;text?:unknown};

export async function openAIResponse(payload:ProviderPayload,key=process.env.OPENAI_API_KEY) {
  if(!key)throw Error('AI provider unavailable.');
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store',
  });
  if(!response.ok)throw Error('AI provider unavailable.');
  const data=await response.json();
  if(data.status!=='completed' || data.output?.some((item:{content?:{type?:string}[]})=>item.content?.some(part=>part.type==='refusal')))throw Error('AI did not complete.');
  const input=data.usage?.input_tokens,output=data.usage?.output_tokens,text=responseText(data);
  if(!text || !Number.isSafeInteger(input) || input<0 || !Number.isSafeInteger(output) || output<0)throw Error('AI usage unavailable.');
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
  const format=objectValue(payload.text),configuration=objectValue(format.format);
  const schema=geminiSchema(configuration.schema);
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(payload.model)}:generateContent`,{
    method:'POST',
    headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:payload.instructions}]},
      contents:[{role:'user',parts:[{text:typeof payload.input==='string'?payload.input:JSON.stringify(payload.input)}]}],
      generationConfig:{maxOutputTokens:payload.max_output_tokens,responseMimeType:'application/json',responseSchema:schema},
    }),
    signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store',
  });
  if(!response.ok)throw Error('AI provider unavailable.');
  const data=await response.json();
  if(data.promptFeedback?.blockReason)throw Error('AI did not complete.');
  const candidate=data.candidates?.[0],finishReason=candidate?.finishReason;
  if(!candidate||finishReason!=='STOP')throw Error('AI did not complete.');
  const text=candidate.content?.parts?.map((part:{text?:string})=>part.text??'').join('').trim();
  const input=data.usageMetadata?.promptTokenCount,candidates=data.usageMetadata?.candidatesTokenCount,thoughts=data.usageMetadata?.thoughtsTokenCount??0;
  if(!text||!Number.isSafeInteger(input)||input<0||!Number.isSafeInteger(candidates)||candidates<0||!Number.isSafeInteger(thoughts)||thoughts<0)throw Error('AI usage unavailable.');
  return {text,inputTokens:input as number,outputTokens:(candidates as number)+(thoughts as number)};
}

export function providerResponse(config:ProviderConfig,payload:ProviderPayload) {
  return config.provider==='gemini'?geminiResponse(payload,config.key):openAIResponse(payload,config.key);
}
