-- User-created app objects are immediately usable. Visibility remains explicit.
begin;
alter table public.zuri_entities add column creation_request_id uuid unique;
alter table public.zuri_entities add column creation_fingerprint text;
alter table public.zuri_entity_members add column invited_by uuid references auth.users(id);
drop trigger if exists zuri_public_channel_publish on public.zuri_entities;
alter table public.zuri_entities drop constraint zuri_entities_publication_policy;
alter table public.zuri_entities add constraint zuri_entities_publication_policy check(status<>'published' or length(trim(consent_reference))>=10);
create function zuri_internal.instant_app_entity() returns trigger language plpgsql set search_path='' as $$
begin
 if length(trim(new.consent_reference))>=10 then new.status:='published';new.reviewed_by:=null;new.reviewed_at:=null;end if;
 return new;
end $$;
create trigger zuri_instant_app_entity before insert on public.zuri_entities for each row execute function zuri_internal.instant_app_entity();
update public.zuri_entities set status='published',reviewed_by=null,reviewed_at=null,updated_at=now() where status in ('draft','pending') and length(trim(consent_reference))>=10;

create function zuri_internal.entity_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid(); e public.zuri_entities; m public.zuri_entity_members; other uuid; result jsonb; request_id uuid; fingerprint text; next_state text; v_details jsonb;
begin
 if not zuri_internal.active_user(a) then raise exception 'Verified active account required' using errcode='42501';end if;
 if action='entities.list' then
  select coalesce(jsonb_agg(x.value),'[]') into result from (
   select case when obj.owner_id=a or exists(select 1 from public.zuri_entity_members member where member.entity_id=obj.id and member.user_id=a and member.state='active') then to_jsonb(obj)
    else to_jsonb(obj)||jsonb_build_object('description','You have been invited to this '||obj.kind||'.','details','{}'::jsonb,'invitation_pending',true) end as value
   from public.zuri_entities obj where obj.owner_id=a or exists(select 1 from public.zuri_entity_members member where member.entity_id=obj.id and member.user_id=a and (member.state='active' or member.state='pending' and member.invited_by is not null)) order by obj.updated_at desc limit 100
  ) x;return result;
 elsif action='entities.create' then
  if payload->'consent' is distinct from 'true'::jsonb or length(trim(coalesce(payload->>'consent_reference','')))<10 then raise exception 'Choose visibility and confirm your authority' using errcode='22023';end if;
  request_id:=coalesce((payload->>'request_id')::uuid,gen_random_uuid());fingerprint:=md5((payload-'request_id')::text);
  select * into e from public.zuri_entities where creation_request_id=request_id;
  if e.id is not null then
   if e.owner_id=a and e.creation_fingerprint=fingerprint then return to_jsonb(e);end if;
   raise exception 'Creation request already used' using errcode='40001';
  end if;
  if (select count(*) from public.zuri_entities where owner_id=a and created_at>now()-interval '1 day')>=10 then raise exception 'Creation limit reached' using errcode='P0001';end if;
  if payload->>'kind' in ('event','ping') and payload->>'starts_at' is null then raise exception 'Choose a start time' using errcode='22023';end if;
  v_details:=coalesce(payload->'details','{}');
  if coalesce(v_details->>'website','')<>'' and not zuri_internal.safe_links(jsonb_build_array(jsonb_build_object('title','Website','url',v_details->>'website'))) then raise exception 'Use an HTTPS website link' using errcode='22023';end if;
  if v_details?'mediaId' and not exists(select 1 from public.zuri_media where id=(v_details->>'mediaId')::uuid and owner_id=a and state='ready' and mime in ('image/jpeg','image/png','image/webp')) then raise exception 'Choose your uploaded cover image' using errcode='42501';end if;
  insert into public.zuri_entities(owner_id,kind,title,description,visibility,join_policy,capacity,starts_at,ends_at,details,consent_reference,creation_request_id,creation_fingerprint)
   values(a,payload->>'kind',trim(payload->>'title'),coalesce(payload->>'description',''),coalesce(payload->>'visibility','private'),case when coalesce(payload->>'visibility','private')='private' then 'invite' else coalesce(payload->>'join_policy','open') end,(payload->>'capacity')::integer,(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,v_details,payload->>'consent_reference',request_id,fingerprint) returning * into e;
  insert into public.zuri_entity_members(entity_id,user_id,role,state) values(e.id,a,'owner','active');return to_jsonb(e);
 end if;
 select * into e from public.zuri_entities where id=(payload->>'id')::uuid for update;
 if e.id is null then raise exception 'Item unavailable' using errcode='42501';end if;
 select * into m from public.zuri_entity_members where entity_id=e.id and user_id=a;
 if action='entities.get' then
  if e.owner_id=a or e.status='published' and e.visibility='public' or m.state='active' then return to_jsonb(e);end if;
  if m.state='pending' and m.invited_by is not null then return to_jsonb(e)||jsonb_build_object('description','You have been invited to this '||e.kind||'.','details','{}'::jsonb,'invitation_pending',true);end if;
  raise exception 'Item unavailable' using errcode='42501';
 elsif action='entities.update' then
  if e.owner_id<>a or e.status='archived' then raise exception 'Owner required' using errcode='42501';end if;
  if (payload->>'expected_updated_at')::timestamptz is distinct from e.updated_at then raise exception 'Item changed; refresh before editing' using errcode='40001';end if;
  if payload->'consent' is distinct from 'true'::jsonb then raise exception 'Confirm your visibility choices' using errcode='22023';end if;
  v_details:=coalesce(payload->'details',e.details);
  if coalesce(v_details->>'website','')<>'' and not zuri_internal.safe_links(jsonb_build_array(jsonb_build_object('title','Website','url',v_details->>'website'))) then raise exception 'Use an HTTPS website link' using errcode='22023';end if;
  if v_details?'mediaId' and not exists(select 1 from public.zuri_media where id=(v_details->>'mediaId')::uuid and owner_id=a and state='ready' and mime in ('image/jpeg','image/png','image/webp')) then raise exception 'Choose your uploaded cover image' using errcode='42501';end if;
  update public.zuri_entities set title=trim(payload->>'title'),description=coalesce(payload->>'description',''),visibility=payload->>'visibility',join_policy=case when payload->>'visibility'='private' then 'invite' else coalesce(payload->>'join_policy','open') end,capacity=(payload->>'capacity')::integer,starts_at=(payload->>'starts_at')::timestamptz,ends_at=(payload->>'ends_at')::timestamptz,details=v_details,updated_at=clock_timestamp() where id=e.id returning * into e;return to_jsonb(e);
 elsif action='entities.submit' then
  if e.owner_id<>a or e.status='archived' then raise exception 'Owner required' using errcode='42501';end if;
  update public.zuri_entities set status='published',reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp() where id=e.id returning * into e;return to_jsonb(e);
 elsif action='entities.invite' then
  other:=(payload->>'user_id')::uuid;
  if e.owner_id<>a or other is null or other=a or not zuri_internal.active_user(other) or not exists(select 1 from public.zuri_profiles where user_id=other and is_public and receive_invites) or exists(select 1 from public.zuri_blocks where (user_id=a and blocked_id=other) or (user_id=other and blocked_id=a)) then raise exception 'Person is unavailable for invitations' using errcode='42501';end if;
  if exists(select 1 from public.zuri_entity_members where entity_id=e.id and user_id=other and (state='active' or state='pending' and invited_by is not null)) then return '{"invited":true}';end if;
  if (select count(*) from public.zuri_entity_members where invited_by=a and created_at>now()-interval '1 day')>=20 then raise exception 'Invitation limit reached' using errcode='P0001';end if;
  insert into public.zuri_entity_members(entity_id,user_id,role,state,invited_by) values(e.id,other,'member','pending',a) on conflict(entity_id,user_id) do update set state='pending',invited_by=a,created_at=now();
  insert into public.zuri_notifications(user_id,kind,reference_id) values(other,'entity-invitation',e.id);return '{"invited":true}';
 elsif action='entities.join' then
  if e.owner_id=a or m.state='active' then return '{"state":"active"}';end if;
  if e.status<>'published' then raise exception 'Item unavailable' using errcode='42501';end if;
  if m.state='pending' and m.invited_by is not null then next_state:='active';
  elsif e.visibility='public' and e.join_policy<>'invite' then next_state:=case when e.join_policy='open' then 'active' else 'pending' end;
  else raise exception 'Invitation required' using errcode='42501';end if;
  if next_state='active' and e.capacity is not null and (select count(*) from public.zuri_entity_members where entity_id=e.id and state='active')>=e.capacity then raise exception 'This plan is full' using errcode='P0001';end if;
  insert into public.zuri_entity_members(entity_id,user_id,state) values(e.id,a,next_state) on conflict(entity_id,user_id) do update set state=excluded.state;return jsonb_build_object('state',next_state);
 end if;
 raise exception 'Unknown operation' using errcode='22023';
end $$;
revoke all on function zuri_internal.entity_action(text,jsonb) from public,anon,authenticated;

create function public.zuri_entity_cover(actor uuid,entity_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.zuri_entities; result jsonb;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 select * into e from public.zuri_entities where id=entity_id;
 if e.id is null or not(e.owner_id=actor or e.status='published' and e.visibility='public' or exists(select 1 from public.zuri_entity_members where zuri_entity_members.entity_id=e.id and user_id=actor and state='active')) then raise exception 'Item unavailable' using errcode='42501';end if;
 select to_jsonb(m) into result from public.zuri_media m where m.id=(e.details->>'mediaId')::uuid and m.owner_id=e.owner_id and m.state='ready' and m.mime in ('image/jpeg','image/png','image/webp');
 if result is null then raise exception 'Cover unavailable' using errcode='42501';end if;return result;
end $$;
revoke all on function public.zuri_entity_cover(uuid,uuid) from public,anon,authenticated;
grant execute on function public.zuri_entity_cover(uuid,uuid) to service_role;

-- Add dispatch before the deployed backend's existing actions. Its verified
-- identity and durable request limit still run before any new operation.
do $$
declare definition text; marker text:=' elsif action=''records.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position(marker in definition)=0 or position('entity_action' in definition)>0 then raise exception 'Unexpected backend definition';end if;
 definition:=replace(definition,marker,E' elsif action in (''entities.list'',''entities.create'',''entities.get'',''entities.update'',''entities.submit'',''entities.invite'',''entities.join'') then\n  return zuri_internal.entity_action(action,payload);\n elsif action=''records.get'' then\n  select to_jsonb(r) into result from public.zuri_app_records r where r.id=(payload->>''id'')::uuid and r.owner_id=a;\n  if result is null then raise exception ''Record unavailable'' using errcode=''42501'';end if;return result;\n'||marker);
 execute definition;
end $$;
commit;
