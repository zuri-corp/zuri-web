import test,{beforeEach,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const savedDeno=globalThis.Deno,savedFactory=globalThis.__zuriEdgeClient;
const state={calls:[],user:true,verified:true,error:null,uploadError:null};
const settings={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-anon',SUPABASE_SERVICE_ROLE_KEY:'test-service',ZURI_ALLOWED_ORIGINS:'https://zuri.example.test'};
globalThis.Deno={env:{get:name=>settings[name]},serve:()=>{}};
globalThis.__zuriEdgeClient=(_url,key,options={})=>({
 auth:{getUser:async token=>({data:{user:state.user&&token==='valid-token'?{id:'canonical-user',email_confirmed_at:state.verified?'2026-01-01':null}:null},error:null})},
 rpc:async(name,args)=>{state.calls.push({key,name,args,authorization:options.global?.headers.Authorization});if(state.error)return {error:state.error};if(name==='zuri_backend_health')return {data:{database:true,schema:'zuri-backend-009'}};if(name==='zuri_intake_reserve')return {data:'550e8400-e29b-41d4-a716-446655440000'};if(name==='zuri_media_operation')return {data:{id:args.payload.id??'media-id',bucket:'zuri-private',path:'canonical-user/file.png',size_bytes:8,mime:'image/png'}};return {data:{user_id:'canonical-user'}};},
 from:table=>({insert:async value=>{state.calls.push({insert:table,value,key});return {error:state.error};}}),
 storage:{getBucket:async()=>({data:{public:false},error:null}),from:bucket=>({upload:async(path,bytes,options)=>{state.calls.push({upload:true,bucket,path,size:bytes.length,options});return {error:state.uploadError};},remove:async paths=>{state.calls.push({remove:paths});return {error:null};},createSignedUrl:async(path,seconds,options)=>{state.calls.push({sign:path,seconds,options});return {data:{signedUrl:'https://example.supabase.co/storage/v1/object/sign/private-file'}};}})}
});
const handlers={};for(const name of ['zuri-api','zuri-media','zuri-ai']){let source=await readFile(new URL('../supabase/deploy/'+name+'.ts',import.meta.url),'utf8');source=source.replace('import { createClient } from "npm:@supabase/supabase-js@2.117.3";','const createClient=globalThis.__zuriEdgeClient;');handlers[name]=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).handler;}
const oldEnabled=process.env.ZURI_AI_ENABLED;process.env.ZURI_AI_ENABLED='false';
after(()=>{globalThis.Deno=savedDeno;globalThis.__zuriEdgeClient=savedFactory;if(oldEnabled===undefined)delete process.env.ZURI_AI_ENABLED;else process.env.ZURI_AI_ENABLED=oldEnabled;});
beforeEach(()=>{Object.assign(state,{calls:[],user:true,verified:true,error:null,uploadError:null});});
const req=(body={action:'account.get',payload:{}},headers={})=>new Request('https://example.supabase.co/functions/v1/zuri-api',{method:'POST',headers:{Origin:'https://zuri.example.test',Authorization:'Bearer valid-token','Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
test('deployed API health probes its database; private operations require an actually verified user token',async()=>{
 const health=await handlers['zuri-api'](new Request('https://example.supabase.co/functions/v1/zuri-api'));assert.equal(health.status,200);assert.equal((await health.json()).schema,'zuri-backend-009');
 assert.equal((await handlers['zuri-api'](req(undefined,{Authorization:''}))).status,401);
 assert.equal((await handlers['zuri-api'](req(undefined,{Authorization:'Bearer public-key'}))).status,401);
 state.verified=false;assert.equal((await handlers['zuri-api'](req())).status,403);
});
test('origin, JSON and body size bounds precede private database operations; clients cannot choose actor or server key',async()=>{
 assert.equal((await handlers['zuri-api'](req(undefined,{Origin:'https://evil.test'}))).status,403);
 assert.equal((await handlers['zuri-api'](req('x'.repeat(65000)))).status,413);
 assert.equal((await handlers['zuri-api'](req('not json'))).status,400);
 assert.equal(state.calls.length,0);
 const result=await handlers['zuri-api'](req({action:'records.list',payload:{kind:'task'},actor:'forged',serviceKey:'forged'}));assert.equal(result.status,200);
 assert.equal(state.calls[0].key,'test-anon');assert.equal(state.calls[0].authorization,'Bearer valid-token');assert.deepEqual(state.calls[0].args,{action:'records.list',payload:{kind:'task'}});
});
test('private media validates bytes, reserves quota before upload and finalizes only after storage acknowledges',async()=>{
 const png=new Uint8Array([137,80,78,71,13,10,26,10]);const request=new Request('https://example.supabase.co/functions/v1/zuri-media',{method:'POST',headers:{Authorization:'Bearer valid-token',Origin:'https://zuri.example.test','Content-Type':'image/png'},body:png});
 assert.equal((await handlers['zuri-media'](request)).status,201);assert.equal(state.calls[0].args.actor,'canonical-user');assert.equal(state.calls[0].args.operation,'reserve');assert.equal(state.calls[1].upload,true);assert.equal(state.calls[2].args.operation,'ready');
 state.calls=[];const mismatch=new Request('https://example.supabase.co/functions/v1/zuri-media',{method:'POST',headers:{Authorization:'Bearer valid-token','Content-Type':'image/jpeg'},body:png});assert.equal((await handlers['zuri-media'](mismatch)).status,415);assert.equal(state.calls.length,0);
});
test('uncertain uploads hold quota, unauthorized reads cannot sign files, downloads are short-lived attachments',async()=>{
 state.uploadError={code:'network'};const request=new Request('https://example.supabase.co/functions/v1/zuri-media',{method:'POST',headers:{Authorization:'Bearer valid-token','Content-Type':'image/png'},body:new Uint8Array([137,80,78,71,13,10,26,10])});
 assert.equal((await handlers['zuri-media'](request)).status,503);assert.ok(!state.calls.some(c=>c.args?.operation==='ready'));
 state.calls=[];state.error={code:'42501'};assert.equal((await handlers['zuri-media'](req({action:'read',id:'a'.repeat(36)}))).status,403);assert.ok(!state.calls.some(c=>c.sign));
 state.calls=[];state.error=null;assert.equal((await handlers['zuri-media'](req({action:'read',id:'a'.repeat(36)}))).status,200);assert.deepEqual(state.calls[1].options,{download:true});assert.equal(state.calls[1].seconds,60);
});
test('edge AI keeps the canonical gateway disabled without a fresh provider setup and never calls provider by default',async()=>{
 const status=await handlers['zuri-ai'](new Request('https://example.supabase.co/functions/v1/zuri-ai',{headers:{Authorization:'Bearer valid-token'}}));assert.equal(status.status,200);assert.equal((await status.json()).enabled,false);
 const input={mode:'viola',consent:true,requestId:'00000000-0000-4000-8000-000000000000',messages:[{role:'user',content:'Hello'}]};
 assert.equal((await handlers['zuri-ai'](req(input))).status,503);assert.equal(state.calls.length,0);
 assert.equal((await handlers['zuri-ai'](req(input,{Authorization:''}))).status,401);
});

test('public enquiries are validated, rate-reserved and inserted with a server-chosen source and status',async()=>{
 const body={action:'enquiry.submit',payload:{enquiryType:'tech',name:'Example applicant',email:'example@example.test',message:'Please discuss a website.',status:'published',source:'forged'}};
 const response=await handlers['zuri-api'](req(body,{Authorization:''}));assert.equal(response.status,201);assert.equal((await response.json()).success,true);
 assert.equal(state.calls[0].name,'zuri_intake_reserve');assert.match(state.calls[0].args.key_digest,/^[a-f0-9]{64}$/);assert.equal(state.calls[0].args.photo_bytes,0);
 assert.equal(state.calls[1].insert,'enquiries');assert.equal(state.calls[1].value.status,'new');assert.equal(state.calls[1].value.source,'zuri-tech');assert.equal(state.calls[1].key,'test-service');
 state.calls=[];state.error={code:'P0001'};assert.equal((await handlers['zuri-api'](req(body))).status,429);assert.ok(!state.calls.some(c=>c.insert));
});
test('Pamoja intake requires explicit consent, bounds photos and delivers only a private enquiry',async()=>{
 const profile={kind:'space',name:'Example business',description:'A neighbourhood business',sells:'Supplied goods',offers:'Support',location:'Jinja',links:'https://example.test',email:'example@example.test',package:'presence',consent:true};
 const form=new FormData();form.set('profile',JSON.stringify(profile));const response=await handlers['zuri-api'](new Request('https://example.supabase.co/functions/v1/zuri-api',{method:'POST',headers:{Origin:'https://zuri.example.test'},body:form}));assert.equal(response.status,201);assert.equal(state.calls[1].value.name,'Example business');assert.match(state.calls[1].value.message,/Pamoja participation request/);
 state.calls=[];const bad=new FormData();bad.set('profile',JSON.stringify({...profile,consent:false}));assert.equal((await handlers['zuri-api'](new Request('https://example.supabase.co/functions/v1/zuri-api',{method:'POST',body:bad}))).status,400);assert.equal(state.calls.length,0);
});
