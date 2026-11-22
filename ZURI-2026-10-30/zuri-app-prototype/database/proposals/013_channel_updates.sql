-- Channels are usable immediately: owners broadcast updates; permitted readers read.
begin;
create table public.zuri_channel_updates (
 id uuid primary key,
 channel_id uuid not null references public.zuri_entities(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index zuri_channel_updates_channel on public.zuri_channel_updates(channel_id,created_at desc,id);
alter table public.zuri_channel_updates enable row level security;
revoke all on public.zuri_channel_updates from public,anon,authenticated;
grant select on public.zuri_channel_updates to authenticated;
grant all on public.zuri_channel_updates to service_role;
create policy channel_updates_read on public.zuri_channel_updates for select to authenticated using(
 zuri_internal.active_user(auth.uid()) and exists(
  select 1 from public.zuri_entities e where e.id=channel_id and e.kind='channel' and (
   e.owner_id=auth.uid() or e.status='published' and e.visibility='public'
   or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=auth.uid() and m.state='active')
  )
 )
);
create function zuri_internal.channel_action(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); e public.zuri_entities; p public.zuri_channel_updates; result jsonb; post_id uuid;
begin
 if not zuri_internal.active_user(a) then raise exception 'Verified active account required' using errcode='42501';end if;
 select * into e from public.zuri_entities where id=(payload->>'id')::uuid and kind='channel';
 if e.id is null or not(e.owner_id=a or e.status='published' and e.visibility='public' or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=a and m.state='active')) then raise exception 'Channel unavailable' using errcode='42501';end if;
 if action='channels.posts' then
  select coalesce(jsonb_agg(x),'[]') into result from (select id,body,created_at from public.zuri_channel_updates where channel_id=e.id order by created_at desc,id limit 100) x;
  return jsonb_build_object('channel',to_jsonb(e),'posts',result);
 elsif action='channels.publish' then
  if e.owner_id<>a or e.status not in ('published','draft') then raise exception 'Channel owner required' using errcode='42501';end if;
  if jsonb_typeof(payload->'body') is distinct from 'string' or length(trim(payload->>'body')) not between 1 and 4000 then raise exception 'Write an update between 1 and 4000 characters' using errcode='22023';end if;
  post_id:=(payload->>'request_id')::uuid;
  if post_id is null then raise exception 'Request ID required' using errcode='22023';end if;
  select * into p from public.zuri_channel_updates where id=post_id;
  if p.id is not null then
   if p.channel_id=e.id and p.author_id=a and p.body=trim(payload->>'body') then return to_jsonb(p);end if;
   raise exception 'Request ID already used' using errcode='40001';
  end if;
  if (select count(*) from public.zuri_channel_updates where author_id=a and created_at>now()-interval '1 hour')>=20 then raise exception 'Channel update limit reached' using errcode='P0001';end if;
  insert into public.zuri_channel_updates(id,channel_id,author_id,body) values(post_id,e.id,a,trim(payload->>'body')) returning * into p;
  return to_jsonb(p);
 end if;
 raise exception 'Unknown channel operation' using errcode='22023';
end $$;
revoke all on function zuri_internal.channel_action(text,jsonb) from public,anon,authenticated;

-- Keep the deployed backend's account verification, rate limit, and every other
-- action unchanged; add only the two channel actions to its dispatch.
do $$
declare definition text; marker text:=' elsif action=''entities.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position(marker in definition)=0 or position('channels.posts' in definition)>0 then raise exception 'Unexpected backend definition; inspect before applying';end if;
 definition:=replace(definition,marker,E' elsif action in (''channels.posts'',''channels.publish'') then\n  return zuri_internal.channel_action(action,payload);\n'||marker);
 execute definition;
end $$;
commit;
