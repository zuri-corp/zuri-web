import {createAdminClient} from '@/lib/supabase/admin';
import {connection} from 'next/server';
import {studioConfigured,studioJson,studioError} from '@/lib/studio/server';
export async function GET(){try{
 await connection();
 if(!studioConfigured())return studioJson({available:false,tools:[]});
 const {data,error}=await createAdminClient().rpc('zuri_studio_manage',{actor:null,action:'catalog',payload:{}});
 return error?studioError(error.code):studioJson({available:true,tools:data});
}catch{return studioError();}}
