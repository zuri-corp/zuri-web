-- Additive app backend. Requires 001 and existing Supabase Auth/admin_users.
-- Private data is never implicitly published or retrieved by AI.
begin;
create schema if not exists zuri_internal;
revoke all on schema zuri_internal from public;
grant usage on schema zuri_internal to anon,authenticated,service_role;

create table public.zuri_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text unique check(handle is null or handle ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
 display_name text not null check(length(trim(display_name)) between 1 and 80),
 bio text not null default '' check(length(bio)<=600),links jsonb not null default '[]' check(jsonb_typeof(links)='array' and jsonb_array_length(links)<=12),
 is_public boolean not null default false,receive_invites boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.zuri_app_records(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('task','moment','chapter','preference','automation','saved','intent','draft')),
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=48000),
 revision integer not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index zuri_app_records_owner on public.zuri_app_records(owner_id,kind,updated_at desc,id);
create table public.zuri_entities(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 kind text not null check(kind in ('space','society','channel','event','ping')),
 title text not null check(length(trim(title)) between 1 and 120),description text not null default '' check(length(description)<=4000),
 status text not null default 'draft' check(status in ('draft','pending','published','archived')),
 visibility text not null default 'private' check(visibility in ('private','public')),
 join_policy text not null default 'approval' check(join_policy in ('open','approval','invite')),
 capacity integer check(capacity between 1 and 10000),starts_at timestamptz,ends_at timestamptz,
 details jsonb not null default '{}' check(jsonb_typeof(details)='object' and octet_length(details::text)<=12000),
 consent_reference text not null default '' check(length(consent_reference)<=1000),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ends_at is null or starts_at is not null and ends_at>starts_at),
 check(status<>'published' or (reviewed_by is not null and reviewed_at is not null and length(trim(consent_reference))>=10))
);
create index zuri_entities_search on public.zuri_entities using gin(to_tsvector('english',title||' '||description));
create table public.zuri_entity_members(
 entity_id uuid references public.zuri_entities(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','manager','member')),
 state text not null default 'pending' check(state in ('pending','active','left')),created_at timestamptz not null default now(),primary key(entity_id,user_id)
);
create index zuri_entity_members_user on public.zuri_entity_members(user_id,state,entity_id);
create table public.zuri_offerings(
 id uuid primary key default gen_random_uuid(),entity_id uuid not null references public.zuri_entities(id),
 owner_id uuid not null references auth.users(id),title text not null check(length(trim(title)) between 1 and 120),
 description text not null check(length(description)<=3000),links jsonb not null default '[]' check(jsonb_typeof(links)='array' and jsonb_array_length(links)<=6),
 published boolean not null default false,created_at timestamptz not null default now()
);
create table public.zuri_conversations(id uuid primary key default gen_random_uuid(),creator_id uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.zuri_conversation_members(
 conversation_id uuid references public.zuri_conversations(id) on delete cascade,user_id uuid references auth.users(id),
 state text not null check(state in ('invited','accepted','left')),created_at timestamptz not null default now(),primary key(conversation_id,user_id)
);
create index zuri_conversation_members_user on public.zuri_conversation_members(user_id,state,conversation_id);
create table public.zuri_chat_messages(
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.zuri_conversations(id),
 sender_id uuid not null references auth.users(id),request_id uuid not null,body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),unique(sender_id,request_id)
);
create index zuri_chat_messages_thread on public.zuri_chat_messages(conversation_id,created_at desc,id);
create table public.zuri_blocks(user_id uuid references auth.users(id) on delete cascade,blocked_id uuid references auth.users(id),created_at timestamptz not null default now(),primary key(user_id,blocked_id),check(user_id<>blocked_id));
create table public.zuri_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,kind text not null,reference_id uuid,read_at timestamptz,created_at timestamptz not null default now());
create index zuri_notifications_user on public.zuri_notifications(user_id,created_at desc,id);
create table public.zuri_reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id),target_kind text not null check(target_kind in ('profile','entity','message','offering')),target_id uuid not null,reason text not null check(length(trim(reason)) between 5 and 2000),status text not null default 'pending' check(status in ('pending','reviewed','closed')),created_at timestamptz not null default now());
create table public.zuri_consents(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,purpose text not null check(purpose in ('public-profile','public-entity','media-sharing','ai-disclosure','workspace-import')),version text not null check(length(version) between 1 and 80),accepted boolean not null,created_at timestamptz not null default now());
create table public.zuri_memberships(user_id uuid primary key references auth.users(id) on delete cascade,plan text not null default 'basic' check(plan in ('basic','individual','business','team')),status text not null default 'inactive' check(status in ('inactive','active','canceled')),valid_until timestamptz,provider_reference text,updated_at timestamptz not null default now());
create table public.zuri_data_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),kind text not null check(kind in ('export','delete-account')),status text not null default 'pending' check(status in ('pending','processing','completed','rejected')),created_at timestamptz not null default now());
create table public.zuri_backend_audit(id bigint generated always as identity primary key,actor_id uuid references auth.users(id),action text not null,target_id uuid,created_at timestamptz not null default now());
create table public.zuri_backend_limits(user_id uuid references auth.users(id) on delete cascade,window_start timestamptz,requests integer not null default 0,primary key(user_id,window_start));
create table public.zuri_media_policy(id boolean primary key default true check(id),user_bytes bigint not null default 52428800 check(user_bytes between 1 and 1073741824),fleet_bytes bigint not null default 524288000 check(fleet_bytes between 1 and 1099511627776));
insert into public.zuri_media_policy(id) values(true);
create table public.zuri_media(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),bucket text not null default 'zuri-private' check(bucket='zuri-private'),
 path text not null unique,size_bytes integer not null check(size_bytes between 1 and 10485760),mime text not null check(mime in ('image/jpeg','image/png','image/webp','video/mp4','application/pdf')),
 state text not null default 'reserved' check(state in ('reserved','ready','removed')),created_at timestamptz not null default now(),
 check(path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|mp4|pdf)$')
);

create function zuri_internal.active_user(a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=a and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now()));
$$;
create function zuri_internal.read_entity(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.zuri_entities e where e.id=target and ((e.status='published' and e.visibility='public') or (zuri_internal.active_user(auth.uid()) and (e.owner_id=auth.uid() or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=auth.uid() and m.state='active')))));
$$;
create function zuri_internal.read_chat(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select zuri_internal.active_user(auth.uid()) and exists(select 1 from public.zuri_conversation_members where conversation_id=target and user_id=auth.uid() and state='accepted');
$$;
create function zuri_internal.safe_links(items jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(items)='array' and jsonb_array_length(items)<=12 and not exists(select 1 from jsonb_array_elements(items) x where jsonb_typeof(x)<>'object' or coalesce(x->>'url','') !~ '^https://[^/@[:space:]]+([/?#].*)?$' or length(coalesce(x->>'url',''))>500 or length(coalesce(x->>'title',''))>80);
$$;
revoke all on all functions in schema zuri_internal from public;
grant execute on function zuri_internal.active_user(uuid),zuri_internal.read_entity(uuid),zuri_internal.read_chat(uuid),zuri_internal.safe_links(jsonb) to anon,authenticated,service_role;

do $$ declare t text; begin
 foreach t in array array['zuri_profiles','zuri_app_records','zuri_entities','zuri_entity_members','zuri_offerings','zuri_conversations','zuri_conversation_members','zuri_chat_messages','zuri_blocks','zuri_notifications','zuri_reports','zuri_consents','zuri_memberships','zuri_data_requests','zuri_backend_audit','zuri_backend_limits','zuri_media_policy','zuri_media'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.zuri_profiles,public.zuri_entities,public.zuri_offerings to anon,authenticated;
grant select on public.zuri_app_records,public.zuri_entity_members,public.zuri_conversations,public.zuri_conversation_members,public.zuri_chat_messages,public.zuri_blocks,public.zuri_notifications,public.zuri_reports,public.zuri_consents,public.zuri_memberships,public.zuri_data_requests,public.zuri_media to authenticated;
create policy profile_read on public.zuri_profiles for select using(is_public or user_id=auth.uid() and zuri_internal.active_user(auth.uid()));
create policy records_read on public.zuri_app_records for select to authenticated using(owner_id=auth.uid() and zuri_internal.active_user(auth.uid()));
create policy entities_read on public.zuri_entities for select using(zuri_internal.read_entity(id));
create policy entity_members_read on public.zuri_entity_members for select to authenticated using(user_id=auth.uid() and zuri_internal.active_user(auth.uid()));
create policy offerings_read on public.zuri_offerings for select using(owner_id=auth.uid() and zuri_internal.active_user(auth.uid()) or published and exists(select 1 from public.zuri_entities e where e.id=entity_id and e.status='published' and zuri_internal.read_entity(e.id)));
create policy conversations_read on public.zuri_conversations for select to authenticated using(zuri_internal.read_chat(id));
create policy conversation_members_read on public.zuri_conversation_members for select to authenticated using(user_id=auth.uid() and zuri_internal.active_user(auth.uid()) or zuri_internal.read_chat(conversation_id));
create policy messages_read on public.zuri_chat_messages for select to authenticated using(zuri_internal.read_chat(conversation_id));
do $$ declare t text; field text; begin
 foreach t in array array['zuri_blocks','zuri_notifications','zuri_reports','zuri_consents','zuri_memberships','zuri_data_requests','zuri_media'] loop
 field:=case when t='zuri_media' then 'owner_id' when t='zuri_reports' then 'reporter_id' else 'user_id' end;
 execute format('create policy own_read on public.%I for select to authenticated using(%I=auth.uid() and zuri_internal.active_user(auth.uid()))',t,field);
 end loop;
end $$;

create function public.zuri_backend(action text,payload jsonb default '{}') returns jsonb
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
  if base=0 then
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
revoke all on function public.zuri_backend(text,jsonb) from public,anon;
grant execute on function public.zuri_backend(text,jsonb) to authenticated;

create function public.zuri_backend_review(actor uuid,target uuid,decision text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not zuri_internal.active_user(actor) or not exists(select 1 from public.admin_users where user_id=actor) then raise exception 'Administrator required' using errcode='42501';end if;
 if decision not in ('published','archived') then raise exception 'Invalid decision' using errcode='22023';end if;
 update public.zuri_entities set status=decision,reviewed_by=actor,reviewed_at=now(),updated_at=now() where id=target and status in ('pending','published');
 if not found then raise exception 'Submitted entity required' using errcode='22023';end if;
 insert into public.zuri_backend_audit(actor_id,action,target_id) values(actor,'entity-'||decision,target);return '{"reviewed":true}';
end $$;
revoke all on function public.zuri_backend_review(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.zuri_backend_review(uuid,uuid,text) to service_role;

create function public.zuri_media_operation(actor uuid,operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.zuri_media_policy;m public.zuri_media;bytes integer;ext text;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if operation='reserve' then
  select * into p from public.zuri_media_policy where id for update;
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
revoke all on function public.zuri_media_operation(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.zuri_media_operation(uuid,text,jsonb) to service_role;

create function public.zuri_discover(query text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]') from (select 'entity' kind,e.id,e.title name,e.description,e.kind entity_kind from public.zuri_entities e where e.status='published' and e.visibility='public' and length(trim(query)) between 2 and 100 and to_tsvector('english',e.title||' '||e.description) @@ websearch_to_tsquery('english',query)
 union all select 'person',p.user_id,p.display_name,p.bio,'person' from public.zuri_profiles p where p.is_public and length(trim(query)) between 2 and 100 and to_tsvector('english',p.display_name||' '||p.bio) @@ websearch_to_tsquery('english',query) limit 30) x;
$$;
revoke all on function public.zuri_discover(text) from public;
grant execute on function public.zuri_discover(text) to anon,authenticated;
commit;
