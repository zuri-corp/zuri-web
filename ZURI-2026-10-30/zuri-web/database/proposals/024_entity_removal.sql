begin;

-- A removal is an owner-only archive.  This keeps safety/audit history and
-- prevents broken references, while making the entity disappear everywhere.
alter function zuri_internal.entity_action(text,jsonb) rename to entity_action_v23;
create function zuri_internal.entity_action(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.zuri_entities; result jsonb;
begin
 if action='entities.delete' then
  if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
  select * into item from public.zuri_entities where id=(payload->>'id')::uuid for update;
  if item.id is null or item.owner_id<>actor then raise exception 'Your item is required' using errcode='42501';end if;
  if item.kind not in ('space','society','event','ping','channel') then raise exception 'This item cannot be removed here' using errcode='22023';end if;
  if payload ? 'expected_updated_at' and item.updated_at<> (payload->>'expected_updated_at')::timestamptz then raise exception 'This item changed. Refresh before removing it.' using errcode='40001';end if;
  update public.zuri_entities set status='archived',updated_at=now() where id=item.id returning to_jsonb(zuri_entities.*) into result;
  insert into public.zuri_backend_audit(actor_id,action,target_id) values(actor,item.kind||'-archived',item.id);
  return result||jsonb_build_object('deleted',true);
 end if;
 return zuri_internal.entity_action_v23(action,payload);
end $$;
revoke all on function zuri_internal.entity_action(text,jsonb) from public,anon,authenticated;

commit;
