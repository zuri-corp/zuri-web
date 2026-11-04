-- Existing app schema hardening and durable public intake controls.
begin;
revoke all on public.admin_users,public.enquiries,public.enquiry_notes from public,anon,authenticated;
grant all on public.admin_users,public.enquiries,public.enquiry_notes to service_role;
create table public.zuri_intake_policy(id boolean primary key default true check(id),daily_requests integer not null default 100 check(daily_requests between 1 and 10000),client_hour_requests integer not null default 5 check(client_hour_requests between 1 and 1000),staging_bytes bigint not null default 104857600 check(staging_bytes between 1 and 1073741824));
insert into public.zuri_intake_policy(id) values(true);
create table public.zuri_intake_usage(id uuid primary key default gen_random_uuid(),key_digest text not null check(key_digest ~ '^[a-f0-9]{64}$'),photo_bytes integer not null check(photo_bytes between 0 and 6291456),created_at timestamptz not null default now());
create index zuri_intake_usage_rate on public.zuri_intake_usage(key_digest,created_at);
alter table public.zuri_intake_policy enable row level security;alter table public.zuri_intake_usage enable row level security;
revoke all on public.zuri_intake_policy,public.zuri_intake_usage from public,anon,authenticated;
grant all on public.zuri_intake_policy,public.zuri_intake_usage to service_role;
create function public.zuri_intake_reserve(key_digest text,photo_bytes integer) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.zuri_intake_policy;result uuid;begin
 if key_digest is null or key_digest !~ '^[a-f0-9]{64}$' or photo_bytes is null or photo_bytes not between 0 and 6291456 then raise exception 'Invalid intake reservation' using errcode='22023';end if;
 select * into p from public.zuri_intake_policy where id for update;
 if not found then raise exception 'Intake policy unavailable' using errcode='42501';end if;
 if (select count(*) from public.zuri_intake_usage where created_at>now()-interval '1 hour' and zuri_intake_usage.key_digest=zuri_intake_reserve.key_digest)>=p.client_hour_requests or (select count(*) from public.zuri_intake_usage where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=p.daily_requests or (select coalesce(sum(u.photo_bytes),0) from public.zuri_intake_usage u)+photo_bytes>p.staging_bytes then raise exception 'Public intake limit reached' using errcode='P0001';end if;
 insert into public.zuri_intake_usage(key_digest,photo_bytes) values(key_digest,photo_bytes) returning id into result;return result;
end $$;
revoke all on function public.zuri_intake_reserve(text,integer) from public,anon,authenticated;
grant execute on function public.zuri_intake_reserve(text,integer) to service_role;
create or replace function public.zuri_backend(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); target uuid; other uuid; record public.zuri_app_records; entity public.zuri_entities; message public.zuri_chat_messages;
 result jsonb; n integer; k text; base integer; next_state text;
begin
 if not zuri_internal.active_user(a) then raise exception 'Verified active account required' using errcode='42501'; end if;
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>60000 then raise exception 'Invalid payload' using errcode='22023'; end if;
 insert into public.zuri_backend_limits(user_id,window_start,requests) values(a,date_trunc('minute',now()),1)
 on conflict(user_id,window_start) do update set requests=public.zuri_backend_limits.requests+1 returning requests into n;
 if n>60 then raise exception 'Request limit reached' using errcode='P0001'; end if;
 if action='account.get' then
  return jsonb_build_object('user_id',a,'profile',(select to_jsonb(p) from public.zuri_profiles p where p.user_id=a),'membership',(select jsonb_build_object('plan',m.plan,'status',m.status,'valid_until',m.valid_until) from public.zuri_memberships m where m.user_id=a));
 elsif action='profile.save' then
  if not zuri_internal.safe_links(coalesce(payload->'links','[]')) then raise exception 'Use public HTTPS links' using errcode='22023'; end if;
  insert into public.zuri_profiles(user_id,handle,display_name,bio,links,is_public,receive_invites) values(a,nullif(lower(payload->>'handle'),''),trim(payload->>'display_name'),coalesce(payload->>'bio',''),coalesce(payload->'links','[]'),coalesce((payload->>'is_public')::boolean,false),coalesce((payload->>'receive_invites')::boolean,false))
  on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,links=excluded.links,is_public=excluded.is_public,receive_invites=excluded.receive_invites,updated_at=now() returning to_jsonb(zuri_profiles.*) into result;
  return result;
 elsif action='records.list' then
  return coalesce((select jsonb_agg(x) from (select * from public.zuri_app_records where owner_id=a and (payload->>'kind' is null or kind=payload->>'kind') order by updated_at desc,id limit 100) x),'[]');
 elsif action='records.put' then
  target:=(payload->>'id')::uuid;base:=(payload->>'revision')::integer;
  if target is null or base is null or base<0 or jsonb_typeof(payload->'content') is distinct from 'object' then raise exception 'Record ID, revision and content required' using errcode='22023'; end if;
  if payload->>'kind'='task' and (jsonb_typeof(payload#>'{content,text}') is distinct from 'string' or length(trim(payload#>>'{content,text}')) not between 1 and 500 or ((payload->'content') ? 'done' and jsonb_typeof(payload#>'{content,done}') is distinct from 'boolean')) then raise exception 'Valid task text and completion status required' using errcode='22023';end if;
  if base=0 then
   select * into record from public.zuri_app_records where id=target;
   if record.id is not null then
    if record.owner_id=a and record.kind=payload->>'kind' and record.content=payload->'content' then return to_jsonb(record);end if;
    raise exception 'Request ID already used' using errcode='40001';
   end if;
   if (select count(*) from public.zuri_app_records where owner_id=a)>=2000 then raise exception 'Record limit reached' using errcode='P0001';end if;
   insert into public.zuri_app_records(id,owner_id,kind,content) values(target,a,payload->>'kind',payload->'content') returning * into record;
  else
   update public.zuri_app_records set content=payload->'content',revision=revision+1,updated_at=now() where id=target and owner_id=a and revision=base and kind=payload->>'kind' returning * into record;
   if not found then raise exception 'Record changed or unavailable' using errcode='40001';end if;
  end if;return to_jsonb(record);
 elsif action='records.delete' then
  delete from public.zuri_app_records where id=(payload->>'id')::uuid and owner_id=a and revision=(payload->>'revision')::integer;
  if not found then raise exception 'Record changed or unavailable' using errcode='40001';end if;return '{"deleted":true}';
 elsif action='entities.list' then
  return coalesce((select jsonb_agg(x) from (select e.* from public.zuri_entities e where e.owner_id=a or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=a and m.state<>'left') order by updated_at desc limit 100) x),'[]');
 elsif action='entities.create' then
  if payload->'consent' is distinct from 'true'::jsonb or length(trim(coalesce(payload->>'consent_reference','')))<10 then raise exception 'Confirm your authority and publication choices' using errcode='22023';end if;
  if (select count(*) from public.zuri_entities where owner_id=a and created_at>now()-interval '1 day')>=10 then raise exception 'Creation limit reached' using errcode='P0001';end if;
  insert into public.zuri_entities(owner_id,kind,title,description,visibility,join_policy,capacity,starts_at,ends_at,details,consent_reference)
   values(a,payload->>'kind',trim(payload->>'title'),coalesce(payload->>'description',''),coalesce(payload->>'visibility','private'),coalesce(payload->>'join_policy','approval'),(payload->>'capacity')::integer,(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,coalesce(payload->'details','{}'),payload->>'consent_reference') returning * into entity;
  insert into public.zuri_entity_members(entity_id,user_id,role,state) values(entity.id,a,'owner','active');return to_jsonb(entity);
 elsif action='entities.submit' then
  update public.zuri_entities set status='pending',updated_at=now() where id=(payload->>'id')::uuid and owner_id=a and status in ('draft','pending') returning * into entity;
  if not found then raise exception 'Your draft only' using errcode='42501';end if;return to_jsonb(entity);
 elsif action='entities.join' then
  select * into entity from public.zuri_entities where id=(payload->>'id')::uuid for update;
  if entity.id is null or entity.status<>'published' or entity.visibility<>'public' or entity.join_policy='invite' then raise exception 'Published joinable community required' using errcode='42501';end if;
  if entity.owner_id=a then return '{"state":"active"}';end if;
  if exists(select 1 from public.zuri_entity_members where entity_id=entity.id and user_id=a and state='active') then return '{"state":"active"}';end if;
  next_state:=case when entity.join_policy='open' then 'active' else 'pending' end;
  if next_state='active' and entity.capacity is not null and (select count(*) from public.zuri_entity_members where entity_id=entity.id and state='active')>=entity.capacity then raise exception 'Community capacity reached' using errcode='P0001';end if;
  insert into public.zuri_entity_members(entity_id,user_id,state) values(entity.id,a,next_state) on conflict(entity_id,user_id) do update set state=excluded.state,role='member';return jsonb_build_object('state',next_state);
 elsif action='entities.members' then
  if not exists(select 1 from public.zuri_entities where id=(payload->>'id')::uuid and owner_id=a) then raise exception 'Owner required' using errcode='42501';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'state',m.state,'role',m.role)) from public.zuri_entity_members m where m.entity_id=(payload->>'id')::uuid),'[]');
 elsif action='entities.admit' then
  select * into entity from public.zuri_entities where id=(payload->>'id')::uuid and owner_id=a for update;
  if entity.id is null then raise exception 'Owner required' using errcode='42501';end if;
  if entity.capacity is not null and (select count(*) from public.zuri_entity_members where entity_id=entity.id and state='active')>=entity.capacity then raise exception 'Community capacity reached' using errcode='P0001';end if;
  update public.zuri_entity_members set state='active' where entity_id=entity.id and user_id=(payload->>'user_id')::uuid and state='pending';if not found then raise exception 'Pending request required' using errcode='22023';end if;return '{"admitted":true}';
 elsif action='entities.leave' then
  update public.zuri_entity_members set state='left' where entity_id=(payload->>'id')::uuid and user_id=a and role<>'owner';return '{"left":true}';
 elsif action='offerings.save' then
  select * into entity from public.zuri_entities where id=(payload->>'entity_id')::uuid and owner_id=a;
  if entity.id is null or not zuri_internal.safe_links(coalesce(payload->'links','[]')) then raise exception 'Your establishment and valid links required' using errcode='42501';end if;
  if (select count(*) from public.zuri_offerings where owner_id=a)>=100 then raise exception 'Offering limit reached' using errcode='P0001';end if;
  insert into public.zuri_offerings(entity_id,owner_id,title,description,links,published) values(entity.id,a,payload->>'title',coalesce(payload->>'description',''),coalesce(payload->'links','[]'),coalesce((payload->>'published')::boolean,false)) returning to_jsonb(zuri_offerings.*) into result;return result;
 elsif action='chats.list' then
  return coalesce((select jsonb_agg(x) from (select c.id,c.created_at,m.state,(select jsonb_agg(jsonb_build_object('user_id',cm.user_id,'state',cm.state)) from public.zuri_conversation_members cm where cm.conversation_id=c.id) as members from public.zuri_conversations c join public.zuri_conversation_members m on m.conversation_id=c.id where m.user_id=a and m.state<>'left' order by c.created_at desc limit 100) x),'[]');
 elsif action='chats.invite' then
  other:=(payload->>'user_id')::uuid;
  if other is null or other=a or not zuri_internal.active_user(other) or not exists(select 1 from public.zuri_profiles where user_id=other and is_public and receive_invites) or exists(select 1 from public.zuri_blocks where (user_id=a and blocked_id=other) or (user_id=other and blocked_id=a)) then raise exception 'Person is unavailable for invitations' using errcode='42501';end if;
  if (select count(*) from public.zuri_conversations where creator_id=a and created_at>now()-interval '1 day')>=10 then raise exception 'Invitation limit reached' using errcode='P0001';end if;
  insert into public.zuri_conversations(creator_id) values(a) returning id into target;
  insert into public.zuri_conversation_members values(target,a,'accepted',now()),(target,other,'invited',now());
  insert into public.zuri_notifications(user_id,kind,reference_id) values(other,'conversation-invitation',target);return jsonb_build_object('id',target,'state','invited');
 elsif action='chats.accept' then
  update public.zuri_conversation_members set state='accepted' where conversation_id=(payload->>'id')::uuid and user_id=a and state='invited';if not found then raise exception 'Your invitation required' using errcode='42501';end if;return '{"accepted":true}';
 elsif action='chats.messages' then
  target:=(payload->>'id')::uuid;if not zuri_internal.read_chat(target) then raise exception 'Conversation membership required' using errcode='42501';end if;
  return coalesce((select jsonb_agg(x order by x.created_at,x.id) from (select * from public.zuri_chat_messages where conversation_id=target order by created_at desc,id desc limit 100) x),'[]');
 elsif action='chats.send' then
  target:=(payload->>'id')::uuid;
  perform 1 from public.zuri_conversations where id=target for update;
  if not zuri_internal.read_chat(target) or (select count(*) from public.zuri_conversation_members where conversation_id=target and state='accepted')<2 or exists(select 1 from public.zuri_conversation_members m join public.zuri_blocks b on (b.user_id=a and b.blocked_id=m.user_id) or (b.blocked_id=a and b.user_id=m.user_id) where m.conversation_id=target) then raise exception 'Accepted, unblocked conversation required' using errcode='42501';end if;
  select * into message from public.zuri_chat_messages where sender_id=a and request_id=(payload->>'request_id')::uuid;
  if message.id is not null then if message.conversation_id<>target or message.body<>payload->>'body' then raise exception 'Request ID already used' using errcode='40001';end if;return to_jsonb(message);end if;
  insert into public.zuri_chat_messages(conversation_id,sender_id,request_id,body) values(target,a,(payload->>'request_id')::uuid,trim(payload->>'body')) returning * into message;
  insert into public.zuri_notifications(user_id,kind,reference_id) select user_id,'message',target from public.zuri_conversation_members where conversation_id=target and user_id<>a and state='accepted';return to_jsonb(message);
 elsif action='chats.leave' then
  update public.zuri_conversation_members set state='left' where conversation_id=(payload->>'id')::uuid and user_id=a;return '{"left":true}';
 elsif action='blocks.set' then
  other:=(payload->>'user_id')::uuid;
  perform 1 from public.zuri_conversations c where exists(select 1 from public.zuri_conversation_members m where m.conversation_id=c.id and m.user_id=a) and exists(select 1 from public.zuri_conversation_members m where m.conversation_id=c.id and m.user_id=other) order by c.id for update;

  if payload->'blocked'='true'::jsonb then insert into public.zuri_blocks(user_id,blocked_id) values(a,other) on conflict do nothing;else delete from public.zuri_blocks where user_id=a and blocked_id=other;end if;return '{"saved":true}';
 elsif action='notifications.list' then
  return coalesce((select jsonb_agg(x) from (select * from public.zuri_notifications where user_id=a order by created_at desc limit 100) x),'[]');
 elsif action='notifications.read' then
  update public.zuri_notifications set read_at=coalesce(read_at,now()) where id=(payload->>'id')::uuid and user_id=a;return '{"saved":true}';
 elsif action='consents.record' then
  insert into public.zuri_consents(user_id,purpose,version,accepted) values(a,payload->>'purpose',payload->>'version',(payload->>'accepted')::boolean) returning id into target;return jsonb_build_object('id',target);
 elsif action='reports.create' then
  insert into public.zuri_reports(reporter_id,target_kind,target_id,reason) values(a,payload->>'target_kind',(payload->>'target_id')::uuid,payload->>'reason') returning id into target;return jsonb_build_object('id',target);
 elsif action='data.request' then
  insert into public.zuri_data_requests(user_id,kind) values(a,payload->>'kind') returning id into target;return jsonb_build_object('id',target,'status','pending');
 elsif action='media.list' then
  return coalesce((select jsonb_agg(x) from (select id,size_bytes,mime,state,created_at from public.zuri_media where owner_id=a and state<>'removed' order by created_at desc limit 100) x),'[]');
 else raise exception 'Unsupported operation' using errcode='22023';end if;
end $$;
create or replace function public.zuri_media_operation(actor uuid,operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.zuri_media_policy;m public.zuri_media;bytes integer;ext text;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if operation='reserve' then
  select * into p from public.zuri_media_policy where id for update;
  if not found then raise exception 'Storage policy unavailable' using errcode='42501';end if;
  bytes:=(payload->>'size')::integer;ext:=case payload->>'mime' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' when 'application/pdf' then 'pdf' else null end;
  if bytes is null or bytes not between 1 and 10485760 or ext is null then raise exception 'Unsupported media' using errcode='22023';end if;
  if (select coalesce(sum(size_bytes),0) from public.zuri_media where owner_id=actor and state<>'removed')+bytes>p.user_bytes or (select coalesce(sum(size_bytes),0) from public.zuri_media where state<>'removed')+bytes>p.fleet_bytes then raise exception 'Storage allowance reached' using errcode='P0001';end if;
  m.id:=gen_random_uuid();
  insert into public.zuri_media(id,owner_id,path,size_bytes,mime) values(m.id,actor,actor::text||'/'||m.id::text||'.'||ext,bytes,payload->>'mime') returning * into m;
 elsif operation in ('ready','read','removed') then
  select * into m from public.zuri_media where id=(payload->>'id')::uuid and owner_id=actor for update;
  if m.id is null then raise exception 'Your media only' using errcode='42501';end if;
  if operation='ready' and m.state='reserved' then update public.zuri_media set state='ready' where id=m.id returning * into m;
  elsif operation='removed' then update public.zuri_media set state='removed' where id=m.id returning * into m;
  elsif operation<>'read' then raise exception 'Invalid media state' using errcode='22023';end if;
  if operation='read' and m.state<>'ready' then raise exception 'Media unavailable' using errcode='22023';end if;
 else raise exception 'Unsupported media operation' using errcode='22023';end if;return to_jsonb(m);
end $$;
create or replace function zuri_internal.bootstrap_account() returns trigger language plpgsql security definer set search_path='' as $$
declare grant_row public.zuri_account_bootstrap;
begin
 if tg_op='UPDATE' and (old.email is distinct from new.email or new.deleted_at is not null or (new.banned_until is not null and new.banned_until>now())) then
  if exists(select 1 from public.zuri_account_bootstrap where claimed_by=new.id) then
   update public.zuri_ai_accounts set enabled=false where user_id=new.id;
   if exists(select 1 from public.zuri_account_bootstrap where claimed_by=new.id and administrator) then delete from public.admin_users where user_id=new.id;end if;
  end if;
 end if;
 if new.email_confirmed_at is null or new.deleted_at is not null or (new.banned_until is not null and new.banned_until>now()) then return new;end if;
 insert into public.zuri_profiles(user_id,display_name) values(new.id,'ZURI member') on conflict do nothing;
 select * into grant_row from public.zuri_account_bootstrap where email=lower(new.email) and enabled for update;
 if grant_row.email is not null and (grant_row.claimed_by is null or grant_row.claimed_by=new.id) then
  update public.zuri_account_bootstrap set claimed_by=new.id where email=grant_row.email;
  if grant_row.administrator then insert into public.admin_users(user_id) values(new.id) on conflict do nothing;end if;
  insert into public.zuri_ai_accounts(user_id,enabled,monthly_limit_micros) values(new.id,true,grant_row.monthly_ai_micros)
   on conflict(user_id) do update set enabled=true,monthly_limit_micros=excluded.monthly_limit_micros;
  update public.zuri_ai_policy set enabled=true where id and daily_limit_micros>0;
 end if;return new;
end $$;
commit;
