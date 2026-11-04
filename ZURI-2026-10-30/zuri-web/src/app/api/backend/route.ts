import {createServerSupabaseClient} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/http/origin';
import {limitedBody} from '@/lib/http/body';
import {databaseStatus} from '@/lib/backend/edge';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(){return handle('account.get',{});}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Use the ZURI website.'},403);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({error:'JSON required.'},415);
 let body;try{body=JSON.parse(new TextDecoder().decode(await limitedBody(request,64000)));if(!body||typeof body.action!=='string'||body.action.length>60)throw Error();}catch{return json({error:'Check your operation and request size.'},400);}
 return handle(body.action,body.payload??{});
}
async function handle(action:string,payload:unknown){
 try{
  const client=await createServerSupabaseClient(),{data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return json({error:'Sign in to save with ZURI.',login:'/pamoja/login?next=/app'},401);
  if(!user.email_confirmed_at)return json({error:'Verify your email first.'},403);
  const {data,error}=action==='profile.save'
   ?await client.rpc('zuri_profile_save',{payload})
   :await client.rpc('zuri_backend',{action,payload});
  if(error){
   if(action==='profile.save'&&['PGRST202','42883'].includes(error.code??''))return json({error:'Shared profile onboarding is not activated yet. Review and apply database proposal 011, then deploy the updated API.'},503);
   return json({error:'Check your access, current revision and limits.',code:error.code},databaseStatus(error.code));
  }
  return json({data,persisted:true});
 }catch{return json({error:'The account service is not configured or available yet.'},503);}
}
