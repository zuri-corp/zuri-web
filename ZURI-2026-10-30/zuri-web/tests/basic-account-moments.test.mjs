import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {state,reset} from './supabase-mock.mjs';
const {accountReturn,publicName,momentMutation}=await import('../src/lib/pamoja/account.ts');
const {minimumPasswordLength,newPassword,requestEmailCode,verifyEmailCode}=await import('../src/lib/pamoja/email-auth.ts');
const {restoreMomentDraft}=await import('../src/lib/pamoja/draft.ts');
const accounts=await import('../src/app/api/pamoja/account/route.ts');
const moments=await import('../src/app/api/pamoja/moments/route.ts');
const publicDelivery=await import('../src/lib/pamoja/public.ts');
const id='550e8400-e29b-41d4-a716-446655440000';
const other='550e8400-e29b-41d4-a716-446655440001';
function request(body,headers={},path='/api/pamoja/account',method='POST') {return new NextRequest(`https://zuri.test${path}`,{method,headers:{origin:'https://zuri.test','content-type':'application/json',...headers},...(method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}
function contribution(extra={}) {return {action:'submit',slug:'a-real-place',note:'A quiet corner I remember.',consent:true,request_id:id,...extra};}
test.beforeEach(()=>{reset();state.allowed=false;state.rpcData={saved:true};state.user={id:'verified-user',email:'auth-only@example.test',email_confirmed_at:'2026-10-14T00:00:00Z'};process.env.ZURI_CONTENT_MODE='live';});
test.afterEach(()=>delete process.env.ZURI_CONTENT_MODE);

test('basic account sends a verification request, not an authenticated session',async()=>{
 let sent;const email=await requestEmailCode({signInWithOtp:async value=>{sent=value;return {error:null,data:{user:null,session:null}};}},'  person@example.test ');
 assert.equal(email,'person@example.test');assert.deepEqual(sent,{email:'person@example.test',options:{shouldCreateUser:false}});assert.equal(state.calls.length,0);
});
test('new passwords enforce a strong minimum and a bounded maximum',()=>{
 assert.equal(newPassword('a'.repeat(minimumPasswordLength)),'a'.repeat(minimumPasswordLength));
 assert.throws(()=>newPassword('short'),/at least/);
 assert.throws(()=>newPassword('a'.repeat(129)),/no more than 128/);
});
test('email validation happens before delivery and provider errors are private',async()=>{
 let calls=0;const auth={signInWithOtp:async()=>{calls++;return {error:{code:'smtp_error',message:'secret provider configuration and email details'}};}};
 await assert.rejects(()=>requestEmailCode(auth,'invalid'),/valid email/);assert.equal(calls,0);
 await assert.rejects(()=>requestEmailCode(auth,'person@example.test'),/couldn’t send/);assert.equal(calls,1);
 await assert.rejects(()=>requestEmailCode({signInWithOtp:async()=>({error:{code:'over_email_send_rate_limit'}})},'person@example.test'),/wait/);
});
test('a checked code requires a real session and confirmed email before handoff',async()=>{
 let credentials;const auth={verifyOtp:async body=>{credentials=body;return {error:null,data:{session:{access_token:'test'},user:{email:'person@example.test',email_confirmed_at:'now'}}};}};
 await verifyEmailCode(auth,'person@example.test',' 12345678 ');assert.deepEqual(credentials,{email:'person@example.test',token:'12345678',type:'email'});
 for(const data of [{session:null,user:null},{session:{},user:{email:'person@example.test'}},{session:{},user:{email_confirmed_at:'now'}}]) await assert.rejects(()=>verifyEmailCode({verifyOtp:async()=>({error:null,data})},'person@example.test','12345678'),/could not be verified/);
 await assert.rejects(()=>verifyEmailCode(auth,'person@example.test','123456'),/eight-digit/);
});
test('post-sign-in handoffs cannot leave approved account journeys',()=>{
 for(const target of ['https://evil.test','//evil.test','/admin','/pamoja/account?next=https://evil.test','/pamoja/moments/a-place/other','/pamoja/moments/tech','/pamoja/moments/%2f%2fevil.test',null]) assert.equal(accountReturn(target),'/pamoja/account');
 for(const target of ['/pamoja/manage','/pamoja/account','/pamoja/moments/a-place']) assert.equal(accountReturn(target),target);
});
test('public name can be a nickname, without a directory identity or email',()=>{
 assert.equal(publicName('  Jabu  '),'Jabu');for(const value of ['',null,'a'.repeat(81),'email@example.test','One\nTwo'])assert.throws(()=>publicName(value));
});
for(const [label,handler] of [['account read',r=>accounts.GET(r)],['account save',r=>accounts.POST(r)],['Moment write',r=>moments.POST(r)]]) {
 test(`${label}: no session or unconfirmed email cannot reach a privileged function`,async()=>{
  for(const user of [null,{id:'unverified',email:'person@example.test'},{id:'phone-only',email_confirmed_at:'now'}]) {state.user=user;const r=await handler(request(contribution()));assert.equal(r.status,user?403:401);assert.equal(state.calls.length,0);}
 });
}
test('basic account profile is minimal, authenticated, and independent of admin or management rights',async()=>{
 const r=await accounts.POST(request({display_name:' Jabu ',email:'must-not-be-stored@example.test',phone:'private',actor:'spoof',roles:['admin'],member:true}));assert.equal(r.status,200);
 assert.deepEqual(state.calls,[{rpc:'zuri_pamoja_contribute',args:{actor:'verified-user',action:'account',payload:{display_name:'Jabu'}}}]);
 assert.deepEqual(await r.json(),{account:{display_name:'Jabu'}});
});
test('account history is actor-scoped, paginated and stripped of private evidence and email',async()=>{
 state.rpcData={account:{display_name:'Jabu',email:'private@example.test'},items:[{id,status:'approved',note:'Shared note',display_name:'Jabu',space_name:'A place',space_slug:'a-place',created_at:'now',author_id:'private-user',permission_reference:'private permission',email:'private@example.test'}],total:21,email:'private'};
 const r=await accounts.GET(request(null,{},'/api/pamoja/account?page=2','GET'));assert.equal(r.status,200);const body=await r.json();assert.equal(body.page,2);assert.equal(body.pages,2);assert.equal(body.items[0].space_slug,'a-place');
 assert.equal(JSON.stringify(body).includes('private'),false);assert.deepEqual(state.calls.at(-1).args,{actor:'verified-user',action:'list',payload:{page:2}});assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('unknown history state fails closed; unsafe Space links are removed',async()=>{
 state.rpcData={account:null,items:[{id,status:'pending',note:'A note',display_name:'Jabu',space_slug:'//evil.test'}],total:1};let r=await accounts.GET(request(null,{},'/api/pamoja/account?page=invalid','GET'));assert.equal(r.status,200);assert.equal((await r.json()).items[0].space_slug,null);assert.equal(state.calls.at(-1).args.payload.page,1);
 state.rpcData.items[0].status='unexpected';r=await accounts.GET(request(null,{},'/api/pamoja/account','GET'));assert.equal(r.status,503);
});
test('Moment submission fixes actor, permission version and pending workflow; no contact/roles are forwarded',async()=>{
 state.rpcData={id,status:'pending',email:'private@example.test',author_id:'private-user'};
 const r=await moments.POST(request(contribution({actor:'spoof',author_id:'spoof',display_name:'Someone else',status:'approved',email:'not-stored@example.test',permission_reference:'fake',permission_version:'fake'})));
 assert.equal(r.status,201);assert.deepEqual(await r.json(),{moment:{id,status:'pending'}});
 assert.deepEqual(state.calls.at(-1).args,{actor:'verified-user',action:'submit',payload:{slug:'a-real-place',note:'A quiet corner I remember.',consent:true,request_id:id,permission_version:'moments-note-v1'}});
});
test('missing permission, oversized/empty notes, reserved Spaces and request IDs never reach storage',async()=>{
 for(const extra of [{consent:false},{consent:'true'},{note:''},{note:'a'.repeat(1201)},{slug:'tech'},{request_id:'invalid'}]){const r=await moments.POST(request(contribution(extra)));assert.equal(r.status,400);assert.equal(state.calls.length,0);}
});
test('example-mode Spaces reject real contributions before storage',async()=>{
 process.env.ZURI_CONTENT_MODE='preview';const r=await moments.POST(request(contribution()));assert.equal(r.status,409);assert.equal(state.calls.length,0);
});
test('same retry forwards stable identity; edited payload cannot spoof the server permission version',async()=>{
 state.rpcData={id,status:'pending'};await moments.POST(request(contribution()));await moments.POST(request(contribution()));assert.equal(state.calls.length,2);assert.deepEqual(state.calls[0].args,state.calls[1].args);assert.equal(momentMutation(contribution({permission_version:'injected'})).payload.permission_version,'moments-note-v1');
});
test('withdrawal is contributor-scoped and available even when preview or a Space is closed',async()=>{
 process.env.ZURI_CONTENT_MODE='preview';state.rpcData={id,status:'withdrawn'};const r=await moments.POST(request({action:'withdraw',moment_id:id,actor:'spoof',author_id:'spoof',status:'approved'}));assert.equal(r.status,200);assert.deepEqual(state.calls.at(-1).args,{actor:'verified-user',action:'withdraw',payload:{moment_id:id}});
 state.rpcError={code:'42501'};assert.equal((await moments.POST(request({action:'withdraw',moment_id:other}))).status,403);
});
test('rate, conflict, opt-in and storage failures do not report a successful contribution',async()=>{
 for(const [code,status] of [['P0001',429],['40001',409],['22023',400],['42P01',503]]){state.rpcError={code};const r=await moments.POST(request(contribution()));assert.equal(r.status,status);assert.equal('moment' in await r.json(),false);if(status===429)assert.equal(r.headers.get('retry-after'),'3600');}
});
for(const [label,headers,body,status] of [['foreign origin',{origin:'https://evil.test'},contribution(),403],['wrong content',{'content-type':'text/plain'},contribution(),415],['malformed JSON',{},'{',400],['oversized body',{},'a'.repeat(12001),413]]) {
 test(`account and Moment writes reject ${label}`,async()=>{for(const handler of [accounts.POST,moments.POST]){const r=await handler(request(body,headers));assert.equal(r.status,status);assert.equal(state.calls.length,0);}});
}
test('public guestbook projection excludes all account/contact/permission metadata',async()=>{
 state.rpcData={enabled:true,space_name:'A place',email:'private',items:[{id,note:'A public memory',display_name:'Jabu',author_id:'private',permission_reference:'private',email:'private'}]};const publicBook=await publicDelivery.loadGuestbook('a-place');assert.deepEqual(publicBook,{available:true,enabled:true,space_name:'A place',items:[{id,note:'A public memory',display_name:'Jabu'}]});assert.equal(state.calls.at(-1).rpc,'zuri_public_moments');
});
test('closed guestbook hides any supplied items; preview never queries live Moments',async()=>{
 state.rpcData={enabled:false,items:[{id,note:'must stay hidden',display_name:'Jabu'}]};assert.deepEqual((await publicDelivery.loadGuestbook('a-place')).items,[]);
 reset();process.env.ZURI_CONTENT_MODE='preview';assert.equal((await publicDelivery.loadGuestbook('a-place')).enabled,false);assert.equal(state.calls.length,0);
});
test('guestbook failures are unavailable, not fabricated empty or sample contributions',async()=>{state.rpcError={code:'missing_function'};const book=await publicDelivery.loadGuestbook('a-place');assert.equal(book.available,false);assert.equal(book.enabled,false);assert.deepEqual(book.items,[]);});
test('draft restoration retains text and retry identity only; consent and auth are never restored',()=>{
 assert.deepEqual(restoreMomentDraft(JSON.stringify({note:'An unsent note',request_id:id,consent:true,email:'private',access_token:'private'})),{note:'An unsent note',request_id:id});
 for(const raw of ['{',null,JSON.stringify({note:'a'.repeat(1201)}),JSON.stringify({note:5})])assert.equal(restoreMomentDraft(raw),null);
 assert.deepEqual(restoreMomentDraft(JSON.stringify({note:'Note',request_id:'bad'})),{note:'Note',request_id:null});
});

test('missing persistence receipt or malformed Moment result never becomes success',async()=>{
 state.rpcData=null;assert.equal((await accounts.POST(request({display_name:'Jabu'}))).status,503);
 state.rpcData={id:'not-a-record',status:'pending'};assert.equal((await moments.POST(request(contribution()))).status,503);
});
