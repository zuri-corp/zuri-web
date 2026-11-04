import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

test('explicit AI pilot provisioning requires approved inputs and preserves usage',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);');
 const [pilot,other,unverified]=[randomUUID(),randomUUID(),randomUUID()];
 await pg.query('insert into auth.users values($1,now(),null,null),($2,now(),null,null),($3,null,null,null)',[pilot,other,unverified]);
 await pg.exec(await readFile(new URL('../database/proposals/006_zuri_ai_gateway.sql',import.meta.url),'utf8'));
 const template=await readFile(new URL('../database/operations/enable_ai_pilot.sql',import.meta.url),'utf8');
 const operation=(id=pilot,monthly=1000000,daily=2000000)=>template.replace('target_user_id uuid := null;',`target_user_id uuid := '${id}';`).replace('monthly_limit_micros bigint := null;',`monthly_limit_micros bigint := ${monthly};`).replace('fleet_daily_limit_micros bigint := null;',`fleet_daily_limit_micros bigint := ${daily};`);
 const status=async id=>(await pg.query('select public.zuri_ai_status($1) as value',[id])).rows[0].value;
 const reject=async(sql,pattern)=>{await assert.rejects(pg.exec(sql),pattern);await pg.exec('rollback');};
 await t.test('unfilled template, invalid caps and unverified identities cannot activate the policy',async()=>{
  await reject(template,/Choose a verified/);
  await reject(operation(pilot,0),/outside/);
  await reject(operation(unverified),/verified, active/);
  assert.equal((await status(pilot)).enabled,false);
  assert.equal((await pg.query('select count(*)::integer n from public.zuri_ai_accounts')).rows[0].n,0);
 });
 await t.test('only the selected account receives an allowance; browser roles cannot use it directly',async()=>{
  await pg.exec(operation());
  assert.equal((await status(pilot)).enabled,true);assert.equal((await status(pilot)).monthlyLimitMicros,1000000);
  assert.equal((await status(other)).enabled,false);assert.equal((await status(other)).monthlyLimitMicros,0);
  for(const role of ['anon','authenticated']){
   await pg.exec(`set role ${role}`);
   await assert.rejects(status(pilot),/permission denied/);
   await assert.rejects(pg.query('select * from public.zuri_ai_accounts'),/permission denied/);
   await pg.exec('reset role');
  }
  await pg.exec('set role service_role');assert.equal((await status(pilot)).enabled,true);await pg.exec('reset role');
 });
 const request=randomUUID();
 await pg.query("select public.zuri_ai_reserve($1,$2,$3,'guide','test-model',100,1000000,1000000)",[pilot,request,'a'.repeat(64)]);
 await t.test('re-provisioning does not clear held requests or overwrite other explicit accounts',async()=>{
  await pg.query('insert into public.zuri_ai_accounts values($1,false,123)',[other]);
  await pg.exec(operation(pilot,2000000,3000000));
  assert.equal((await status(pilot)).heldMicros,100);
  assert.equal((await pg.query('select count(*)::integer n from public.zuri_ai_requests')).rows[0].n,1);
  assert.deepEqual((await pg.query('select enabled,monthly_limit_micros::integer cap from public.zuri_ai_accounts where user_id=$1',[other])).rows[0],{enabled:false,cap:123});
  await reject(operation(pilot,50),/held\/spent/);
  assert.equal((await status(pilot)).monthlyLimitMicros,2000000);
  assert.equal((await status(pilot)).heldMicros,100);
 });
 await pg.query('select public.zuri_ai_settle($1,$2,10,10,20)',[pilot,request]);
 await t.test('settled costs survive provisioning and revocation stops further use',async()=>{
  await pg.exec(operation());assert.equal((await status(pilot)).spentMicros,20);
  await pg.query('update public.zuri_ai_accounts set enabled=false where user_id=$1',[pilot]);
  assert.equal((await status(pilot)).enabled,false);
 });
 await t.test('owner-approved email configuration waits for an app account and uses the exact USD caps',async()=>{
  await pg.exec('alter table auth.users add column email text');
  const selected=await readFile(new URL('../database/operations/activate_zuri_owner_pilot.sql',import.meta.url),'utf8');
  await reject(selected,/Choose a verified/);
  await pg.query("update auth.users set email='zuri.incorp@gmail.com' where id=$1",[pilot]);
  await pg.exec(selected);
  const current=await status(pilot);assert.equal(current.enabled,true);assert.equal(current.monthlyLimitMicros,3000000);assert.equal(current.spentMicros,20);
  assert.equal((await pg.query('select daily_limit_micros::integer cap from public.zuri_ai_policy')).rows[0].cap,5000000);
 });
});
