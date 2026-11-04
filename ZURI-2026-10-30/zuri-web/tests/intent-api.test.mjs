import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {GET,POST}=await import('../src/app/api/intents/resolve/route.ts');
const make=(body,origin='https://zuri.example')=>new Request('https://zuri.example/api/intents/resolve',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
test('stateless planning needs no provider or database and exposes no execution endpoint',async()=>{
 const catalog=await (await GET()).json();assert.equal(catalog.execution,false);assert.ok(catalog.goals.length>=10);
 const result=await POST(make({text:'Help me plan my study tasks',execute:true,permissions:['*']})),body=await result.json();assert.equal(result.status,200);assert.equal(body.execution,false);assert.equal(body.plan.status,'ready');assert.ok(!('permissions'in body.plan.request));
});
test('planner validates origin, content, size and secrets',async()=>{
 assert.equal((await POST(make({text:'Plan my tasks'},'https://attacker.example'))).status,403);
 assert.equal((await POST(new Request('https://zuri.example/api/intents/resolve',{method:'POST',body:'text'}))).status,415);
 assert.equal((await POST(make({text:'api_key=sk-verysecret000000000000000'}))).status,400);
 assert.equal((await POST(make({text:'x'.repeat(9000)}))).status,400);
 assert.equal((await POST(make({text:'Plan my study tasks'},''))).status,200,'trusted server-side planning is allowed without browser cookies');
});
test('local server normalization uses the actual Host while rejecting foreign browser origins',async()=>{
 const request=origin=>new Request('http://localhost:3015/api/intents/resolve',{method:'POST',headers:{Host:'127.0.0.1:3015',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({text:'Plan my study tasks'})});
 assert.equal((await POST(request('http://127.0.0.1:3015'))).status,200);
 assert.equal((await POST(request('https://attacker.example'))).status,403);
});
