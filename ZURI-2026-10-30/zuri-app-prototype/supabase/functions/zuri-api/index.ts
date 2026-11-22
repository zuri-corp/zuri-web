import {boundary,identity,publicClient,reply} from '../_shared/auth.ts';
import {edgeJson,databaseStatus} from '../../../src/lib/backend/edge.ts';
import {publicIntake} from '../_shared/intake.ts';
export async function handler(request:Request){
 let headers:Record<string,string>={};
 try{
  headers=boundary(request);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method==='GET'){
   const {data,error}=await publicClient().rpc('zuri_backend_health');return reply(error?{error:'Database unavailable.'}:data,error?503:200,headers);
  }
  if(request.method!=='POST')return reply({error:'Use POST.'},405,headers);
  if(request.headers.get('content-type')?.startsWith('multipart/form-data;'))return await publicIntake(request,headers);
  const body=await edgeJson(request);
  if(body.action==='enquiry.submit')return await publicIntake(request,headers,body.payload);
  const {userClient}=await identity(request);
  if(typeof body.action!=='string'||body.action.length>60)return reply({error:'Choose an operation.'},400,headers);
  const {data,error}=body.action==='profile.save'
   ?await userClient.rpc('zuri_profile_save',{payload:body.payload??{}})
   :await userClient.rpc('zuri_backend',{action:body.action,payload:body.payload??{}});
  if(error){
   if(body.action==='profile.save'&&['PGRST202','42883'].includes(error.code??''))return reply({error:'Shared profile onboarding is not activated yet. Review and apply database proposal 011, then deploy the updated API.'},503,headers);
   return reply({error:'This operation could not be completed. Check permission, current revision and limits.',code:error.code},databaseStatus(error.code),headers);
  }
  return reply({data,persisted:true},200,headers);
 }catch(e){const code=e instanceof Error?e.message:'';const status=({auth:401,verified:403,origin:403,size:413,content:415,json:400} as Record<string,number>)[code]??400;return reply({error:status===401?'Sign in to ZURI.':status===403?'Verified account and permitted origin required.':'Check the request format and size.'},status,headers);}
}
Deno.serve(handler);
