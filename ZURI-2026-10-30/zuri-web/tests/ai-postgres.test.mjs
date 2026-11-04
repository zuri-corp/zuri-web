import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

test('AI gateway PostgreSQL enforces verified identity, atomic allowances and held reservations',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);`);
 const [a,b,unverified]=[randomUUID(),randomUUID(),randomUUID()];
 await pg.query('insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now()),($3,null)',[a,b,unverified]);
 await pg.exec(await readFile(new URL('../database/proposals/006_zuri_ai_gateway.sql',import.meta.url),'utf8'));
 const status=async(actor=a)=>(await pg.query('select public.zuri_ai_status($1) as value',[actor])).rows[0].value;
 const reserve=async(actor=a,id=randomUUID(),amount=100)=>(await pg.query('select public.zuri_ai_reserve($1,$2,$3,$4,$5,$6,$7,$8) as value',[actor,id,'a'.repeat(64),'intent','test-model',amount,1000000,1000000])).rows[0].value;
 const settle=async(actor,id,ins=10,outs=10,cost=20)=>(await pg.query('select public.zuri_ai_settle($1,$2,$3,$4,$5) as value',[actor,id,ins,outs,cost])).rows[0].value;
 await t.test('disabled migration cannot spend, and ordinary database users cannot call RPCs or inspect metadata',async()=>{
  assert.equal((await status()).enabled,false);await assert.rejects(reserve(),/disabled/);
  for(const role of ['anon','authenticated']){await pg.exec(`set role ${role}`);await assert.rejects(status(),/permission denied/);await assert.rejects(pg.query('select * from public.zuri_ai_requests'),/permission denied/);await pg.exec('reset role');}
 });
 await pg.exec('update public.zuri_ai_policy set enabled=true,trial_monthly_micros=1000,daily_limit_micros=1500');
 await t.test('trial limit and confirmed, unbanned account are required',async()=>{
  await assert.rejects(reserve(unverified),/Verified/);
  await pg.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[b]);await assert.rejects(reserve(b),/Verified/);
  await pg.query('update auth.users set banned_until=null where id=$1',[b]);assert.equal((await status()).remainingMicros,1000);
 });
 const id=randomUUID();await reserve(a,id);
 await t.test('same request cannot reserve twice, even with different payload or a different server worker',async()=>{
  await assert.rejects(reserve(a,id),/Already submitted/);await assert.rejects(reserve(a,id,200),/Already submitted/);
  assert.equal((await status()).heldMicros,100);assert.equal((await status()).remainingMicros,900);
 });
 await t.test('settlement recomputes cost from stored rates and is idempotent',async()=>{
  await assert.rejects(settle(a,id,10,10,1),/mismatch/);assert.equal((await status()).heldMicros,100);
  assert.equal((await settle(a,id)).settled,true);await settle(a,id);
  assert.equal((await status()).spentMicros,20);assert.equal((await status()).heldMicros,0);
  await assert.rejects(settle(a,id,11,10,21),/differs/);
 });
 await t.test('account isolation and missing reservations cannot be bypassed',async()=>{
  await assert.rejects(settle(b,id),/Reservation required/);assert.equal((await status(b)).spentMicros,0);
  const one=randomUUID();await reserve(a,one,900);await assert.rejects(reserve(a,randomUUID(),100),/Allowance exceeded/);
  await assert.rejects(settle(a,one,900,10,910),/mismatch/);
  assert.equal((await status()).heldMicros,900);
 });
 await t.test('fleet daily cap counts unsettled reservations across different accounts',async()=>{
  const outcomes=await Promise.allSettled([reserve(b,randomUUID(),400),reserve(b,randomUUID(),400)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal((await status(b)).heldMicros,400);
 });
 await t.test('disabled authority during a provider call withholds settlement and keeps hold',async()=>{
  const held=(await pg.query("select request_id from public.zuri_ai_requests where user_id=$1 and status='held'",[b])).rows[0].request_id;
  await pg.query('update public.zuri_ai_accounts set enabled=false where user_id=$1',[b]);await assert.rejects(settle(b,held),/Authority changed/);assert.equal((await status(b)).enabled,false);
  assert.equal((await status(b)).heldMicros,400);
 });
 await t.test('per-minute quota is durable across requests and modes',async()=>{
  await pg.exec('update public.zuri_ai_policy set daily_limit_micros=100000;update public.zuri_ai_accounts set monthly_limit_micros=100000');
  for(let i=0;i<4;i++)await reserve(a,randomUUID(),1);
  await assert.rejects(reserve(a,randomUUID(),1),/Slow down/);
 });
 await t.test('request journal stores no conversation, AI reply or workspace content',async()=>{
  const columns=(await pg.query("select column_name from information_schema.columns where table_name='zuri_ai_requests'")).rows.map(r=>r.column_name);
  assert.ok(!columns.some(c=>['prompt','reply','messages','context','result'].includes(c)));
  await pg.query('delete from auth.users where id=$1',[a]);assert.equal((await pg.query('select count(*) as n from public.zuri_ai_requests where user_id=$1',[a])).rows[0].n,0);
 });
});
