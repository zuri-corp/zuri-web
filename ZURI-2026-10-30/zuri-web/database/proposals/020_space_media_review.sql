begin;
create table public.zuri_space_media_review(
 space_id uuid not null references public.zuri_entities(id) on delete cascade,
 post_id uuid not null references public.zuri_object_activity(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','approved','declined')),
 reviewed_at timestamptz,
 primary key(space_id,post_id)
);
alter table public.zuri_space_media_review enable row level security;
revoke all on public.zuri_space_media_review from public,anon,authenticated;
grant all on public.zuri_space_media_review to service_role;
create function zuri_internal.queue_space_media() returns trigger language plpgsql security definer set search_path='' as $$
declare post public.zuri_object_activity; target uuid:=new.entity_id;
begin
 if tg_table_name='zuri_post_contexts' then select * into post from public.zuri_object_activity where id=new.post_id;else post:=new;end if;
 if post.kind='post' and exists(select 1 from public.zuri_entities e where e.id=target and e.kind='space' and e.owner_id<>post.author_id) then
  insert into public.zuri_space_media_review(space_id,post_id) values(target,post.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function zuri_internal.queue_space_media() from public,anon,authenticated;
create trigger zuri_review_primary_space after insert on public.zuri_object_activity for each row execute function zuri_internal.queue_space_media();
create trigger zuri_review_tagged_space after insert on public.zuri_post_contexts for each row execute function zuri_internal.queue_space_media();

-- Limit placement, rather than taking down the author's original Rizz post.
do $$declare def text; anchor text:='and (not(payload ? ''before_at'')'; begin
 select pg_get_functiondef('zuri_internal.object_action_v16(text,jsonb)'::regprocedure) into def;
 if strpos(def,anchor)=0 then raise exception 'Activity query changed';end if;
 def:=replace(def,anchor,$rule$and not exists(select 1 from public.zuri_space_media_review r where r.post_id=p.id and (
  action='objects.discovery' and payload->>'world'='aura' and r.space_id=p.entity_id
  or action='objects.activity' and r.space_id=obj.id and (payload->>'view' is distinct from 'media' or r.state<>'approved')
 )) and (not(payload ? 'before_at')$rule$);
 def:=replace(def,'zuri_internal.object_access(actor,ent.id,true) and ent.status=', 'zuri_internal.object_access(actor,ent.id,ent.kind<>''space'') and ent.status=');
 def:=replace(def,'when ''media'' then p.media_id is not null', 'when ''media'' then p.media_id is not null or exists(select 1 from public.zuri_space_media_review r where r.post_id=p.id and r.space_id=obj.id and r.state=''approved'')');
 execute def;
end $$;

alter function zuri_internal.object_action(text,jsonb) rename to object_action_v19;
create function zuri_internal.object_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; review_state text; result jsonb;
begin
 if action not in ('spaces.media.review.list','spaces.media.review.decide') then return zuri_internal.object_action_v19(action,payload);end if;
 target:=(payload->>'id')::uuid;
 if not zuri_internal.active_user(actor) or not exists(select 1 from public.zuri_entities e where e.id=target and e.kind='space' and e.owner_id=actor) then raise exception 'Space owner required' using errcode='42501';end if;
 if action='spaces.media.review.list' then
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (
   select a.id,a.title,a.body,a.created_at,a.media_id,m.mime as media_mime,coalesce(p.display_name,'ZURI member') as author_name
   from public.zuri_space_media_review r join public.zuri_object_activity a on a.id=r.post_id left join public.zuri_profiles p on p.user_id=a.author_id left join public.zuri_media m on m.id=a.media_id
   where r.space_id=target and r.state='pending' and zuri_internal.object_access(actor,a.entity_id,false)
   order by a.created_at desc limit 50
  ) q;return result;
 end if;
 review_state:=payload->>'decision';
 if review_state is null or review_state not in ('approved','declined') then raise exception 'Choose approve or decline' using errcode='22023';end if;
 update public.zuri_space_media_review r set state=review_state,reviewed_at=now()
 where r.space_id=target and r.post_id=(payload->>'post_id')::uuid and r.state='pending'
 and exists(select 1 from public.zuri_object_activity a where a.id=r.post_id and zuri_internal.object_access(actor,a.entity_id,false));
 if not found then raise exception 'Review is no longer available' using errcode='40001';end if;
 return jsonb_build_object('state',review_state);
end $$;
revoke all on function zuri_internal.object_action(text,jsonb) from public,anon,authenticated;
do $$declare def text; marker text:=' elsif action=''records.list'' then';begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into def;
 if strpos(def,marker)=0 then raise exception 'Backend dispatcher changed';end if;
 execute replace(def,marker,E' elsif action in (''spaces.media.review.list'',''spaces.media.review.decide'') then\n return zuri_internal.object_action(action,payload);\n'||marker);
end $$;
commit;
