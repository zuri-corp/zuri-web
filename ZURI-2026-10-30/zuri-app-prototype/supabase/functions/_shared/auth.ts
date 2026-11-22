import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {corsHeaders} from '../../../src/lib/backend/edge.ts';
export {createClient};
export const env=(name:string)=>Deno.env.get(name);
export function reply(value:unknown,status=200,headers:Record<string,string>={}){return Response.json(value,{status,headers});}
export function boundary(request:Request){return corsHeaders(request,env);}
export function publicClient(){return createClient(env('SUPABASE_URL')!,env('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function identity(request:Request){
 const authorization=request.headers.get('authorization');if(!authorization?.startsWith('Bearer '))throw Error('auth');
 const userClient=createClient(env('SUPABASE_URL')!,env('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await userClient.auth.getUser(authorization.slice(7));
 if(error||!user)throw Error('auth');if(!user.email_confirmed_at)throw Error('verified');
 return {user,userClient,admin:createClient(env('SUPABASE_URL')!,env('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})};
}
