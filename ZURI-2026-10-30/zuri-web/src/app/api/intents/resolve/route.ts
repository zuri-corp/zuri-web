import {resolveIntent,ENGINE_VERSION,intentCatalog} from '@/lib/intent/engine';
import {limitedBody} from '@/lib/http/body';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
function allowedOrigin(request:Request){
 const origin=request.headers.get('origin');if(!origin)return true;
 try{
  const url=new URL(request.url),host=request.headers.get('host');
  // Next's local server may normalize request.url to localhost. The browser's
  // Host header identifies the actual public origin; do not trust forwarded hosts.
  if(host){if(!/^(?:\[[a-f0-9:.]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(host))return false;url.host=new URL(`${url.protocol}//${host}`).host;}
  return origin===url.origin;
 }catch{return false;}
}
export async function GET(){return json({engineVersion:ENGINE_VERSION,mode:'deterministic-planning',execution:false,goals:intentCatalog});}
/** Stateless planning only. No user lookup, private-context retrieval, provider
 * call, database mutation, Tool invocation, payment or authority grant. */
export async function POST(request:Request){
 if(!allowedOrigin(request))return json({error:'Use the ZURI origin or a trusted server-side client.'},403);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({error:'JSON required.'},415);
 try{const bytes=await limitedBody(request,8000),input=JSON.parse(new TextDecoder().decode(bytes));return json({plan:resolveIntent(input),execution:false});}
 catch(error){return json({error:(error as Error).message},400);}
}
