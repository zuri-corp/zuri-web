import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {limitedBody} from '@/lib/http/body';
export function studioConfigured(){return process.env.ZURI_STUDIO_ENABLED==='true'&&!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY);}
export const studioJson=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const credential=(prefix:'ztk'|'zik')=>`${prefix}_${randomBytes(32).toString('hex')}`;
export async function studioSession(){
 if(!studioConfigured())return {response:studioJson({error:'Live Studio is not configured. Use the labelled sandbox; no production operation was performed.',code:'studio_unavailable'},503)};
 const auth=await createServerSupabaseClient(),{data:{user},error}=await auth.auth.getUser();
 if(error||!user)return {response:studioJson({error:'Sign in with your existing ZURI account.',login:'/pamoja/login?next=/tech/studio'},401)};
 if(!user.email_confirmed_at)return {response:studioJson({error:'Verify your email before using Studio.'},403)};
 return {userId:user.id,client:createAdminClient()};
}
export async function studioBody(request:Request,sameOrigin=true){
 if(sameOrigin&&request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid request origin.');
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new Error('JSON required.');
 return JSON.parse(new TextDecoder().decode(await limitedBody(request,24000))) as unknown;
}
export function studioError(code?:string){
 const errors:Record<string,[number,string]>={
  '42501':[403,'Authority, approval, verified account or permission is missing.'],
  '23505':[409,'This record or appointment conflicts with an existing one.'],
  '40001':[409,'This request changed or is awaiting reconciliation. Reload before retrying.'],
  '22023':[400,'The operation or its context is invalid.'],
  'P0001':[429,'A usage limit or developer spending cap has been reached.'],
 };
 const [status,error]=errors[code??'']??[503,'Studio storage is unavailable. Verify the staged migration and server configuration.'];
 return studioJson({error,code:code??'studio_unavailable'},status);
}
