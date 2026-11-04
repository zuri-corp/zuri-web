import './hooks.mjs';
import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {state,reset} from './supabase-mock.mjs';
const admin=await import('../src/app/api/admin/opportunities/route.ts');
const worker=await import('../src/app/api/workers/opportunities/route.ts');
const me=await import('../src/app/api/opportunities/me/route.ts');
let env;beforeEach(()=>{env={...process.env};reset();Object.assign(process.env,{ZURI_OPPORTUNITIES_ENABLED:'true',SUPABASE_URL:'https://example.test',SUPABASE_SECRET_KEY:'test-only-server'});});
afterEach(()=>{for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);});
const post=(value,origin='https://zuri.test')=>new Request('https://zuri.test/api/admin/opportunities',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
test('admin source approval requires canonical admin authority and rejects cross-origin writes',async()=>{
 const source={action:'source',label:'Test',mode:'account',query:'test_ug',permission_reference:'Test entitlement'};
 state.user=null;assert.equal((await admin.POST(post(source))).status,401);assert.equal(state.calls.length,0);
 reset();state.allowed=false;assert.equal((await admin.POST(post(source))).status,403);assert.ok(state.calls.every(c=>c.table==='admin_users'));
 reset();assert.equal((await admin.POST(post(source,'https://evil.test'))).status,400);assert.ok(!state.calls.some(c=>c.rpc));
 reset();assert.equal((await admin.POST(post({...source,mode:'search',query:'all posts'}))).status,400);
 reset();assert.equal((await admin.POST(post(source))).status,200);assert.equal(state.calls.at(-1).args.actor,'admin-1');assert.equal(state.calls.at(-1).args.payload.enabled,undefined);
});
test('worker rejects absent or wrong bearer before reads and provider calls',async()=>{
 process.env.ZURI_OPPORTUNITY_WORKER_SECRET='a'.repeat(40);
 for(const authorization of ['', 'Bearer bad']){const r=await worker.POST(new Request('https://zuri.test/api/workers/opportunities',{method:'POST',headers:{authorization}}));assert.equal(r.status,401);}
 assert.equal(state.calls.length,0);
});
test('disabled configuration and untrusted moderation inputs cannot activate work',async()=>{
 process.env.ZURI_OPPORTUNITIES_ENABLED='false';const r=await admin.GET();assert.equal((await r.json()).configured,false);assert.equal(state.calls.length,0);
 assert.equal((await me.GET()).status,503);
 process.env.ZURI_OPPORTUNITIES_ENABLED='true';assert.equal((await admin.POST(post({action:'moderate',id:'bad',status:'published',official_url:'javascript:alert(1)'}))).status,400);
 assert.equal((await admin.POST(post({action:'policy',enabled:true,daily_request_cap:100000,daily_micros_cap:1,request_reserve_micros:1}))).status,400);
 assert.ok(!state.calls.some(c=>c.rpc));
});
