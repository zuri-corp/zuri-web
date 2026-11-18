import {boundary,identity,reply} from '../_shared/auth.ts';
import {edgeJson,databaseStatus} from '../../../src/lib/backend/edge.ts';

const inputRate=125000;
const outputRate=15000000;
const imageTokens=1120;
const allowedRatios=new Set(['1:1','4:5','9:16','16:9']);

function text(value:unknown,limit:number){return typeof value==='string'?value.trim().slice(0,limit):'';}

export async function handler(request:Request){
 let headers:Record<string,string>={};
 try{
  headers=boundary(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Use POST.'},405,headers);
  const {user,admin}=await identity(request);
  if(Deno.env.get('ZURI_IMAGE_ENABLED')!=='true')return reply({error:'Poster generation is not enabled.'},503,headers);
  const key=Deno.env.get('GEMINI_API_KEY'),model=Deno.env.get('ZURI_IMAGE_MODEL')||'gemini-3.1-flash-image';
  if(!key||!/^gemini-[a-z0-9._-]{1,90}$/i.test(model))return reply({error:'Poster generation is unavailable.'},503,headers);
  const body=await edgeJson(request,1800);
  const prompt=text(body.prompt,1200),requestId=text(body.requestId,36),aspectRatio=text(body.aspectRatio,5);
  if(!prompt||!/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(requestId)||!allowedRatios.has(aspectRatio))return reply({error:'Review the poster details and try again.'},400,headers);
  const promptBytes=new TextEncoder().encode(prompt).byteLength;
  const reserved=Math.ceil((promptBytes*inputRate+imageTokens*outputRate)/1000000);
  const fingerprint=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({prompt,model,aspectRatio})));
  const hash=[...new Uint8Array(fingerprint)].map(value=>value.toString(16).padStart(2,'0')).join('');
  const {data:hold,error:holdError}=await admin.rpc('zuri_ai_reserve',{actor:user.id,request_id:requestId,fingerprint:hash,mode:'viola',model,reserved_micros:reserved,input_rate:inputRate,output_rate:outputRate});
  if(holdError||!hold?.reserved)return reply({error:holdError?.code==='P0001'?'Your AI allowance is unavailable for another poster right now.':'This poster request could not be reserved.',code:holdError?.code},databaseStatus(holdError?.code),headers);
  const provider=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['IMAGE'],responseFormat:{image:{aspectRatio,imageSize:'1K'}}}}),signal:AbortSignal.timeout(55000)});
  if(!provider.ok)return reply({error:'The image model could not make this poster. Your request is held for review.'},503,headers);
  const result=await provider.json();
  const part=result?.candidates?.[0]?.content?.parts?.find((item:unknown)=>typeof item==='object'&&item&&'inlineData' in item)?.inlineData;
  const data=typeof part?.data==='string'?part.data:'';
  const mime=part?.mimeType==='image/jpeg'||part?.mimeType==='image/webp'?part.mimeType:'image/png';
  const usage=result?.usageMetadata;
  const inputs=Number.isInteger(usage?.promptTokenCount)?usage.promptTokenCount:Math.ceil(promptBytes/4);
  const outputs=Number.isInteger(usage?.candidatesTokenCount)?usage.candidatesTokenCount:imageTokens;
  if(!data||inputs<0||inputs>1000000||outputs<0||outputs>1600)return reply({error:'The image reply was incomplete. Your request is held for review.'},503,headers);
  const actual=Math.ceil((inputs*inputRate+outputs*outputRate)/1000000);
  const {data:settled,error:settleError}=await admin.rpc('zuri_ai_settle',{actor:user.id,request_id:requestId,input_tokens:inputs,output_tokens:outputs,actual_micros:actual});
  if(settleError||!settled?.settled)return reply({error:'Poster usage could not be confirmed. Your request is held for review.'},503,headers);
  return reply({image:{data,mime},usage:{estimatedCostMicros:actual}},200,headers);
 }catch(error){const code=error instanceof Error?error.message:'';return reply({error:code==='auth'?'Sign in to make a poster.':'Poster generation could not be completed.'},code==='auth'?401:code==='verified'||code==='origin'?403:code==='size'?413:400,headers);}
}
Deno.serve(handler);
