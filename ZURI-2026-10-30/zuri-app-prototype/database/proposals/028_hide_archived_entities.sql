begin;

-- Entities are archived rather than hard-deleted so their references and
-- audit history survive. Exclude them before the workspace list is limited,
-- and prevent owner/member detail access to an archived entity.
do $$
declare
 definition text;
 old_where text := 'from public.zuri_entities obj where obj.owner_id=a or exists(';
 new_where text := 'from public.zuri_entities obj where obj.status<>''archived'' and (obj.owner_id=a or exists(';
 old_end text := 'member.invited_by is not null)) order by obj.updated_at desc limit 100';
 new_end text := 'member.invited_by is not null))) order by obj.updated_at desc limit 100';
 old_get text := 'if e.id is null then raise exception ''Item unavailable'' using errcode=''42501'';end if;';
 new_get text := 'if e.id is null or e.status=''archived'' then raise exception ''Item unavailable'' using errcode=''42501'';end if;';
begin
 select pg_get_functiondef('zuri_internal.entity_action_v14(text,jsonb)'::regprocedure) into definition;
 if position(new_where in definition)>0 and position(new_get in definition)>0 then return;end if;
 if position(old_where in definition)=0 or position(old_end in definition)=0 or position(old_get in definition)=0 then
  raise exception 'Entity action definition differs from expected version; review before applying';
 end if;
 definition:=replace(definition,old_where,new_where);
 definition:=replace(definition,old_end,new_end);
 definition:=replace(definition,old_get,new_get);
 execute definition;
end $$;

-- Indirect views, such as object summaries and feeds, must apply the same
-- archive boundary for owners, members and the public.
create or replace function zuri_internal.object_access(actor uuid,target uuid,members_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select zuri_internal.active_user(actor) and exists(
  select 1 from public.zuri_entities e where e.id=target and e.status<>'archived' and (
   e.owner_id=actor or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=actor and m.state='active')
   or not members_only and e.status='published' and e.visibility='public'
  )
 );
$$;
revoke all on function zuri_internal.object_access(uuid,uuid,boolean) from public,anon,authenticated;

-- Keep direct row-level reads consistent with the workspace and object APIs.
create or replace function zuri_internal.read_entity(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.zuri_entities e where e.id=target and e.status<>'archived' and (
  (e.status='published' and e.visibility='public') or
  (zuri_internal.active_user(auth.uid()) and (e.owner_id=auth.uid() or exists(select 1 from public.zuri_entity_members m where m.entity_id=e.id and m.user_id=auth.uid() and m.state='active')))
 ));
$$;

notify pgrst,'reload schema';
commit;
