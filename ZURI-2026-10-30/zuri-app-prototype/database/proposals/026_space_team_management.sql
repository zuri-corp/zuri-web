begin;

-- A Space is a business presence, not a social group.  Its private team is
-- deliberately separate from zuri_entity_members (which is used by societies,
-- events, channels and pings).
create table if not exists public.zuri_space_team(
 space_id uuid not null references public.zuri_entities(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','editor','moderator','analyst','staff')),
 state text not null default 'pending' check(state in ('pending','active','removed')),
 invited_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(space_id,user_id)
);
create table if not exists public.zuri_space_transfers(
 id uuid primary key default gen_random_uuid(),
 space_id uuid not null references public.zuri_entities(id) on delete cascade,
 from_owner uuid not null references auth.users(id),
 to_owner uuid not null references auth.users(id),
 state text not null default 'pending' check(state in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 responded_at timestamptz
);
create unique index if not exists zuri_space_transfer_one_pending on public.zuri_space_transfers(space_id) where state='pending';
create table if not exists public.zuri_space_team_activity(
 id bigint generated always as identity primary key,
 space_id uuid not null references public.zuri_entities(id) on delete cascade,
 actor_id uuid references auth.users(id),
 action text not null,
 created_at timestamptz not null default now()
);
create index if not exists zuri_space_team_activity_space_created on public.zuri_space_team_activity(space_id,created_at desc);
alter table public.zuri_space_team enable row level security;
alter table public.zuri_space_transfers enable row level security;
alter table public.zuri_space_team_activity enable row level security;

-- Give every pre-existing Space an explicit owner team record.
insert into public.zuri_space_team(space_id,user_id,role,state,invited_by)
select id,owner_id,'owner','active',owner_id from public.zuri_entities where kind='space'
on conflict(space_id,user_id) do update set role='owner',state='active',updated_at=now();

create or replace function zuri_internal.space_management_action(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); space_row public.zuri_entities; target uuid; actor_role text; requested_role text;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501'; end if;
 select * into space_row from public.zuri_entities where id=(payload->>'id')::uuid and kind='space' for update;
 if space_row.id is null then raise exception 'Space not found' using errcode='P0002'; end if;
 actor_role:=case when space_row.owner_id=actor then 'owner' else (select role from public.zuri_space_team where space_id=space_row.id and user_id=actor and state='active') end;

 if action='spaces.team.status' then
  return jsonb_build_object('role',actor_role,'pending_transfer',exists(select 1 from public.zuri_space_transfers where space_id=space_row.id and to_owner=actor and state='pending'));
 elsif action='spaces.transfer.accept' then
  if not exists(select 1 from public.zuri_space_transfers where space_id=space_row.id and to_owner=actor and state='pending') then raise exception 'No pending ownership transfer' using errcode='P0002'; end if;
  update public.zuri_entities set owner_id=actor,updated_at=now() where id=space_row.id;
  update public.zuri_space_team set role='admin',updated_at=now() where space_id=space_row.id and user_id=space_row.owner_id;
  update public.zuri_space_team set role='owner',state='active',updated_at=now() where space_id=space_row.id and user_id=actor;
  update public.zuri_space_transfers set state='accepted',responded_at=now() where space_id=space_row.id and to_owner=actor and state='pending';
  insert into public.zuri_space_team_activity(space_id,actor_id,action) values(space_row.id,actor,'accepted ownership transfer');
  return jsonb_build_object('ok',true);
 elsif action='spaces.team.list' then
  if actor_role is null then raise exception 'Space team access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id',team.user_id,'name',coalesce(profile.display_name,profile.handle,'ZURI member'),'role',team.role,'state',team.state,'updated_at',team.updated_at) order by case team.role when 'owner' then 0 else 1 end,team.updated_at desc)
   from public.zuri_space_team team left join public.zuri_profiles profile on profile.id=team.user_id where team.space_id=space_row.id and team.state<>'removed'),'[]'::jsonb);
 elsif action='spaces.activity' then
  if actor_role is null then raise exception 'Space team access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',log.id,'action',log.action,'actor_name',coalesce(profile.display_name,profile.handle,'A team member'),'created_at',log.created_at) order by log.created_at desc)
   from (select * from public.zuri_space_team_activity where space_id=space_row.id order by created_at desc limit 20) log left join public.zuri_profiles profile on profile.id=log.actor_id),'[]'::jsonb);
 end if;

 if actor_role<>'owner' then raise exception 'Only the Space owner can change business access' using errcode='42501'; end if;
 target:=nullif(payload->>'user_id','')::uuid;
 if target is null or target=actor then raise exception 'Choose another verified person' using errcode='22023'; end if;

 if action='spaces.team.invite' then
  requested_role:=payload->>'role';
  if requested_role not in ('admin','editor','moderator','analyst','staff') then raise exception 'Choose a valid team role' using errcode='22023'; end if;
  if not zuri_internal.active_user(target) then raise exception 'That person needs a verified ZURI account' using errcode='42501'; end if;
  insert into public.zuri_space_team(space_id,user_id,role,state,invited_by) values(space_row.id,target,requested_role,'active',actor)
  on conflict(space_id,user_id) do update set role=excluded.role,state='active',invited_by=actor,updated_at=now();
  insert into public.zuri_space_team_activity(space_id,actor_id,action) values(space_row.id,actor,'added a '+requested_role);
  return jsonb_build_object('ok',true);
 elsif action='spaces.team.role' then
  requested_role:=payload->>'role';
  if requested_role not in ('admin','editor','moderator','analyst','staff') then raise exception 'Choose a valid team role' using errcode='22023'; end if;
  update public.zuri_space_team set role=requested_role,updated_at=now() where space_id=space_row.id and user_id=target and role<>'owner' and state='active';
  if not found then raise exception 'Active team person not found' using errcode='P0002'; end if;
  insert into public.zuri_space_team_activity(space_id,actor_id,action) values(space_row.id,actor,'changed a team role to '+requested_role);
  return jsonb_build_object('ok',true);
 elsif action='spaces.team.remove' then
  update public.zuri_space_team set state='removed',updated_at=now() where space_id=space_row.id and user_id=target and role<>'owner';
  if not found then raise exception 'Team person not found' using errcode='P0002'; end if;
  insert into public.zuri_space_team_activity(space_id,actor_id,action) values(space_row.id,actor,'removed a team person');
  return jsonb_build_object('ok',true);
 elsif action='spaces.transfer.request' then
  if not exists(select 1 from public.zuri_space_team where space_id=space_row.id and user_id=target and role='admin' and state='active') then raise exception 'Choose an active administrator before transferring ownership' using errcode='22023'; end if;
  insert into public.zuri_space_transfers(space_id,from_owner,to_owner) values(space_row.id,actor,target);
  insert into public.zuri_space_team_activity(space_id,actor_id,action) values(space_row.id,actor,'requested an ownership transfer');
  return jsonb_build_object('ok',true,'message','Transfer requested. The administrator must accept it before ownership changes.');
 end if;
 raise exception 'Unknown Space management action' using errcode='22023';
end $$;
revoke all on function zuri_internal.space_management_action(text,jsonb) from public,anon,authenticated;

do $$
declare definition text; marker text:=' elsif action=''records.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position('''spaces.team.list''' in definition)>0 then return; end if;
 if position(marker in definition)=0 then raise exception 'Backend dispatcher changed'; end if;
 execute replace(definition,marker,E' elsif action in (''spaces.team.status'',''spaces.team.list'',''spaces.activity'',''spaces.team.invite'',''spaces.team.role'',''spaces.team.remove'',''spaces.transfer.request'',''spaces.transfer.accept'') then\n  return zuri_internal.space_management_action(action,payload);\n'||marker);
end $$;

notify pgrst,'reload schema';
commit;
