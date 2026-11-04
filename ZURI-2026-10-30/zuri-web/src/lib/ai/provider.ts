import 'server-only';
import {responseText} from '@/lib/chat/conversation';
export type ProviderConfig={model:string;inputRate:number;outputRate:number};
export type ProviderPayload={model:string;instructions:string;input:unknown;max_output_tokens:number;store:false;text?:unknown};
export async function openAIResponse(payload:ProviderPayload) {
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store',
  });
  if(!response.ok)throw Error('AI provider unavailable.');
  const data=await response.json();
  if(data.status!=='completed' || data.output?.some((item:{content?:{type?:string}[]})=>item.content?.some(part=>part.type==='refusal')))throw Error('AI did not complete.');
  const input=data.usage?.input_tokens,output=data.usage?.output_tokens,text=responseText(data);
  if(!text || !Number.isSafeInteger(input) || input<0 || !Number.isSafeInteger(output) || output<0)throw Error('AI usage unavailable.');
  return {text,inputTokens:input as number,outputTokens:output as number};
}
