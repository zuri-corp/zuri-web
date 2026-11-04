import './hooks.mjs';import test,{beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';import {reset,state} from './supabase-mock.mjs';
const {GET,POST}=await import('../src/app/api/backend/route.ts');const {POST:media}=await import('../src/app/api/backend/media/route.ts');
const {GET:status,POST:ai}=await import('../src/app/api/ai/route.ts');const {accountReturn}=await import('../src/lib/pamoja/account.ts');
const realFetch=globalThis.fetch;let env;
test('public forwarding accepts the actual request host and rejects cross-site origin before forwarding',async()=>{
 const {NextRequest}=await import('next/server.js');
 const {POST:enquire}=await import('../src/app/api/enquiries/route.ts');
 const {POST:intake}=await import('../src/app/api/pamoja/intake/route.ts');
 Object.assign(process.env,{ZURI_PUBLIC_EDGE_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public'});
 let forwarded=0;globalThis.fetch=async()=>{forwarded++;return Response.json({error:'Invalid details from edge'},{status:400});};
 function request(profile=false,origin='http://127.0.0.1:3015'){
  return new NextRequest('http://localhost:3015/api/enquiries',{method:'POST',headers:{host:'127.0.0.1:3015',origin,'Content-Type':profile?'multipart/form-data; boundary=test':'application/json'},body:profile?'--test--':'{}'});
 }
 assert.equal((await enquire(request())).status,400);assert.equal((await intake(request(true))).status,400);assert.equal(forwarded,2);
 assert.equal((await enquire(request(false,'https://other.test'))).status,403);assert.equal((await intake(request(true,'https://other.test'))).status,403);assert.equal(forwarded,2);
});
beforeEach(()=>{env={...process.env};reset();state.user={id:'canonical-user',email_confirmed_at:'2026-01-01'};state.rpcData={user_id:'canonical-user'};});
afterEach(()=>{globalThis.fetch=realFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);});
const req=(body={action:'records.list',payload:{kind:'task'}},origin='http://localhost')=>new Request('http://localhost/api/backend',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('website backend requires canonical verified sign-in and does not accept client actor authority',async()=>{
 state.user=null;assert.equal((await GET()).status,401);state.user={id:'unverified'};assert.equal((await GET()).status,403);assert.equal(state.calls.length,0);
 state.user={id:'canonical-user',email_confirmed_at:'2026-01-01'};assert.equal((await POST(req(undefined,'https://evil.test'))).status,403);assert.equal((await POST(req({action:'records.list',payload:{kind:'task'},actor:'forged',role:'admin'}))).status,200);
 assert.deepEqual(state.calls[0],{rpc:'zuri_backend',args:{action:'records.list',payload:{kind:'task'}}});
 state.rpcError={code:'40001'};assert.equal((await POST(req())).status,409);
});
test('shared profile saves use the consent-aware onboarding RPC and explain an unapplied proposal',async()=>{
 const payload={display_name:'A ZURI member',bio:'About me',location:'Nairobi',is_public:false,links:[],avatar_media_id:null};
 const response=await POST(req({action:'profile.save',payload}));
 assert.equal(response.status,200);
 assert.deepEqual(state.calls.at(-1),{rpc:'zuri_profile_save',args:{payload}});
 state.rpcError={code:'PGRST202'};
 const unavailable=await POST(req({action:'profile.save',payload}));
 assert.equal(unavailable.status,503);
 assert.match((await unavailable.json()).error,/proposal 011/);
});
test('private media is forwarded to a fixed project endpoint with a verified user token, never a server key',async()=>{
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SECRET_KEY:'must-not-forward'});
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://example.supabase.co/functions/v1/zuri-media');assert.equal(options.headers.Authorization,'Bearer test-session-token');assert.ok(!JSON.stringify(options).includes('must-not-forward'));return Response.json({url:'https://example.supabase.co/signed',expiresIn:60});};
 assert.equal((await media(req({action:'read',id:'00000000-0000-4000-8000-000000000000'}))).status,200);
 state.user=null;globalThis.fetch=()=>{throw Error('Must not forward without sign-in');};assert.equal((await media(req())).status,401);
});
test('website AI edge routing preserves reviewed input, origin checks and provider-free status',async()=>{
 Object.assign(process.env,{ZURI_AI_EDGE_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public'});
 globalThis.fetch=async(url,options)=>{assert.match(url,/\/functions\/v1\/zuri-ai\?mode=intent$/);assert.equal(options.headers.Authorization,'Bearer test-session-token');assert.equal(options.method,'GET');return Response.json({enabled:false,execution:false});};
 assert.equal((await (await status()).json()).enabled,false);
 globalThis.fetch=()=>{throw Error('Must reject before forwarding');};assert.equal((await ai(req({},'https://evil.test'))).status,403);
 assert.equal((await ai(req({mode:'intent',requestId:'00000000-0000-4000-8000-000000000000',consent:false,input:{text:'Help plan my studies'}}))).status,400);
});
test('app sign-in returns only to the exact approved app destinations',()=>{
 assert.equal(accountReturn('/app'),'/app');assert.equal(accountReturn('/app#/lore/profile?kind=cloud-account&id=home'),'/app#/lore/profile?kind=cloud-account&id=home');assert.equal(accountReturn('/app?next=https://evil.test'),'/pamoja/account');assert.equal(accountReturn('https://evil.test/app'),'/pamoja/account');
});
