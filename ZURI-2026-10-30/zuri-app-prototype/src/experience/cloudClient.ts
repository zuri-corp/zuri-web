import publicConfig from '../data/publicBackend.json';
import {backendEndpoint} from './services';
export type CloudAccountState={user_id:string;profile?:{display_name:string;bio:string;handle:string|null;location:string;avatar_media_id:string|null;avatar_public?:boolean;is_public:boolean;receive_invites:boolean;links:{title:string;url:string}[]};membership?:{plan:string;status:string;valid_until?:string}};
export type CloudRecord={id:string;owner_id:string;revision:number;kind:string;content:Record<string,unknown>;created_at:string;updated_at:string};
export type CloudEntity={created_at?:string;host_name?:string;updated_at:string;invitation_pending?:boolean;id:string;owner_id:string;title:string;description:string;kind:string;status:string;visibility:string;join_policy:string;starts_at?:string;ends_at?:string;capacity?:number;details:Record<string,unknown>};
export type {DirectoryItem} from './cloudModel';
import {normalizeDirectory,type DirectoryItem} from './cloudModel';
const storageKey='zuri-auth-session-v1';
type Session={access_token:string;refresh_token:string;expires_at:number};
let session:Session|null=null,epoch=0;
export class CloudError extends Error{constructor(message:string,public status=0,public code=''){super(message);}}
export const accountEpoch=()=>epoch;
const changed=()=>{epoch++;if(typeof window!=='undefined')window.dispatchEvent(new Event('zuri-account-changed'));};
export function directConfigured(){return !!publicConfig.url&&!!publicConfig.publishableKey;}
export function cloudConfigured(){return !!backendEndpoint()||directConfigured();}
function savedSession(){if(!session){try{const s=JSON.parse((typeof localStorage!=='undefined'?localStorage.getItem(storageKey):null)||sessionStorage.getItem(storageKey)||'null');if(s&&typeof s.access_token==='string'&&typeof s.refresh_token==='string'&&Number.isFinite(s.expires_at)){session=s;localStorage.setItem(storageKey,JSON.stringify(s));sessionStorage.removeItem(storageKey);}}catch{}}return session;}
function keepSession(v:unknown,announce=true){const s=v as Session;if(!s||typeof s.access_token!=='string'||typeof s.refresh_token!=='string')throw new CloudError('Sign-in could not be verified.');session={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+3600};try{localStorage.setItem(storageKey,JSON.stringify(session));sessionStorage.removeItem(storageKey);}catch{try{sessionStorage.setItem(storageKey,JSON.stringify(session));}catch{throw new CloudError('This browser cannot retain the session. Please use the website edition.');}}if(announce)changed();}
export function clearCloudSession(){session=null;try{localStorage.removeItem(storageKey);}catch{}try{sessionStorage.removeItem(storageKey);}catch{}changed();}
async function jsonRequest(url:string,init:RequestInit={}){let response:Response;try{response=await fetch(url,{...init,signal:init.signal||AbortSignal.timeout(20000),cache:'no-store'});}catch{throw new CloudError('ZURI could not be reached. Your draft is still here. Retry when connected.');}if(response.status===204)return {};let result:any;try{result=await response.json();}catch{throw new CloudError('The service returned an unreadable response.',response.status);}if(!response.ok)throw new CloudError(typeof result.error==='string'?result.error:result.msg||'The operation was not confirmed.',response.status,result.code||'');return result;}
let refreshing:Promise<string>|null=null;
if(typeof window!=='undefined'&&typeof window.addEventListener==='function')window.addEventListener('storage',event=>{
 if(event.key!==storageKey)return;
 session=null;
 if(!event.newValue)changed();
});
async function token(){let s=savedSession();if(!s)throw new CloudError('Sign in to your ZURI account.',401);if(s.expires_at*1000<Date.now()+30000){
 if(!refreshing){
  const refresh=async()=>{
   session=null;
   const current=savedSession();
   if(!current)throw new CloudError('Sign in to your ZURI account.',401);
   if(current.expires_at*1000>=Date.now()+30000)return current.access_token;
   const start=epoch;
   const v=await jsonRequest(publicConfig.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:publicConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:current.refresh_token})});
   if(start!==epoch)throw new CloudError('Your account changed. Please try again.');
   keepSession(v,false);return session!.access_token;
  };
  refreshing=(async()=>typeof navigator!=='undefined'&&navigator.locks?await navigator.locks.request(storageKey,refresh):await refresh())().finally(()=>{refreshing=null;});
 }
 return refreshing;
}return s.access_token;}
export async function cloudAccessToken(){return token();}
export async function cloudRequest<T=any>(action:string,payload:unknown={},signal?:AbortSignal):Promise<T>{
 const endpoint=backendEndpoint(),start=epoch;
 try{const result=endpoint?await jsonRequest(endpoint,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal}):directConfigured()?await jsonRequest(publicConfig.url+'/functions/v1/zuri-api',{method:'POST',headers:{apikey:publicConfig.publishableKey,Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal}):(()=>{throw new CloudError('Account services are not configured.');})();
 if(start!==epoch)throw new CloudError('Your account changed. Refresh before continuing.');if(!('data'in result))throw new CloudError('The operation was not confirmed.');if(['profile.save','entities.update','entities.create'].includes(action))signedCache.clear();return result.data as T;
 }catch(e){if(e instanceof CloudError&&e.status===401&&savedSession())clearCloudSession();throw e;}
}
export async function discoverCloud(query:string,signal?:AbortSignal):Promise<DirectoryItem[]>{if(query.trim().length<2)throw Error('Enter at least two characters.');const endpoint=backendEndpoint();const result=endpoint?await jsonRequest(endpoint+'/discover?q='+encodeURIComponent(query.trim()),{credentials:'include',signal}):directConfigured()?await jsonRequest(publicConfig.url+'/rest/v1/rpc/zuri_discover',{method:'POST',headers:{apikey:publicConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({query:query.trim()}),signal}):(()=>{throw Error('Discovery is not configured.');})();const rows=endpoint?result.data:result;return normalizeDirectory(rows);}
function signInEmail(value:string){const email=value.trim();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');return email;}
export async function requestSignIn(value:string){if(backendEndpoint())throw Error('Use the website sign-in link.');if(!directConfigured())throw new CloudError('Account services are not configured.');const email=signInEmail(value);await jsonRequest(publicConfig.url+'/auth/v1/otp',{method:'POST',headers:{apikey:publicConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});}
export async function verifySignIn(value:string,code:string){if(backendEndpoint())throw Error('Use the website sign-in link.');if(!directConfigured())throw new CloudError('Account services are not configured.');const email=signInEmail(value),tokenValue=code.trim();if(!/^\d{8}$/.test(tokenValue))throw new Error('Enter the eight-digit code from your email.');const v=await jsonRequest(publicConfig.url+'/auth/v1/verify',{method:'POST',headers:{apikey:publicConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,token:tokenValue,type:'email'})});if(typeof v.user?.email!=='string'||!v.user.email_confirmed_at)throw new CloudError('That code could not be verified. Check it or request a new one.');keepSession(v);}
export async function signOutCloud(){const endpoint=backendEndpoint();try{if(endpoint){const r=await fetch(endpoint+'/logout',{method:'POST',credentials:'include'});if(!r.ok)throw Error('Server sign-out could not be confirmed.');}else if(savedSession())await jsonRequest(publicConfig.url+'/auth/v1/logout',{method:'POST',headers:{apikey:publicConfig.publishableKey,Authorization:'Bearer '+await token()}});}finally{clearCloudSession();}}
export async function uploadCloud(file:File){const start=epoch;if(file.size>10485760)throw Error('Choose a file under 10 MB.');const endpoint=backendEndpoint();const result=await jsonRequest(endpoint?endpoint+'/media':publicConfig.url+'/functions/v1/zuri-media',{method:'POST',credentials:endpoint?'include':'omit',headers:{'Content-Type':file.type,...(!endpoint?{apikey:publicConfig.publishableKey,Authorization:'Bearer '+await token()}:{})},body:file});if(start!==epoch)throw new CloudError('Your account changed. Refresh before continuing.');return result;}
export async function downloadCloud(id:string){const start=epoch;const endpoint=backendEndpoint();const result=await jsonRequest(endpoint?endpoint+'/media':publicConfig.url+'/functions/v1/zuri-media',{method:'POST',credentials:endpoint?'include':'omit',headers:{'Content-Type':'application/json',...(!endpoint?{apikey:publicConfig.publishableKey,Authorization:'Bearer '+await token()}:{})},body:JSON.stringify({action:'read',id})});if(start!==epoch)throw new CloudError('Your account changed. Refresh before continuing.');const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!==new URL(publicConfig.url).hostname)throw Error('File destination could not be verified.');return url.href;}
export function validRows<T>(value:unknown):T[]{if(!Array.isArray(value))throw Error('The service returned invalid records.');return value as T[];}

export const objectMediaUrl=(id:string)=>scopedMediaUrl(id,'object-media');
export const entityCoverUrl=(id:string)=>scopedMediaUrl(id,'entity-cover');
export const contextMediaUrl=(id:string,kind:string)=>scopedMediaUrl(id,kind);
const signedCache=new Map<string,{until:number;value:Promise<string>}>();
export function scopedMediaUrl(id:string,action:string){const key=epoch+':'+action+':'+id,old=signedCache.get(key);if(old&&old.until>Date.now())return old.value;const value=requestScopedMedia(id,action);if(signedCache.size>500)signedCache.delete(signedCache.keys().next().value!);signedCache.set(key,{until:Date.now()+45000,value});return value;}
async function requestScopedMedia(id:string,action:string){
 const start=epoch,endpoint=backendEndpoint();
 const result=await jsonRequest(endpoint?endpoint+'/media':publicConfig.url+'/functions/v1/zuri-media',{method:'POST',credentials:endpoint?'include':'omit',headers:{'Content-Type':'application/json',...(!endpoint?{apikey:publicConfig.publishableKey,Authorization:'Bearer '+await token()}:{})},body:JSON.stringify({action,id})});
 if(start!==epoch)throw new CloudError('Your account changed.');
 const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!==new URL(publicConfig.url).hostname)throw Error('Cover destination could not be verified.');return url.href;
}

export async function browseEntities(kind:string,query='',before?:CloudEntity):Promise<CloudEntity[]>{return validRows<CloudEntity>(await jsonRequest(publicConfig.url+'/rest/v1/rpc/zuri_browse_entities',{method:'POST',credentials:'omit',headers:{apikey:publicConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({entity_kind:kind,query,...(before?{before_at:before.created_at||before.updated_at,before_id:before.id}:{})})}));}
