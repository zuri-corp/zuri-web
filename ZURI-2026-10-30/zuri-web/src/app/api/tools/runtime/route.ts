import {createAdminClient} from '@/lib/supabase/admin';
import {studioConfigured,studioJson,studioBody,studioError,digest} from '@/lib/studio/server';
import {runtimeInput,uuid} from '@/lib/studio/model';
import {runToolAI} from '@/lib/studio/gateway';
export async function POST(request:Request){try{
 if(!studioConfigured())return studioError();
 const key=request.headers.get('x-zuri-tool-key')??'',token=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(!/^ztk_[a-f0-9]{64}$/.test(key)||!/^zik_[a-f0-9]{64}$/.test(token))return studioJson({error:'Tool and installation credentials are required.',code:'invalid_credentials'},401);
 let input,id;try{input=runtimeInput(await studioBody(request,false));id=uuid(request.headers.get('idempotency-key'));}catch(error){return studioJson({error:(error as Error).message},400);}
 const args={key_hash:digest(key),install_hash:digest(token),operation:input.operation,input:input.input,request_id:id};
 if(input.operation==='ai.space-answer')return runToolAI(args);
 const {data,error}=await createAdminClient().rpc('zuri_tool_runtime',args);
 return error?studioError(error.code):studioJson({result:data.result});
}catch{return studioError();}}
