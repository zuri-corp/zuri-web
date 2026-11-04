import 'server-only';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import type {AIInput,AIMode} from './contracts';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
/** Forward a verified user's reviewed request, never a server secret or private record. */
export async function edgeAI(mode:AIMode,input?:AIInput){
 try{
  const auth=await createServerSupabaseClient(),{data:{user},error}=await auth.auth.getUser();
  if(error||!user?.email_confirmed_at)return input?json({error:'Sign in with a verified ZURI account.',code:'sign_in_required'},401):json({enabled:false,reason:'Sign in and verify your ZURI account to use AI.',login:'/pamoja/login',execution:false});
  const {data:{session}}=await auth.auth.getSession();if(!session)return json({error:'Sign in again.'},401);
  const project=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!project||!key)return json({error:'AI connection unavailable.'},503);
  const response=await fetch(`${project.replace(/\/$/,'')}/functions/v1/zuri-ai?mode=${mode}`,{method:input?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,apikey:key,...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify({...input,consent:true})}:{}),redirect:'error',signal:AbortSignal.timeout(55000),cache:'no-store'});
  return json(await response.json(),response.status);
 }catch{return input?json({error:'AI could not be reached. Do not repeatedly resubmit an uncertain request.',code:'ai_unavailable'},503):json({enabled:false,reason:'AI is temporarily unavailable.',execution:false});}
}
