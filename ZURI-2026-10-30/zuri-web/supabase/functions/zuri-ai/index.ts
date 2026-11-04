import {boundary,identity,reply} from '../_shared/auth.ts';
import {aiRequest,aiStatus} from '../../generated/ai-gateway.ts';
export async function handler(request:Request){
 let headers:Record<string,string>={};
 try{
  headers=boundary(request);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return reply({error:'Use GET or POST.'},405,headers);
  const {user,admin}=await identity(request);
  const chosen=new URL(request.url).searchParams.get('mode');const mode=chosen==='intent'||chosen==='guide'?chosen:'viola';
  const response=request.method==='GET'?await aiStatus(mode,user.id,admin):await aiRequest(request,undefined,user.id,admin);
  const merged=new Headers(response.headers);for(const [key,value]of Object.entries(headers))merged.set(key,value);
  return new Response(response.body,{status:response.status,headers:merged});
 }catch(e){const code=e instanceof Error?e.message:'';return reply({error:code==='auth'?'Sign in to ZURI.':'Verified account and permitted origin required.',execution:false},code==='auth'?401:403,headers);}
}
Deno.serve(handler);
