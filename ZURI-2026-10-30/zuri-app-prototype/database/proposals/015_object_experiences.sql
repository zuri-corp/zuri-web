begin;
create function zuri_internal.object_access(actor uuid,target uuid,members_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select zuri_internal.active_user(actor) and exists(select 1 from public.zuri_entities e where e.id=target and (
  e.owner_id=actor or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=actor and m.state='active')
  or not members_only and e.status='published' and e.visibility='public'));
$$;
revoke all on function zuri_internal.object_access(uuid,uuid,boolean) from public,anon,authenticated;
create function zuri_internal.object_readable(target uuid,members_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$select zuri_internal.object_access(auth.uid(),target,members_only)$$;
revoke all on function zuri_internal.object_readable(uuid,boolean) from public,anon;
grant execute on function zuri_internal.object_readable(uuid,boolean) to authenticated;

create table public.zuri_object_activity(
 id uuid primary key,entity_id uuid not null references public.zuri_entities(id),author_id uuid not null references auth.users(id),
 kind text not null check(kind in ('post','chat')),body text not null default '' check(length(body)<=4000),
 media_id uuid references public.zuri_media(id),created_at timestamptz not null default now(),
 check(length(trim(body))>0 or media_id is not null)
);
create index zuri_object_activity_entity on public.zuri_object_activity(entity_id,created_at desc,id);
alter table public.zuri_object_activity enable row level security;
revoke all on public.zuri_object_activity from public,anon,authenticated;
grant select on public.zuri_object_activity to authenticated;grant all on public.zuri_object_activity to service_role;
create policy object_activity_read on public.zuri_object_activity for select to authenticated using(zuri_internal.object_readable(entity_id,kind='chat'));

alter table public.zuri_offerings add column price_label text not null default '' check(length(price_label)<=100);
alter table public.zuri_offerings add column media_id uuid references public.zuri_media(id);
alter table public.zuri_offerings add column creation_request_id uuid unique;

create table public.zuri_event_plans(
 user_id uuid not null references auth.users(id),source_kind text not null check(source_kind in ('zuri','imported')),source_id text not null,
 task_id uuid references public.zuri_app_records(id) on delete set null,created_at timestamptz not null default now(),primary key(user_id,source_kind,source_id)
);
alter table public.zuri_event_plans enable row level security;revoke all on public.zuri_event_plans from public,anon,authenticated;
grant select on public.zuri_event_plans to authenticated;grant all on public.zuri_event_plans to service_role;
create policy event_plans_own on public.zuri_event_plans for select to authenticated using(user_id=auth.uid() and zuri_internal.active_user(auth.uid()));

create function zuri_internal.object_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); e public.zuri_entities; item public.zuri_object_activity; offer public.zuri_offerings; target uuid; media uuid; result jsonb; is_owner boolean; joined boolean;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if action='objects.discovery' then
  select coalesce(jsonb_agg(x),'[]') into result from (
   select a.id,a.entity_id,e.title as context_title,e.kind as context_kind,a.author_id,coalesce(nullif(p.display_name,''),'ZURI member') as author_name,a.kind,a.body,a.media_id,m.mime as media_mime,a.created_at
   from public.zuri_object_activity a join public.zuri_entities obj on obj.id=a.entity_id left join public.zuri_profiles p on p.user_id=a.author_id left join public.zuri_media m on m.id=a.media_id
   where a.kind='post' and zuri_internal.object_access(actor,obj.id,false) and (coalesce(payload->>'world','rizz')<>'aura' or obj.kind in ('space','society') and a.media_id is not null)
   union all
   select c.id,e.id,e.title,e.kind,c.author_id,coalesce(nullif(p.display_name,''),'Channel owner'),'post',c.body,null::uuid,null::text,c.created_at
   from public.zuri_channel_updates c join public.zuri_entities obj on obj.id=c.channel_id left join public.zuri_profiles p on p.user_id=c.author_id
   where coalesce(payload->>'world','rizz')<>'aura' and zuri_internal.object_access(actor,obj.id,false)
   order by created_at desc,id limit 60
  ) x;return result;
 end if;
 target:=(payload->>'id')::uuid;select * into e from public.zuri_entities where id=target;
 if e.id is null then raise exception 'Object unavailable' using errcode='42501';end if;
 is_owner:=e.owner_id=actor;joined:=zuri_internal.object_access(actor,e.id,true);
 if action='objects.summary' then
  result:=zuri_internal.entity_action('entities.get',jsonb_build_object('id',e.id));
  return jsonb_build_object('entity',result,'owner',is_owner,'joined',joined,'readable',zuri_internal.object_access(actor,e.id,false),
   'can_post',joined and e.status='published' and (e.kind<>'channel' or is_owner),
   'member_count',case when zuri_internal.object_access(actor,e.id,false) then (select count(*) from public.zuri_entity_members where entity_id=e.id and state='active') else null end);
 end if;
 if not zuri_internal.object_access(actor,e.id,false) then raise exception 'Object access required' using errcode='42501';end if;
 if action='objects.members' then
  select coalesce(jsonb_agg(x),'[]') into result from (
   select case when is_owner or joined or p.is_public then m.user_id else null end as user_id,
    case when is_owner or joined or p.is_public then coalesce(nullif(p.display_name,''),'ZURI member') else 'Member' end as name,
    m.role,m.state,m.invited_by is not null as invited
   from public.zuri_entity_members m left join public.zuri_profiles p on p.user_id=m.user_id
   where m.entity_id=e.id and (m.state='active' or is_owner and m.state='pending') order by m.created_at limit 200
  ) x;return result;
 elsif action='objects.activity' then
  if payload->>'view'='chat' and not joined then raise exception 'Join to open the conversation' using errcode='42501';end if;
  select coalesce(jsonb_agg(x order by x.created_at desc,x.id),'[]') into result from (
   select a.id,a.author_id,coalesce(nullif(p.display_name,''),'ZURI member') as author_name,a.kind,a.body,a.media_id,m.mime as media_mime,a.created_at
   from public.zuri_object_activity a left join public.zuri_profiles p on p.user_id=a.author_id left join public.zuri_media m on m.id=a.media_id
   where a.entity_id=e.id and (a.kind<>'chat' or joined) and case payload->>'view' when 'chat' then a.kind='chat' when 'media' then a.media_id is not null else a.kind='post' end
   union all
   select c.id,c.author_id,coalesce(nullif(p.display_name,''),'Channel owner'),'post',c.body,null::uuid,null::text,c.created_at
   from public.zuri_channel_updates c left join public.zuri_profiles p on p.user_id=c.author_id where c.channel_id=e.id and coalesce(payload->>'view','feed')='feed'
   order by created_at desc,id limit 100
  ) x;return result;
 elsif action='objects.publish' then
  if not joined or e.status<>'published' or e.kind='channel' and not is_owner then raise exception 'Participation required' using errcode='42501';end if;
  if payload->>'kind' not in ('post','chat') or payload->>'kind' is null then raise exception 'Choose an update type' using errcode='22023';end if;
  if e.kind='channel' and payload->>'kind'='chat' then raise exception 'Channels are owner broadcasts' using errcode='42501';end if;
  media:=(payload->>'media_id')::uuid;
  if media is not null and not exists(select 1 from public.zuri_media where id=media and owner_id=actor and state='ready' and mime in ('image/jpeg','image/png','image/webp','video/mp4')) then raise exception 'Your ready photo or video required' using errcode='42501';end if;
  select * into item from public.zuri_object_activity where id=(payload->>'request_id')::uuid;
  if item.id is not null then
   if item.entity_id=e.id and item.author_id=actor and item.body=trim(coalesce(payload->>'body','')) and item.media_id is not distinct from media and item.kind=payload->>'kind' then return to_jsonb(item);end if;
   raise exception 'Request already used' using errcode='40001';
  end if;
  insert into public.zuri_object_activity(id,entity_id,author_id,kind,body,media_id) values((payload->>'request_id')::uuid,e.id,actor,payload->>'kind',trim(coalesce(payload->>'body','')),media) returning * into item;return to_jsonb(item);
 elsif action='objects.offerings' then
  select coalesce(jsonb_agg(x),'[]') into result from (select * from public.zuri_offerings where entity_id=e.id and (published or is_owner) order by created_at desc limit 100) x;return result;
 elsif action='objects.offer.save' then
  if not is_owner or e.kind<>'space' then raise exception 'Space owner required' using errcode='42501';end if;
  if not zuri_internal.safe_links(coalesce(payload->'links','[]')) then raise exception 'Use HTTPS links' using errcode='22023';end if;
  media:=(payload->>'media_id')::uuid;
  if media is not null and not exists(select 1 from public.zuri_media where id=media and owner_id=actor and state='ready' and mime in ('image/jpeg','image/png','image/webp')) then raise exception 'Your uploaded image required' using errcode='42501';end if;
  if payload->>'offering_id' is not null then
   update public.zuri_offerings set title=trim(payload->>'title'),description=coalesce(payload->>'description',''),links=coalesce(payload->'links','[]'),price_label=coalesce(payload->>'price_label',''),published=coalesce((payload->>'published')::boolean,true),media_id=media where id=(payload->>'offering_id')::uuid and entity_id=e.id and owner_id=actor returning * into offer;
   if offer.id is null then raise exception 'Your offering required' using errcode='42501';end if;return to_jsonb(offer);
  end if;
  select * into offer from public.zuri_offerings where creation_request_id=(payload->>'request_id')::uuid;
  if offer.id is not null then
   if offer.owner_id=actor and offer.entity_id=e.id and offer.title=trim(payload->>'title') and offer.description=coalesce(payload->>'description','') and offer.price_label=coalesce(payload->>'price_label','') and offer.links=coalesce(payload->'links','[]') and offer.media_id is not distinct from media then return to_jsonb(offer);end if;raise exception 'Request already used' using errcode='40001';
  end if;
  if (select count(*) from public.zuri_offerings where owner_id=actor)>=100 then raise exception 'Offering limit reached' using errcode='P0001';end if;
  insert into public.zuri_offerings(entity_id,owner_id,title,description,links,price_label,published,media_id,creation_request_id) values(e.id,actor,trim(payload->>'title'),coalesce(payload->>'description',''),coalesce(payload->'links','[]'),coalesce(payload->>'price_label',''),true,media,(payload->>'request_id')::uuid) returning * into offer;return to_jsonb(offer);
 elsif action='objects.plans' then
  select coalesce(jsonb_agg(x),'[]') into result from (select child.* from public.zuri_entities child where child.details->>'parentId'=e.id::text and child.kind in ('event','ping') and zuri_internal.object_access(actor,child.id,false) order by child.starts_at nulls last limit 100) x;return result;
 elsif action='objects.admit' then
  select * into e from public.zuri_entities where id=target for update;
  if not is_owner or not exists(select 1 from public.zuri_entity_members where entity_id=e.id and user_id=(payload->>'user_id')::uuid and state='pending' and invited_by is null) then raise exception 'Owner and join request required' using errcode='42501';end if;
  if e.capacity is not null and (select count(*) from public.zuri_entity_members where entity_id=e.id and state='active')>=e.capacity then raise exception 'This plan is full' using errcode='P0001';end if;
  update public.zuri_entity_members set state='active' where entity_id=e.id and user_id=(payload->>'user_id')::uuid;return '{"admitted":true}';
 end if;raise exception 'Unknown object operation' using errcode='22023';
end $$;
revoke all on function zuri_internal.object_action(text,jsonb) from public,anon,authenticated;

create function zuri_internal.event_time(value text) returns timestamptz language sql stable set search_path='' as $$
 select case when nullif(value,'') is null then null when value ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then value::timestamptz else value::timestamp at time zone 'Africa/Kampala' end;
$$;
create function zuri_internal.plan_event(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); v_source_kind text:=payload->>'source'; v_source_id text:=payload->>'id'; plan public.zuri_event_plans; task public.zuri_app_records; e public.zuri_entities; imported jsonb; title text; at_time timestamptz; link text; membership jsonb;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if v_source_kind not in ('zuri','imported') or v_source_kind is null or v_source_id is null then raise exception 'Choose an event' using errcode='22023';end if;
 if action='events.plan.status' then return jsonb_build_object('planned',exists(select 1 from public.zuri_event_plans p join public.zuri_app_records r on r.id=p.task_id and r.owner_id=actor where p.user_id=actor and p.source_kind=v_source_kind and p.source_id=v_source_id));end if;
 if v_source_kind='zuri' then
  select * into e from public.zuri_entities where id=v_source_id::uuid and kind in ('event','ping');
  if e.id is null or not zuri_internal.object_access(actor,e.id,false) then raise exception 'Event unavailable' using errcode='42501';end if;
  membership:=zuri_internal.entity_action('entities.join',jsonb_build_object('id',e.id));
  if membership->>'state'<>'active' then return jsonb_build_object('planned',false,'state',membership->>'state');end if;
  title:=e.title;at_time:=e.starts_at;link:=e.details->>'website';
 else
  if to_regclass('public.motion_imported_events') is null then raise exception 'External event unavailable' using errcode='42501';end if;
  execute 'select to_jsonb(e) from public.motion_imported_events e where e.id::text=$1 and e.verification_status=''verified'' and e.publication_status=''published''' into imported using v_source_id;
  if imported is null then raise exception 'External event unavailable' using errcode='42501';end if;
  title:=imported->>'title';
  select zuri_internal.event_time(session->>'starts_at') into at_time from jsonb_array_elements(case when jsonb_typeof(imported->'sessions')='array' then imported->'sessions' else '[]' end) session
   where zuri_internal.event_time(coalesce(session->>'ends_at',session->>'starts_at'))>=now() order by zuri_internal.event_time(session->>'starts_at') limit 1;
  at_time:=coalesce(at_time,zuri_internal.event_time(imported->>'next_occurrence_at'),zuri_internal.event_time(imported->>'starts_at'));link:=imported->>'registration_url';
 end if;
 insert into public.zuri_event_plans(user_id,source_kind,source_id) values(actor,v_source_kind,v_source_id) on conflict do nothing;
 select * into plan from public.zuri_event_plans p where p.user_id=actor and p.source_kind=v_source_kind and p.source_id=v_source_id for update;
 if plan.task_id is not null then return jsonb_build_object('planned',true,'task_id',plan.task_id);end if;
 if (select count(*) from public.zuri_app_records where owner_id=actor)>=2000 then raise exception 'Record limit reached' using errcode='P0001';end if;
 insert into public.zuri_app_records(owner_id,kind,content) values(actor,'task',jsonb_build_object('text',left('Attend '||title,500),'done',false,'date',to_char(now() at time zone 'Africa/Kampala','YYYY-MM-DD'),'dueDate',to_char(at_time at time zone 'Africa/Kampala','YYYY-MM-DD'),'startsAt',at_time,'eventRef',jsonb_build_object('source',v_source_kind,'id',v_source_id,'kind',coalesce(e.kind,'event')),'registrationUrl',link)) returning * into task;
 update public.zuri_event_plans p set task_id=task.id where p.user_id=actor and p.source_kind=v_source_kind and p.source_id=v_source_id;
 return jsonb_build_object('planned',true,'task_id',task.id);
end $$;
revoke all on function zuri_internal.plan_event(text,jsonb) from public,anon,authenticated;

create function public.zuri_object_media(actor uuid,activity_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare activity public.zuri_object_activity; result jsonb;
begin
 select * into activity from public.zuri_object_activity where id=activity_id;
 if activity.id is null or not zuri_internal.object_access(actor,activity.entity_id,activity.kind='chat') then raise exception 'Media unavailable' using errcode='42501';end if;
 select to_jsonb(m) into result from public.zuri_media m where m.id=activity.media_id and m.owner_id=activity.author_id and m.state='ready';
 if result is null then raise exception 'Media unavailable' using errcode='42501';end if;return result;
end $$;
revoke all on function public.zuri_object_media(uuid,uuid) from public,anon,authenticated;grant execute on function public.zuri_object_media(uuid,uuid) to service_role;

-- Validate linked parent contexts without changing the creation consent model.
create function zuri_internal.object_parent_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare parent public.zuri_entities;
begin
 if coalesce(new.details->>'parentId','')='' then return new;end if;
 select * into parent from public.zuri_entities where id=(new.details->>'parentId')::uuid and kind in ('space','society');
 if parent.id is null or not zuri_internal.object_access(new.owner_id,parent.id,true) or parent.visibility='private' and new.visibility<>'private' then raise exception 'An authorised matching parent context is required' using errcode='42501';end if;return new;
end $$;
create trigger zuri_object_parent_guard before insert or update of details,visibility on public.zuri_entities for each row execute function zuri_internal.object_parent_guard();

do $$
declare definition text; marker text:=' elsif action=''records.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position(marker in definition)=0 or position('zuri_internal.object_action' in definition)>0 then raise exception 'Unexpected backend definition';end if;
 definition:=replace(definition,marker,E' elsif action in (''objects.discovery'',''objects.summary'',''objects.members'',''objects.activity'',''objects.publish'',''objects.offerings'',''objects.offer.save'',''objects.plans'',''objects.admit'') then\n  return zuri_internal.object_action(action,payload);\n elsif action in (''events.plan'',''events.plan.status'') then\n  return zuri_internal.plan_event(action,payload);\n'||marker);execute definition;
end $$;
commit;
