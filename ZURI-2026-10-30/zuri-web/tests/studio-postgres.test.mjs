import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {bookingManifest} from '../packages/tool-sdk/manifest.mjs';

test('Studio PostgreSQL migration and connected booking lifecycle enforce tenant, consent, review and budget boundaries',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 const [dev,reviewer,manager,stranger,space]=Array.from({length:5},()=>randomUUID());
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
 create table public.admin_users(user_id uuid references auth.users(id));
 create table public.zuri_website_content(id uuid primary key,kind text,status text,consent_verified boolean,published_data jsonb,data jsonb);
 create table public.zuri_pamoja_managers(content_id uuid references public.zuri_website_content(id),user_id uuid references auth.users(id),revoked_at timestamptz);`);
 for(const id of [dev,reviewer,manager,stranger])await pg.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[id]);
 await pg.query('insert into public.admin_users values($1),($2)',[reviewer,dev]);
 await pg.query(`insert into public.zuri_website_content values($1,'space','published',true,$2,$3)`,[space,{name:'Test Space',description:'Approved business details',offerings:['Appointments'],location:'Jinja',links:[]},{description:'PRIVATE EDITORIAL DRAFT'}]);
 await pg.query('insert into public.zuri_pamoja_managers values($1,$2,null)',[space,manager]);
 const migration=await readFile(new URL('../database/proposals/005_developer_studio.sql',import.meta.url),'utf8');
 await pg.exec(migration);
 async function manage(actor,action,payload={}){return (await pg.query('select public.zuri_studio_manage($1,$2,$3) as value',[actor,action,payload])).rows[0].value;}
 const key='a'.repeat(64),token='b'.repeat(64),token2='c'.repeat(64);
 async function runtime(operation,input={},id=randomUUID(),hash=token){return (await pg.query('select public.zuri_tool_runtime($1,$2,$3,$4,$5) as value',[key,hash,operation,input,id])).rows[0].value;}
 await t.test('register, create and submit without bypassing independent review',async()=>{
  await manage(dev,'register',{name:'Test Developer',kind:'individual'});
  const own=await manage(dev,'snapshot');const developerId=own.developers[0].id;
  const made=await manage(dev,'create',{developerId,manifest:bookingManifest});
  await manage(dev,'submit',{versionId:made.id});
  await assert.rejects(manage(dev,'approve',{versionId:made.id,reference:'Attempted self approval'}),/Independent/);
  await assert.rejects(manage(dev,'publish',{versionId:made.id}),/Approval/);
  await assert.rejects(manage(manager,'install',{versionId:made.id,spaceId:space,consent:true,tokenHash:token}),/Published/);
  await manage(reviewer,'verify',{developerId,reference:'Independent identity checks completed'});
  await manage(reviewer,'approve',{versionId:made.id,reference:'Endpoint and permissions reviewed in test'});
  await manage(dev,'publish',{versionId:made.id});
 });
 const own=await manage(dev,'snapshot'),tool=own.tools[0],version=own.versions[0],developerId=own.developers[0].id;
 await t.test('catalogue contains only a reviewed release; foreign account cannot install',async()=>{
  const catalogue=await manage(null,'catalog');assert.equal(catalogue.length,1);assert.equal(catalogue[0].manifest.name,'Space Booking');
  const rejected=await manage(dev,'version',{toolId:tool.id,manifest:{...bookingManifest,version:'1.0.1'}});
  await manage(dev,'submit',{versionId:rejected.id});
  await manage(reviewer,'reject',{versionId:rejected.id,reference:'Endpoint evidence needs additional verification'});
  await assert.rejects(manage(dev,'publish',{versionId:rejected.id}),/Approval/);
  assert.equal((await manage(null,'catalog'))[0].manifest.version,'1.0.0');
  assert.equal((await manage(stranger,'snapshot')).tools.length,0);
  await assert.rejects(manage(stranger,'issue-key',{toolId:tool.id,keyHash:'d'.repeat(64)}),/owner/i);
  await assert.rejects(manage(stranger,'install',{versionId:version.id,spaceId:space,consent:true,tokenHash:token}),/authority/);
  await assert.rejects(manage(manager,'install',{versionId:version.id,spaceId:space,consent:false,tokenHash:token}),/consent/);
 });
 await manage(dev,'issue-key',{toolId:tool.id,keyHash:key});
 const installed=await manage(manager,'install',{versionId:version.id,spaceId:space,consent:true,tokenHash:token});
 await t.test('both credentials are required and only approved public fields are retrieved',async()=>{
  await assert.rejects(pg.query('select public.zuri_tool_runtime($1,$2,$3,$4,$5)',['f'.repeat(64),token,'space.read',{},randomUUID()]),/credential/);
  const record=await runtime('space.read');assert.equal(record.result.description,'Approved business details');assert.ok(!JSON.stringify(record).includes('PRIVATE'));
  const snapshot=await manage(dev,'snapshot');assert.ok(!JSON.stringify(snapshot).includes(token));assert.ok(!JSON.stringify(snapshot).includes(key));
 });
 const startsAt=new Date(Date.now()+7*86400000).toISOString(),endsAt=new Date(Date.now()+7*86400000+1800000).toISOString();
 let booking;
 await t.test('booking is idempotent, rejects overlap and preserves per-installation authority',async()=>{
  const input={name:'Customer',note:'Explicit request',startsAt,endsAt},requestId=randomUUID();
  booking=(await runtime('bookings.create',input,requestId)).result;
  assert.equal(booking.status,'requested');assert.equal((await runtime('bookings.create',input,requestId)).result.id,booking.id);
  await assert.rejects(runtime('bookings.create',{...input,name:'Different'},requestId),/different input/);
  await assert.rejects(runtime('bookings.create',input),/overlaps/);
  await assert.rejects(manage(stranger,'booking-status',{bookingId:booking.id,status:'confirmed'}),/Manager permission/);
  await manage(manager,'booking-status',{bookingId:booking.id,status:'confirmed'});
  assert.equal((await runtime('bookings.read')).result[0].status,'confirmed');
  assert.equal((await manage(dev,'snapshot')).bookings.length,0,'developer receives operation counts, not customer notes');
 });
 await t.test('publishing an expanded version never expands an existing consent',async()=>{
  const manifest={...bookingManifest,version:'1.1.0',permissions:[...bookingManifest.permissions,{capability:'ai.space-answer',purpose:'Answer approved Space questions from its published public details.'}]};
  const next=await manage(dev,'version',{toolId:tool.id,manifest});await manage(dev,'submit',{versionId:next.id});await manage(reviewer,'approve',{versionId:next.id,reference:'Additional AI purpose independently reviewed'});await manage(dev,'publish',{versionId:next.id});
  await assert.rejects(runtime('ai.space-answer',{question:'Opening hours?',reservedMicros:20}),/Capability/);
  await manage(manager,'revoke',{installationId:installed.id});
  await assert.rejects(runtime('space.read'),/Installation/);
  await manage(manager,'install',{versionId:next.id,spaceId:space,consent:true,tokenHash:token2});
  assert.equal((await runtime('bookings.read',{},randomUUID(),token2)).result.length,0,'new installation cannot read the previous installation’s requests');
 });
 await t.test('AI caps reserve atomically, reject overspend and settle once',async()=>{
  const input={question:'What do you offer?',reservedMicros:20};
  await assert.rejects(runtime('ai.space-answer',input,randomUUID(),token2),/cap exhausted/);
  await manage(reviewer,'budget',{developerId,limitMicros:100,reference:'Test-only cumulative AI cap authorization'});
  const rid=randomUUID(),reservation=await runtime('ai.space-answer',input,rid,token2);
  assert.equal((await manage(dev,'snapshot')).budgets[0].spent_micros,20);
  await assert.rejects(runtime('ai.space-answer',{...input,reservedMicros:90},randomUUID(),token2),/cap exhausted/);
  const reply={answer:'Appointments.',usage:{inputTokens:10,outputTokens:2}};
  await pg.query('select public.zuri_tool_ai_settle($1,$2,$3,$4,$5)',[reservation.reservationId,reply,7,10,2]);
  assert.equal((await manage(dev,'snapshot')).budgets[0].spent_micros,7);
  assert.deepEqual((await runtime('ai.space-answer',input,rid,token2)).result,reply);
  await assert.rejects(pg.query('select public.zuri_tool_ai_settle($1,$2,$3,$4,$5)',[reservation.reservationId,reply,7,10,2]),/Reconciliation/);
  const uncertain=randomUUID();await runtime('ai.space-answer',input,uncertain,token2);
  await assert.rejects(runtime('ai.space-answer',input,uncertain,token2),/awaiting reconciliation/);
  assert.equal((await manage(dev,'snapshot')).budgets[0].spent_micros,27,'unknown outcome keeps its reservation held');
 });
 await t.test('revoking a Tool credential while AI is in flight withholds the answer',async()=>{
  const otherKey='e'.repeat(64),created=await manage(dev,'issue-key',{toolId:tool.id,keyHash:otherKey});
  const response=await pg.query('select public.zuri_tool_runtime($1,$2,$3,$4,$5)',[otherKey,token2,'ai.space-answer',{question:'Space details please?',reservedMicros:10},randomUUID()]);
  const reservation=response.rows[0].zuri_tool_runtime;
  await manage(dev,'revoke-key',{keyId:created.id});
  const settled=await pg.query('select public.zuri_tool_ai_settle($1,$2,$3,$4,$5)',[reservation.reservationId,{answer:'Must not be disclosed'},3,5,1]);
  assert.equal(settled.rows[0].zuri_tool_ai_settle.withheld,true);
  assert.equal((await manage(dev,'snapshot')).budgets[0].spent_micros,37);
 });
 await t.test('loss of canonical manager authority and suspension block new operations',async()=>{
  await pg.query('update public.zuri_pamoja_managers set revoked_at=now() where user_id=$1',[manager]);
  await assert.rejects(runtime('space.read',{},randomUUID(),token2),/Installation/);
  await pg.query('update public.zuri_pamoja_managers set revoked_at=null where user_id=$1',[manager]);
  await manage(reviewer,'suspend',{toolId:tool.id,reference:'Security review requires immediate suspension'});
  await assert.rejects(runtime('space.read',{},randomUUID(),token2),/Installation/);
  assert.equal((await manage(null,'catalog')).length,0);
 });
 await t.test('browser roles cannot read tables or invoke privileged RPCs directly',async()=>{
  await pg.exec('set role authenticated');
  try{await assert.rejects(pg.query('select * from public.zuri_tool_keys'),/permission denied/);await assert.rejects(manage(dev,'snapshot'),/permission denied/);}finally{await pg.exec('reset role');}
  const policies=await pg.query("select relrowsecurity from pg_class where relname='zuri_tool_installations'");assert.equal(policies.rows[0].relrowsecurity,true);
 });
});
