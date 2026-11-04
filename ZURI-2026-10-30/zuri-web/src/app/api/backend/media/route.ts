import {createServerSupabaseClient} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/http/origin';
import {limitedBody} from '@/lib/http/body';
const json=(value:unknown,status:number)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Use the ZURI website.'},403);
 try{
  const client=await createServerSupabaseClient(),{data:{user},error}=await client.auth.getUser();if(error||!user?.email_confirmed_at)return json({error:'Sign in with a verified account.'},401);
  const {data:{session}}=await client.auth.getSession();if(!session)return json({error:'Sign in again.'},401);
  let body;try{body=await limitedBody(request,10485760);}catch{return json({error:'Files must be 10 MB or smaller.'},413);}
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url)return json({error:'Storage is not configured.'},503);
  const response=await fetch(`${url.replace(/\/$/,'')}/functions/v1/zuri-media`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,'Content-Type':request.headers.get('content-type')??'application/octet-stream'},body:body as BodyInit,signal:AbortSignal.timeout(45000),redirect:'error',cache:'no-store'});
  return json(await response.json(),response.status);
 }catch{return json({error:'The private file service is unavailable.'},503);}
}
