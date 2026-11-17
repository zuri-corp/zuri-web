begin;
create or replace function zuri_internal.plan_event(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); v_source_kind text:=payload->>'source'; v_source_id text:=payload->>'id'; plan public.zuri_event_plans; task public.zuri_app_records; e public.zuri_entities; imported jsonb; title text; at_time timestamptz; link text;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if v_source_kind not in ('zuri','imported') or v_source_kind is null or v_source_id is null then raise exception 'Choose an event' using errcode='22023';end if;
 if action='events.plan.status' then return jsonb_build_object('planned',exists(select 1 from public.zuri_event_plans p join public.zuri_app_records r on r.id=p.task_id and r.owner_id=actor where p.user_id=actor and p.source_kind=v_source_kind and p.source_id=v_source_id));end if;
 if v_source_kind='zuri' then
  select * into e from public.zuri_entities where id=v_source_id::uuid and kind in ('event','ping');
  if e.id is null or not zuri_internal.object_access(actor,e.id,false) then raise exception 'Event unavailable' using errcode='42501';end if;
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
 insert into public.zuri_app_records(owner_id,kind,content) values(actor,'task',jsonb_build_object('text',left(title,500),'done',false,'date',to_char(now() at time zone 'Africa/Kampala','YYYY-MM-DD'),'dueDate',to_char(at_time at time zone 'Africa/Kampala','YYYY-MM-DD'),'startsAt',at_time,'eventRef',jsonb_build_object('source',v_source_kind,'id',v_source_id,'kind',coalesce(e.kind,'event')),'registrationUrl',link)) returning * into task;
 update public.zuri_event_plans p set task_id=task.id where p.user_id=actor and p.source_kind=v_source_kind and p.source_id=v_source_id;
 return jsonb_build_object('planned',true,'task_id',task.id);
end $$;
commit;
