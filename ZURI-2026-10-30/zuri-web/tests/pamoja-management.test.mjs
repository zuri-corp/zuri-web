import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {state,reset} from './supabase-mock.mjs';
const {enquiryFromForm}=await import('../src/lib/enquiries/form.ts');
const {validateEnquiry}=await import('../src/lib/enquiries/validation.ts');
const owner=await import('../src/app/api/pamoja/manage/route.ts');
const admin=await import('../src/app/api/admin/pamoja/route.ts');
const id='550e8400-e29b-41d4-a716-446655440000';
function request(body,headers={}){return new NextRequest('https://zuri.test/api/pamoja/manage',{method:'POST',headers:{origin:'https://zuri.test','content-type':'application/json',...headers},body:JSON.stringify(body)});}
test.beforeEach(()=>{reset();state.rpcData={saved:true};state.user={id:'session-user',email:'user@example.test',email_confirmed_at:'2026-10-01T00:00:00Z'};});
test('claim intake serializes through existing private enquiry without a grant',()=>{
 const data=new FormData();for(const [k,v] of Object.entries({name:'Claimant',email:'claim@example.test',phone:'+256700000000',message:'Presence: /example\nMy role: manager'}))data.set(k,v);
 const saved=validateEnquiry(enquiryFromForm(data,'claim'));assert.match(saved.message,/^Pamoja manual claim request/);assert.equal(saved.package_interest,null);assert.equal(state.calls.length,0);
});
for(const method of ['GET','POST']){
 test(`management ${method}: no session never calls storage`,async()=>{state.user=null;const r=await owner[method](request({action:'moments',content_id:id,enabled:true}));assert.equal(r.status,401);assert.equal(state.calls.length,0);});
 test(`management ${method}: unverified account is denied`,async()=>{delete state.user.email_confirmed_at;const r=await owner[method](request({action:'moments',content_id:id,enabled:true}));assert.equal(r.status,403);assert.equal(state.calls.length,0);});
 test(`review ${method}: non-admin never calls privileged RPC`,async()=>{state.allowed=false;const r=await admin[method](request({}));assert.equal(r.status,403);assert.equal(state.calls.some(c=>c.rpc),false);});
}
test('session actor overrides caller-supplied identity and RPC checks management',async()=>{
 state.rpcError={code:'42501'};const r=await owner.POST(request({action:'moments',content_id:id,enabled:true,actor:'attacker'}));assert.equal(r.status,403);assert.deepEqual(state.calls.at(-1),{rpc:'zuri_pamoja_manage',args:{actor:'session-user',action:'moments',content_id:id,payload:{enabled:true}}});
});
test('origin rejection occurs before any owner mutation',async()=>{const r=await owner.POST(request({action:'moments',content_id:id,enabled:true},{origin:'https://evil.test'}));assert.equal(r.status,403);assert.equal(state.calls.length,0);});
test('draft strips identity, publication and consent fields',async()=>{
 const r=await owner.POST(request({action:'draft',content_id:id,kind:'space',revision:2,consent_verified:true,slug:'stolen',data:{name:'A place',offerings:[],consent_reference:'private',published_data:{name:'Injected'}}}));assert.equal(r.status,200);const args=state.calls.at(-1).args;assert.equal(args.actor,'session-user');assert.equal('slug' in args.payload,false);assert.equal('consent_verified' in args.payload,false);assert.equal('consent_reference' in args.payload.data,false);assert.equal('published_data' in args.payload.data,false);
});
test('stale draft yields conflict; availability failure never reports success',async()=>{
 for(const [code,status] of [['40001',409],['42P01',503]]){state.rpcError={code};const r=await owner.POST(request({action:'moments',content_id:id,enabled:false}));assert.equal(r.status,status);assert.equal('result' in await r.json(),false);}
});
test('grant requires account, claim reference and verification evidence',async()=>{
 const base={action:'grant',content_id:id,user_id:id,enquiry_id:id,reference:'Manually verified authority through agreed contact'};
 for(const extra of [{reference:''},{user_id:'email@example.test'},{enquiry_id:null}]){const r=await admin.POST(request({...base,...extra}));assert.equal(r.status,400);assert.equal(state.calls.some(c=>c.rpc),false);reset();state.rpcData={saved:true};state.user={id:'session-user',email:'user@example.test',email_confirmed_at:'now'};}
 const r=await admin.POST(request({...base,actor:'attacker'}));assert.equal(r.status,200);assert.equal(state.calls.at(-1).args.actor,'session-user');assert.equal(state.calls.at(-1).rpc,'zuri_pamoja_review');
});
test('owners cannot use moderation or grant actions',async()=>{for(const action of ['approve','grant','revoke','withdraw','publish']){const r=await owner.POST(request({action,content_id:id,enabled:true}));assert.equal(r.status,400);}assert.equal(state.calls.length,0);});
test('Moment review checks record identifiers and preserves private reason',async()=>{const r=await admin.POST(request({action:'approve',content_id:id,moment_id:id,reference:'Permission checked and note reviewed',status:'approved',reviewed_by:'attacker'}));assert.equal(r.status,200);assert.deepEqual(state.calls.at(-1).args,{actor:'session-user',action:'approve',content_id:id,payload:{moment_id:id,reference:'Permission checked and note reviewed'}});});
test('database eligibility rejection does not become apparent approval',async()=>{state.rpcError={code:'22023'};const r=await admin.POST(request({action:'approve',content_id:id,moment_id:id,reference:'Permission and note checked'}));assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'private, no-store');});
