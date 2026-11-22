begin;

-- Owners may remove an event from every public and private surface.  We keep
-- the row as an archive instead of hard-deleting it, which preserves audit
-- history and avoids breaking references from a planner or notification.
alter function zuri_internal.entity_action(text,jsonb) rename to entity_action_v22;
create function zuri_internal.entity_action(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); event_row public.zuri_entities; result jsonb;
begin
 if action='entities.delete' then
  if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
  select * into event_row from public.zuri_entities where id=(payload->>'id')::uuid for update;
  if event_row.id is null or event_row.kind<>'event' or event_row.owner_id<>actor then raise exception 'Your event is required' using errcode='42501';end if;
  if payload ? 'expected_updated_at' and event_row.updated_at<> (payload->>'expected_updated_at')::timestamptz then raise exception 'This event changed. Refresh before deleting it.' using errcode='40001';end if;
  update public.zuri_entities set status='archived',updated_at=now() where id=event_row.id returning to_jsonb(zuri_entities.*) into result;
  insert into public.zuri_backend_audit(actor_id,action,target_id) values(actor,'event-archived',event_row.id);
  return result||jsonb_build_object('deleted',true);
 end if;
 return zuri_internal.entity_action_v22(action,payload);
end $$;
revoke all on function zuri_internal.entity_action(text,jsonb) from public,anon,authenticated;

do $$
declare definition text; marker text:=' elsif action=''records.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position(marker in definition)=0 then raise exception 'Backend dispatcher changed';end if;
 execute replace(definition,marker,E' elsif action=''entities.delete'' then\n  return zuri_internal.entity_action(action,payload);\n'||marker);
end $$;

commit;
