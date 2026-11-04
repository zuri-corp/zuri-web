import {boundary,identity,reply} from '../_shared/auth.ts';
import {edgeBytes,edgeJson,mediaMime,databaseStatus} from '../../../src/lib/backend/edge.ts';
export async function handler(request:Request){
 let headers:Record<string,string>={};
 try{
  headers=boundary(request);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return reply({error:'Use POST.'},405,headers);
  const {user,admin}=await identity(request);
  const type=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if(type!=='application/json'){
   const bytes=await edgeBytes(request,10485760),mime=mediaMime(bytes);
   if(!mime||mime!==type)return reply({error:'Use a supported image, MP4 or PDF matching its file type.'},415,headers);
   const {data:reservation,error:reserveError}=await admin.rpc('zuri_media_operation',{actor:user.id,operation:'reserve',payload:{size:bytes.length,mime}});
   if(reserveError)return reply({error:'Storage allowance or account access unavailable.',code:reserveError.code},databaseStatus(reserveError.code),headers);
   const {error:uploadError}=await admin.storage.from(reservation.bucket).upload(reservation.path,bytes,{contentType:mime,upsert:false});
   // An uncertain write keeps its reservation for operator reconciliation.
   if(uploadError)return reply({error:'Upload was not confirmed. Its storage reservation is held for review.'},503,headers);
   const {data,error}=await admin.rpc('zuri_media_operation',{actor:user.id,operation:'ready',payload:{id:reservation.id}});
   return reply(error?{error:'Upload needs reconciliation.'}:{id:data.id,size:data.size_bytes,mime:data.mime,private:true},error?503:201,headers);
  }
  const body=await edgeJson(request,2000);if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.id)||!['read','delete'].includes(String(body.action)))return reply({error:'Choose your file.'},400,headers);
  const {data:media,error}=await admin.rpc('zuri_media_operation',{actor:user.id,operation:'read',payload:{id:body.id}});
  if(error)return reply({error:'Your available files only.',code:error.code},databaseStatus(error.code),headers);
  if(body.action==='delete'){
   const {error:removeError}=await admin.storage.from(media.bucket).remove([media.path]);if(removeError)return reply({error:'Deletion not confirmed.'},503,headers);
   const {error:markError}=await admin.rpc('zuri_media_operation',{actor:user.id,operation:'removed',payload:{id:media.id}});
   return reply(markError?{error:'File removal needs reconciliation.'}:{deleted:true},markError?503:200,headers);
  }
  const {data:signed,error:signError}=await admin.storage.from(media.bucket).createSignedUrl(media.path,60,{download:true});
  return reply(signError?{error:'Download unavailable.'}:{url:signed.signedUrl,expiresIn:60},signError?503:200,headers);
 }catch(e){const code=e instanceof Error?e.message:'';return reply({error:'Sign in and check the file, origin and request size.'},code==='auth'?401:code==='verified'||code==='origin'?403:code==='size'?413:400,headers);}
}
Deno.serve(handler);
