begin;
create table public.zuri_channel_discovery (
 post_id uuid primary key references public.zuri_object_activity(id) on delete cascade
);
alter table public.zuri_channel_discovery enable row level security;
revoke all on public.zuri_channel_discovery from public,anon,authenticated;

create function public.zuri_search_channel_experiences(query text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(matches) order by matches.created_at desc,matches.id),'[]'::jsonb)
 from (
  select a.id,e.id as channel_id,e.title as channel_title,left(a.body,360) as excerpt,a.created_at
  from public.zuri_channel_discovery d
  join public.zuri_object_activity a on a.id=d.post_id
  join public.zuri_entities e on e.id=a.entity_id
  cross join lateral (select websearch_to_tsquery('simple',left(trim(query),120)) as terms) q
  where zuri_internal.active_user(auth.uid())
   and zuri_internal.active_user(a.author_id)
   and a.kind='post' and e.kind='channel' and e.visibility='public' and e.status='published'
   and length(trim(query)) between 2 and 120 and trim(a.body)<>''
   and to_tsvector('simple',e.title||' '||a.body) @@ q.terms
  order by a.created_at desc,a.id limit 6
 ) matches;
$$;
revoke all on function public.zuri_search_channel_experiences(text) from public,anon;
grant execute on function public.zuri_search_channel_experiences(text) to authenticated;

create function public.zuri_channel_discovery_choice(post uuid, enabled boolean default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not zuri_internal.active_user(auth.uid()) or not exists(
  select 1 from public.zuri_object_activity a join public.zuri_entities e on e.id=a.entity_id
  where a.id=post and a.author_id=auth.uid() and a.kind='post' and e.kind='channel'
 ) then raise exception 'Channel post author required' using errcode='42501';end if;
 if enabled is true then
  if not exists(select 1 from public.zuri_object_activity a join public.zuri_entities e on e.id=a.entity_id
   where a.id=post and e.visibility='public' and e.status='published' and trim(a.body)<>'')
  then raise exception 'Only public Channel posts with text can be discovered' using errcode='22023';end if;
  insert into public.zuri_channel_discovery(post_id) values(post) on conflict do nothing;
 elsif enabled is false then
  delete from public.zuri_channel_discovery where post_id=post;
 end if;
 return exists(select 1 from public.zuri_channel_discovery where post_id=post);
end $$;
revoke all on function public.zuri_channel_discovery_choice(uuid,boolean) from public,anon;
grant execute on function public.zuri_channel_discovery_choice(uuid,boolean) to authenticated;
do $$declare def text; marker text:=' elsif action=''records.list'' then';begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into def;
 if strpos(def,marker)=0 then raise exception 'Backend dispatcher changed';end if;
 execute replace(def,marker,$routes$ elsif action='channels.experiences.search' then
 return public.zuri_search_channel_experiences(payload->>'query');
 elsif action='channels.experiences.choice' then
 return to_jsonb(public.zuri_channel_discovery_choice((payload->>'id')::uuid,(payload->>'enabled')::boolean));
$routes$||marker);
end $$;
commit;
