import 'server-only';import {limitedBody} from '@/lib/http/body';
export async function edgeIntake(request:Request,profile=false){
 const headers={'Cache-Control':'no-store'};const json=(value:unknown,status:number)=>Response.json(value,{status,headers});
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return json({error:'Delivery is not configured.'},503);
  const bytes=await limitedBody(request,profile?7*1024*1024:12000);
  const body=profile?bytes:JSON.stringify({action:'enquiry.submit',payload:JSON.parse(new TextDecoder().decode(bytes))});
  const response=await fetch(`${url.replace(/\/$/,'')}/functions/v1/zuri-api`,{method:'POST',headers:{apikey:key,'Content-Type':profile?request.headers.get('content-type')!:'application/json',...(request.headers.get('origin')?{Origin:request.headers.get('origin')!}:{})},body:body as BodyInit,redirect:'error',signal:AbortSignal.timeout(45000),cache:'no-store'});
  return json(await response.json(),response.status);
 }catch{return json({error:'Delivery was not confirmed. Keep your form details before trying again.'},503);}
}
