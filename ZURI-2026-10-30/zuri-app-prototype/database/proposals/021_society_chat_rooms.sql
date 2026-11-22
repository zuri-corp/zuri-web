begin;
create table public.zuri_society_rooms(
 id uuid primary key default gen_random_uuid(),
 society_id uuid not null references public.zuri_entities(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 80),
 created_at timestamptz not null default now()
);
create unique index zuri_society_rooms_name on public.zuri_society_rooms(society_id,lower(title));
alter table public.zuri_society_rooms enable row level security;
revoke all on public.zuri_society_rooms from public,anon,authenticated;
grant all on public.zuri_society_rooms to service_role;
alter table public.zuri_object_activity add column room_id uuid references public.zuri_society_rooms(id);
create index zuri_room_activity on public.zuri_object_activity(entity_id,room_id,created_at desc) where kind='chat';

do $$declare def text; marker text:='and (not(payload ? ''before_at'')';begin
 select pg_get_functiondef('zuri_internal.object_action_v16(text,jsonb)'::regprocedure) into def;
 if strpos(def,marker)=0 then raise exception 'Activity query changed';end if;
 def:=replace(def,marker,$filter$and (action<>'objects.activity' or payload->>'view' is distinct from 'chat' or exists(
  select 1 from public.zuri_object_activity a where a.id=p.id and a.room_id is not distinct from (payload->>'room_id')::uuid
 )) and (not(payload ? 'before_at')$filter$);
 execute def;
end $$;

alter function zuri_internal.object_action(text,jsonb) rename to object_action_v20;
create function zuri_internal.object_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; room uuid; previous public.zuri_object_activity; room_title text; result jsonb;
begin
 if action in ('societies.rooms.list','societies.rooms.create') then
  target:=(payload->>'id')::uuid;
  if not zuri_internal.object_access(actor,target,true) or not exists(select 1 from public.zuri_entities where id=target and kind='society') then raise exception 'Society membership required' using errcode='42501';end if;
  if action='societies.rooms.list' then
   return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from public.zuri_society_rooms r where r.society_id=target),'[]'::jsonb);
  end if;
  perform 1 from public.zuri_entities where id=target and owner_id=actor for update;
  if not found then raise exception 'Society owner required' using errcode='42501';end if;
  room_title:=trim(coalesce(payload->>'title',''));
  if length(room_title) not between 1 and 80 or lower(room_title)='general' then raise exception 'Choose a distinct chat name' using errcode='22023';end if;
  select to_jsonb(r) into result from public.zuri_society_rooms r where r.society_id=target and lower(r.title)=lower(room_title);
  if result is not null then return result;end if;
  if (select count(*) from public.zuri_society_rooms where society_id=target)>=20 then raise exception 'Society chat limit reached' using errcode='22023';end if;
  insert into public.zuri_society_rooms(society_id,title) values(target,room_title) returning to_jsonb(zuri_society_rooms.*) into result;
  return result;
 end if;
 if action='objects.activity' and payload->>'view'='chat' or action='objects.publish' and payload->>'kind'='chat' then
  target:=(payload->>'id')::uuid;room:=(payload->>'room_id')::uuid;
  if room is not null and not exists(select 1 from public.zuri_society_rooms r where r.id=room and r.society_id=target) then raise exception 'Chat room unavailable' using errcode='42501';end if;
  if action='objects.publish' then
   if payload->>'reply_to' is not null and not exists(select 1 from public.zuri_object_activity a where a.id=(payload->>'reply_to')::uuid and a.entity_id=target and a.room_id is not distinct from room) then raise exception 'Reply must stay in its chat room' using errcode='42501';end if;
   select * into previous from public.zuri_object_activity where id=(payload->>'request_id')::uuid;
   if previous.id is not null and previous.room_id is distinct from room then raise exception 'Request already used' using errcode='40001';end if;
   result:=zuri_internal.object_action_v20(action,payload);
   if room is not null then update public.zuri_object_activity set room_id=room where id=(result->>'id')::uuid returning to_jsonb(zuri_object_activity.*) into result;end if;
   return result;
  end if;
 end if;
 return zuri_internal.object_action_v20(action,payload);
end $$;
revoke all on function zuri_internal.object_action(text,jsonb) from public,anon,authenticated;
do $$declare def text; marker text:=' elsif action=''records.list'' then';begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into def;
 if strpos(def,marker)=0 then raise exception 'Backend dispatcher changed';end if;
 execute replace(def,marker,E' elsif action in (''societies.rooms.list'',''societies.rooms.create'') then\n return zuri_internal.object_action(action,payload);\n'||marker);
end $$;
commit;
