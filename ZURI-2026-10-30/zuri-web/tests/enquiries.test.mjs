import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {state,reset} from './supabase-mock.mjs';
const publicAPI = await import('../src/app/api/enquiries/route.ts');
const statusAPI = await import('../src/app/api/admin/enquiries/[id]/route.ts');
const notesAPI = await import('../src/app/api/admin/enquiries/[id]/notes/route.ts');
const {validateEnquiry} = await import('../src/lib/enquiries/validation.ts');
const id='550e8400-e29b-41d4-a716-446655440000';
const context={params:Promise.resolve({id})};
const valid={name:' Daudi ',email:'daudi@example.test',phone:'+256 700 123456',weddingDate:'2027-02-28',location:'Kampala',guestCount:'100-250',packageInterest:'Wedding website',message:'Hello'};
function request(method,body,headers={}) {return new NextRequest('https://zuri.test/api/enquiries',{method,headers:{origin:'https://zuri.test','content-type':'application/json',...headers},...(method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}
test.beforeEach(reset);
test('public enquiry writes only validated fields, fixed source/status; success follows persistence',async()=>{
 const res=await publicAPI.POST(request('POST',{...valid,status:'closed',author_id:'attacker'}));assert.equal(res.status,201);
 assert.equal(state.calls[0].value.name,'Daudi');assert.equal(state.calls[0].value.status,'new');assert.equal(state.calls[0].value.source,'zuri-invites');assert.equal(state.calls[0].value.author_id,undefined);assert.equal(state.calls[0].value.wedding_date,'2027-02-28');
});
for(const [label,body] of [['missing name',{...valid,name:''}],['invalid email',{...valid,email:'bad'}],['invalid phone',{...valid,phone:'123'}],['impossible date',{...valid,weddingDate:'2027-02-30'}],['oversized message',{...valid,message:'x'.repeat(4001)}],['invalid guest option',{...valid,guestCount:'million'}],['array',[]],['null',null]]) test(`validation rejects ${label}`,()=>assert.throws(()=>validateEnquiry(body)));
test('optional values become null',()=>assert.equal(validateEnquiry({name:'A',email:'a@b.test',phone:'0700123456'}).wedding_date,null));
test('public database failure never returns success',async()=>{state.dbError={code:'missing_table'};assert.equal((await publicAPI.POST(request('POST',valid))).status,503);});
for(const [label,body,headers,code] of [['cross-origin',valid,{origin:'https://other.test'},403],['non-JSON',valid,{'content-type':'text/plain'},415],['malformed JSON','{',{},400],['oversized payload','x'.repeat(12001),{},413]]) test(`public rejects ${label}`,async()=>{assert.equal((await publicAPI.POST(request('POST',body,headers))).status,code);assert.equal(state.calls.length,0);});
for(const [name,api,method,body] of [['status',statusAPI,'PATCH',{status:'contacted'}],['note read',notesAPI,'GET',undefined],['note write',notesAPI,'POST',{content:'Called customer'}]]) {
 test(`${name}: unauthenticated is 401, no privileged reads`,async()=>{state.user=null;assert.equal((await api[method](request(method,body),context)).status,401);assert.equal(state.calls.length,0);});
 test(`${name}: non-admin is 403, customer data untouched`,async()=>{state.allowed=false;assert.equal((await api[method](request(method,body),context)).status,403);assert.deepEqual(state.calls.map(c=>c.table),['admin_users']);});
 test(`${name}: authorization failure fails closed`,async()=>{state.dbError={code:'offline'};assert.equal((await api[method](request(method,body),context)).status,500);assert.equal(state.calls.length,1);});
 test(`${name}: invalid id is 400`,async()=>{assert.equal((await api[method](request(method,body),{params:Promise.resolve({id:'bad'})})).status,400);});
 test(`${name}: missing enquiry is 404`,async()=>{state.exists=false;assert.equal((await api[method](request(method,body),context)).status,404);assert.equal(state.calls.some(c=>c.table==='enquiry_notes'),false);});
}
test('admin status persists allowed update',async()=>{const res=await statusAPI.PATCH(request('PATCH',{status:'qualified'}),context);assert.equal(res.status,200);assert.equal(state.calls[1].value.status,'qualified');});
test('admin rejects invalid status',async()=>assert.equal((await statusAPI.PATCH(request('PATCH',{status:'published'}),context)).status,400));
test('admin writes reject foreign origins',async()=>{assert.equal((await statusAPI.PATCH(request('PATCH',{status:'closed'},{origin:'https://other.test'}),context)).status,403);assert.equal((await notesAPI.POST(request('POST',{content:'note'},{origin:'https://other.test'}),context)).status,403);});
test('notes use verified author and trim content',async()=>{const res=await notesAPI.POST(request('POST',{content:' Follow up ',author_id:'attacker'}),context);assert.equal(res.status,201);assert.equal(state.calls[2].value.author_id,'admin-1');assert.equal(state.calls[2].value.content,'Follow up');});
test('notes read is private and scoped',async()=>{state.notes=[{content:'Internal'}];const res=await notesAPI.GET(request('GET'),context);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.deepEqual(state.calls[2].filters,[['enquiry_id',id]]);});
test('empty and oversized notes rejected',async()=>{for(const content of [' ','x'.repeat(2001)]) assert.equal((await notesAPI.POST(request('POST',{content}),context)).status,400);});
test('admin malformed JSON is 400',async()=>{assert.equal((await statusAPI.PATCH(request('PATCH','{'),context)).status,400);assert.equal((await notesAPI.POST(request('POST','{'),context)).status,400);});
test('technology requests use existing columns and server-controlled routing',async()=>{
 const response=await publicAPI.POST(request('POST',{...valid,enquiryType:'tech',service:'partnership',source:'attacker',status:'closed'}));
 assert.equal(response.status,201);const saved=state.calls[0].value;
 assert.equal(saved.source,'zuri-tech');assert.equal(saved.status,'new');assert.equal(saved.wedding_date,null);assert.equal(saved.package_interest,null);assert.match(saved.message,/Technology request — partnership/);
});
test('technology requests require a message and allowlisted service',()=>{
 assert.throws(()=>validateEnquiry({...valid,enquiryType:'tech',message:''}));
 assert.throws(()=>validateEnquiry({...valid,enquiryType:'tech',service:'payment-plan'}));
 assert.throws(()=>validateEnquiry({...valid,enquiryType:'membership'}));
});
test('Pamoja participation is a private enquiry, not a public identity or need',async()=>{
 const res=await publicAPI.POST(request('POST',{...valid,enquiryType:'tech',contactIntent:'pamoja',service:''}));assert.equal(res.status,201);assert.match(state.calls[0].value.message,/^Pamoja participation request/);assert.equal(state.calls[0].table,'enquiries');assert.equal(state.calls[0].value.status,'new');assert.equal(state.calls[0].value.member,undefined);
});
test('general contact intent stays server-labelled and unknown intents are rejected',()=>{
 assert.match(validateEnquiry({...valid,enquiryType:'tech',contactIntent:'general'}).message,/^General ZURI request/);assert.throws(()=>validateEnquiry({...valid,enquiryType:'tech',contactIntent:'publish-profile'}));
});
for(const mode of ['general','pamoja'])test(`${mode} form without a service dropdown submits through the real API`,async()=>{
 const {enquiryFromForm}=await import('../src/lib/enquiries/form.ts');const data=new FormData();for(const key of ['name','email','phone','message'])data.set(key,valid[key]);const payload=enquiryFromForm(data,mode);assert.equal(payload.service,'');const res=await publicAPI.POST(request('POST',payload));assert.equal(res.status,201);assert.equal(state.calls[0].value.status,'new');
});
