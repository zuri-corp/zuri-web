import {studioSession,studioConfigured,studioJson,studioBody,studioError,credential,digest} from '@/lib/studio/server';
import {studioMutation} from '@/lib/studio/model';
export async function GET(){try{
 if(!studioConfigured())return studioJson({configured:false,reason:'Live Studio needs its staged database migration and server configuration.'});
 const access=await studioSession();if('response'in access)return access.response;
 const {data,error}=await access.client.rpc('zuri_studio_manage',{actor:access.userId,action:'snapshot',payload:{}});
 return error?studioError(error.code):studioJson({configured:true,state:data});
}catch{return studioError();}}
export async function POST(request:Request){try{
 const access=await studioSession();if('response'in access)return access.response;
 let change;try{change=studioMutation(await studioBody(request));}catch(error){return studioJson({error:(error as Error).message},400);}
 let secret:string|undefined;
 if(change.action==='issue-key'){secret=credential('ztk');change.payload.keyHash=digest(secret);}
 if(change.action==='install'){secret=credential('zik');change.payload.tokenHash=digest(secret);}
 const {data,error}=await access.client.rpc('zuri_studio_manage',{actor:access.userId,...change});
 return error?studioError(error.code):studioJson({result:data,...(secret?{secret,notice:'Shown once. Store in your server secret manager. Never send it to a browser or commit it.'}:{})});
}catch{return studioError();}}
