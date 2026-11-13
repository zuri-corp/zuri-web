import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';
test('app backend isolates people, communities, messages, storage and authority',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());const [a,b,c,admin,unverified]=Array.from({length:5},()=>randomUUID());
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.admin_users(user_id uuid primary key references auth.users(id));`);
 for(const id of [a,b,c,admin])await pg.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[id]);await pg.query('insert into auth.users(id) values($1)',[unverified]);await pg.query('insert into public.admin_users values($1)',[admin]);
 await pg.exec(await readFile(new URL('../database/proposals/008_app_backend.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../database/proposals/011_shared_profile_onboarding.sql',import.meta.url),'utf8'));
 const as=async id=>{await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await pg.exec(id?'set role authenticated':'set role anon');};
 const rpc=async(action,payload={})=>(await pg.query('select public.zuri_backend($1,$2) value',[action,payload])).rows[0].value;
 const reviewer=async(id,decision='published')=>{await pg.exec('reset role');return pg.query('select public.zuri_backend_review($1,$2,$3)',[admin,id,decision]);};
 await as(a);
 const awaitingChannel=await rpc('entities.create',{kind:'channel',title:'Earlier Rizz channel',visibility:'public',consent:true,consent_reference:'Creator confirms public channel.'});
 await rpc('entities.submit',{id:awaitingChannel.id});
 await pg.exec('reset role');
 await pg.exec(await readFile(new URL('../database/proposals/012_rizz_channels_publish_immediately.sql',import.meta.url),'utf8'));
 await as(a);
 const existingChannels=await rpc('entities.list');
 assert.equal(existingChannels.find(e=>e.id===awaitingChannel.id).status,'published');
 assert.equal(existingChannels.find(e=>e.id===awaitingChannel.id).reviewed_by,null);
 await t.test('anonymous, unverified and forged owner fields cannot authorize private operations',async()=>{
  await as(null);await assert.rejects(rpc('account.get'),/permission denied/);await as(unverified);await assert.rejects(rpc('account.get'),/Verified/);
  await as(a);const own=await rpc('profile.save',{display_name:'Alice',bio:'private bio',user_id:b,role:'admin'});assert.equal(own.user_id,a);
  await assert.rejects(pg.query('update public.zuri_memberships set status=\'active\''),/permission denied/);
  await assert.rejects(pg.query('select public.zuri_backend_review($1,$2,$3)',[a,randomUUID(),'published']),/permission denied/);
  await as(null);await assert.rejects(pg.query('select * from public.zuri_profiles'),/permission denied/);
 });
 await t.test('shared onboarding requires visibility choice and keeps profile photos private and owner-bound',async()=>{
  await as(a);
  const privateProfile=(await pg.query('select public.zuri_profile_save($1) value',[
   {display_name:'Alice Example',bio:'A short introduction',handle:'alice_example',location:'Nairobi',links:[],is_public:false,receive_invites:true}
  ])).rows[0].value;
  assert.equal(privateProfile.location,'Nairobi');
  assert.equal(privateProfile.receive_invites,false);
  assert.equal(privateProfile.avatar_media_id,null);
  await assert.rejects(rpc('profile.save',{display_name:'Alice Example',is_public:true}),/Choose public-profile consent first/);
  await assert.rejects(pg.query('select public.zuri_profile_save($1)',[
   {display_name:'Alice Example',is_public:true,avatar_media_id:randomUUID()}
  ]),/Choose an uploaded profile image/);
  const otherMedia=randomUUID();
  await pg.exec('reset role');
  await pg.query("insert into public.zuri_media(id,owner_id,path,size_bytes,mime,state) values($1,$2,$3,20,'image/png','ready')",[otherMedia,b,`${b}/${otherMedia}.png`]);
  await as(a);
  await assert.rejects(pg.query('select public.zuri_profile_save($1)',[
   {display_name:'Alice Example',is_public:true,avatar_media_id:otherMedia}
  ]),/Choose an uploaded profile image/);
  const ownMedia=randomUUID();
  await pg.exec('reset role');
  await pg.query("insert into public.zuri_media(id,owner_id,path,size_bytes,mime,state) values($1,$2,$3,20,'image/webp','ready')",[ownMedia,a,`${a}/${ownMedia}.webp`]);
  await as(a);
  const publicProfile=(await pg.query('select public.zuri_profile_save($1) value',[
   {display_name:'Alice Example',bio:'A short introduction',handle:'alice_example',location:'Nairobi',links:[{title:'Portfolio',url:'https://example.test/alice'}],is_public:true,receive_invites:true,avatar_media_id:ownMedia}
  ])).rows[0].value;
  assert.equal(publicProfile.avatar_media_id,ownMedia);
  assert.equal((await pg.query("select accepted from public.zuri_consents where user_id=$1 and purpose='public-profile' order by created_at desc limit 1",[a])).rows[0].accepted,true);
  await as(null);
  const discovered=(await pg.query("select public.zuri_discover('Alice Example') value")).rows[0].value;
  assert.equal(discovered[0].location,'Nairobi');
  assert.equal(discovered[0].handle,'alice_example');
  assert.deepEqual(discovered[0].links,[{title:'Portfolio',url:'https://example.test/alice'}]);
  assert.equal(Object.hasOwn(discovered[0],'avatar_media_id'),false);
  await assert.rejects(pg.query('select avatar_media_id from public.zuri_profiles'),/permission denied/);
  await as(b);
  await assert.rejects(pg.query('select public.zuri_profile_save($1)',[{display_name:'Bob',location:'x'.repeat(101),is_public:false}]),/Check your name/);
  await pg.exec('reset role');
  await pg.query('delete from public.zuri_media where id=$1',[otherMedia]);
 });
 const recordId=randomUUID();
 await t.test('private work has optimistic concurrency and cannot be read or overwritten across accounts',async()=>{
  await as(a);const saved=await rpc('records.put',{id:recordId,revision:0,kind:'task',content:{text:'Private task'},owner_id:b});assert.equal(saved.owner_id,a);assert.equal(saved.revision,1);
  await as(b);assert.deepEqual(await rpc('records.list'),[]);assert.equal((await pg.query('select * from public.zuri_app_records')).rows.length,0);
  await assert.rejects(rpc('records.put',{id:recordId,revision:1,kind:'task',content:{text:'Stolen'}}),/changed or unavailable/);
  await as(a);assert.equal((await rpc('records.put',{id:recordId,revision:1,kind:'task',content:{text:'Updated'}})).revision,2);
  await assert.rejects(rpc('records.put',{id:recordId,revision:1,kind:'task',content:{text:'Stale'}}),/changed/);
 });
 let entity;
 await t.test('Spaces need consent and review; strangers cannot self-publish or admit themselves',async()=>{
  await as(a);await assert.rejects(rpc('entities.create',{kind:'space',title:'Cafe'}),/authority/);
  entity=await rpc('entities.create',{kind:'space',title:'Test cafe',description:'A real owner draft',visibility:'public',join_policy:'approval',capacity:2,consent:true,consent_reference:'I represent this establishment.'});
  await as(null);assert.equal((await pg.query('select * from public.zuri_entities where id=$1',[entity.id])).rows.length,0);
  await as(a);await rpc('entities.submit',{id:entity.id});await reviewer(entity.id);await as(b);
  assert.equal((await rpc('entities.join',{id:entity.id})).state,'pending');await assert.rejects(rpc('entities.admit',{id:entity.id,user_id:b}),/Owner/);
  await as(a);assert.equal((await rpc('entities.admit',{id:entity.id,user_id:b})).admitted,true);
  await as(c);await rpc('entities.join',{id:entity.id});await as(a);await assert.rejects(rpc('entities.admit',{id:entity.id,user_id:c}),/capacity/);
  await as(null);assert.equal((await pg.query('select public.zuri_discover($1) value',['cafe'])).rows[0].value.length,1);
 });
 await t.test('public Rizz channels publish immediately without changing the review flow for other entities',async()=>{
  await as(a);
  const channel=await rpc('entities.create',{kind:'channel',title:'Open Rizz channel',description:'Available when created',visibility:'public',join_policy:'approval',consent:true,consent_reference:'Creator confirms this public listing.'});
  assert.equal(channel.status,'published');
  assert.equal(channel.reviewed_by,null);
  assert.equal(channel.reviewed_at,null);
  const privateChannel=await rpc('entities.create',{kind:'channel',title:'Private Rizz channel',visibility:'private',consent:true,consent_reference:'Creator confirms this private channel.'});
  assert.equal(privateChannel.status,'draft');
  await as(null);
  const discovered=(await pg.query("select public.zuri_discover($1) value",['Open Rizz channel'])).rows[0].value;
  assert.ok(discovered.some(item=>item.kind==='entity'&&item.entity_kind==='channel'&&item.id===channel.id));
 });
 let chat;
 await t.test('only opted-in recipients can be invited; acceptance precedes message delivery',async()=>{
  await as(b);await pg.query('select public.zuri_profile_save($1)',[{display_name:'Bob',is_public:true,receive_invites:true}]);await as(a);chat=await rpc('chats.invite',{user_id:b});
  await assert.rejects(rpc('chats.send',{id:chat.id,request_id:randomUUID(),body:'Too early'}),/Accepted/);
  await as(c);await assert.rejects(rpc('chats.accept',{id:chat.id}),/Your invitation/);await assert.rejects(rpc('chats.messages',{id:chat.id}),/membership/);
  await as(b);await rpc('chats.accept',{id:chat.id});await as(a);const request=randomUUID();const sent=await rpc('chats.send',{id:chat.id,request_id:request,body:'Hello'});assert.equal(sent.sender_id,a);
  assert.equal((await rpc('chats.send',{id:chat.id,request_id:request,body:'Hello'})).id,sent.id);
  await assert.rejects(rpc('chats.send',{id:chat.id,request_id:request,body:'Changed'}),/already used/);
  await as(b);assert.equal((await rpc('chats.messages',{id:chat.id})).length,1);assert.ok((await rpc('notifications.list')).length>0);
  await rpc('blocks.set',{user_id:a,blocked:true});await as(a);await assert.rejects(rpc('chats.send',{id:chat.id,request_id:randomUUID(),body:'Blocked'}),/unblocked/);
  await as(c);assert.equal((await pg.query('select * from public.zuri_chat_messages')).rows.length,0);
 });
 await t.test('storage reservations enforce ownership and quotas; no browser role can mint media authority',async()=>{
  await as(a);await assert.rejects(pg.query("select public.zuri_media_operation($1,'reserve',$2)",[a,{size:100,mime:'image/png'}]),/permission denied/);
  await pg.exec('reset role');const media=(await pg.query("select public.zuri_media_operation($1,'reserve',$2) value",[a,{size:1024,mime:'image/png'}])).rows[0].value;
  assert.match(media.path,new RegExp('^'+a+'/'));await assert.rejects(pg.query("select public.zuri_media_operation($1,'read',$2)",[b,{id:media.id}]),/Your media/);
  await assert.rejects(pg.query("select public.zuri_media_operation($1,'read',$2)",[a,{id:media.id}]),/unavailable/);
  await pg.query("select public.zuri_media_operation($1,'ready',$2)",[a,{id:media.id}]);
  await pg.exec('update public.zuri_media_policy set user_bytes=1024');await assert.rejects(pg.query("select public.zuri_media_operation($1,'reserve',$2)",[a,{size:1,mime:'image/png'}]),/allowance/);
  await as(b);assert.equal((await pg.query('select * from public.zuri_media')).rows.length,0);
 });
 await t.test('revoked users lose data access and mutation rights, and rate limits are durable',async()=>{
  await pg.exec('reset role');await pg.query("update auth.users set banned_until=now()+interval '1 day' where id=$1",[c]);await as(c);await assert.rejects(rpc('account.get'),/Verified/);
  await as(b);for(let i=0;i<61;i++){try{await rpc('account.get');}catch(e){assert.match(e.message,/limit/);return;}}assert.fail('Expected a durable rate limit');
 });
});
