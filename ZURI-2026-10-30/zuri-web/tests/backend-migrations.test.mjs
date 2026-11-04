import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import {PGlite} from '@electric-sql/pglite';
test('complete backend migrations coexist; verified owner bootstrap and storage remain closed to strangers',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.admin_users(user_id uuid primary key references auth.users(id));
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant all on storage.objects to authenticated,service_role;
 create table public.enquiries(id uuid primary key default gen_random_uuid());create table public.enquiry_notes(id uuid primary key);`);
 for(const file of ['001_curated_website_content.sql','002_verified_management_and_moments.sql','003_basic_accounts_and_contributions.sql','004-pamoja-intake-photos.sql','005_developer_studio.sql','006_zuri_ai_gateway.sql','007_opportunity_engine.sql','008_app_backend.sql','009_storage_and_account_bootstrap.sql','010_backend_hardening.sql']){
  try{await pg.exec(await readFile(new URL('../database/proposals/'+file,import.meta.url),'utf8'));}catch(e){e.message=file+': '+e.message;throw e;}
 }
 const owner=randomUUID(),stranger=randomUUID();
 await pg.exec('update public.zuri_ai_policy set daily_limit_micros=5000000');
 await pg.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[owner,'zuri.incorp@gmail.com',stranger,'example@example.test']);
 await t.test('signup alone does not grant access; verification binds the exact approved identity',async()=>{
  assert.equal((await pg.query('select count(*)::integer n from public.zuri_ai_accounts')).rows[0].n,0);
  await pg.query('update auth.users set email_confirmed_at=now() where id=$1',[owner]);
  const account=(await pg.query('select enabled,monthly_limit_micros::integer amount from public.zuri_ai_accounts where user_id=$1',[owner])).rows[0];assert.deepEqual(account,{enabled:true,amount:3000000});
  assert.equal((await pg.query('select enabled from public.zuri_ai_policy')).rows[0].enabled,true);
  assert.equal((await pg.query('select count(*)::integer n from public.admin_users')).rows[0].n,0);
  await pg.query('update auth.users set email_confirmed_at=now() where id=$1',[stranger]);
  assert.equal((await pg.query('select count(*)::integer n from public.zuri_ai_accounts')).rows[0].n,1);
 });
 await t.test('changing the approved email revokes its allowance and cannot pass the grant to a new identity',async()=>{
  await pg.query("update auth.users set email='changed@example.test' where id=$1",[owner]);
  assert.equal((await pg.query('select enabled from public.zuri_ai_accounts where user_id=$1',[owner])).rows[0].enabled,false);
  const replacement=randomUUID();await pg.query("insert into auth.users(id,email,email_confirmed_at) values($1,'zuri.incorp@gmail.com',now())",[replacement]);
  assert.equal((await pg.query('select count(*)::integer n from public.zuri_ai_accounts where user_id=$1',[replacement])).rows[0].n,0);
 });
 await t.test('every bucket is private and browser roles cannot self-authorize storage or bootstrap grants',async()=>{
  assert.ok((await pg.query('select public from storage.buckets')).rows.every(b=>b.public===false));
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[stranger]);await pg.exec('set role authenticated');
  await assert.rejects(pg.query("insert into storage.objects(bucket_id,name) values('zuri-private',$1)",[stranger+'/forged.png']),/row-level security/);
  await assert.rejects(pg.query('select * from public.zuri_account_bootstrap'),/permission denied/);
  await pg.exec('reset role');
 });

 await t.test('public intake has durable per-client and fleet limits and cannot be called by browser roles',async()=>{
  await pg.exec('set role anon');await assert.rejects(pg.query('select public.zuri_intake_reserve($1,0)',['b'.repeat(64)]),/permission denied/);await pg.exec('reset role');
  for(let i=0;i<5;i++)await pg.query('select public.zuri_intake_reserve($1,0)',['b'.repeat(64)]);
  await assert.rejects(pg.query('select public.zuri_intake_reserve($1,0)',['b'.repeat(64)]),/limit/);
  await pg.exec('update public.zuri_intake_policy set staging_bytes=10');await assert.rejects(pg.query('select public.zuri_intake_reserve($1,11)',['c'.repeat(64)]),/limit/);
 });
 await t.test('retried record creation is idempotent, while changed reuse fails',async()=>{
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[stranger]);await pg.exec('set role authenticated');const id=randomUUID(),payload={id,revision:0,kind:'task',content:{text:'A saved task'}};
  const put=async p=>(await pg.query("select public.zuri_backend('records.put',$1) value",[p])).rows[0].value;
  const first=await put(payload),again=await put(payload);assert.equal(first.id,again.id);assert.equal(again.revision,1);await assert.rejects(put({...payload,content:{text:'Changed'}}),/already used/);await pg.exec('reset role');
 });
 assert.equal((await pg.query("select count(*)::integer n from pg_tables where schemaname='public' and tablename like 'zuri_%' and not rowsecurity")).rows[0].n,0);
});
