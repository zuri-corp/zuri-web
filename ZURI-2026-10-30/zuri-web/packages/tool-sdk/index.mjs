import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
export {validateManifest,capabilities,bookingManifest} from './manifest.mjs';
export class ZuriToolError extends Error{constructor(message,status,code){super(message);this.name='ZuriToolError';this.status=status;this.code=code;}}
/** Server-side only. Store both credentials in a secret manager, never a browser. */
export function createZuriToolClient({baseUrl,toolKey,installationToken,fetch:transport=globalThis.fetch}){
 const base=new URL(baseUrl);
 if(base.username||base.password||base.search||base.hash||(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname))))throw Error('Use an HTTPS ZURI origin (loopback HTTP is allowed for development).');
 if(!/^ztk_[a-f0-9]{64}$/.test(toolKey)||!/^zik_[a-f0-9]{64}$/.test(installationToken))throw Error('Tool and installation credentials are required.');
 async function run(operation,input={},options={}){
  const response=await transport(new URL('/api/tools/runtime',base),{method:'POST',redirect:'error',signal:options.signal??AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','X-Zuri-Tool-Key':toolKey,'Authorization':`Bearer ${installationToken}`,'Idempotency-Key':options.idempotencyKey??randomUUID()},body:JSON.stringify({operation,input})});
  let body;try{body=await response.json();}catch{throw new ZuriToolError('ZURI returned an unreadable response. Reuse your idempotency key when checking an uncertain write.',response.status,'invalid_response');}
  if(!response.ok)throw new ZuriToolError(body.error||'Tool operation failed.',response.status,body.code||'request_failed');
  return body.result;
 }
 return {intents:{async resolve(input,options={}){
  const response=await transport(new URL('/api/intents/resolve',base),{method:'POST',redirect:'error',signal:options.signal??AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const body=await response.json();if(!response.ok||!body.plan)throw new ZuriToolError(body.error||'Intent planning failed.',response.status,'intent_invalid');return body.plan;
 }},space:{get:()=>run('space.read')},bookings:{list:()=>run('bookings.read'),create:(input,options)=>run('bookings.create',input,options),update:(id,status,options)=>run('bookings.manage',{id,status},options)},ai:{answer:(question,options)=>run('ai.space-answer',{question},options)}};
}
/** Caller must persist eventId atomically before acting; signature checks alone do not prevent replay. */
export function verifyZuriWebhook({rawBody,signature,timestamp,eventId,secret,now=Date.now()}){
 if(typeof rawBody!=='string'||typeof secret!=='string'||secret.length<32||typeof eventId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(eventId)||!/^\d{10}$/.test(String(timestamp))||Math.abs(now/1000-Number(timestamp))>300||!/^sha256=[a-f0-9]{64}$/.test(signature||''))return false;
 const expected=createHmac('sha256',secret).update(`${timestamp}.${eventId}.${rawBody}`).digest();
 return timingSafeEqual(expected,Buffer.from(signature.slice(7),'hex'));
}
