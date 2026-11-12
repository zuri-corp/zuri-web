begin;
alter table public.zuri_profiles add column avatar_public boolean not null default false;
alter table public.zuri_offerings add column details jsonb not null default '{}' check(jsonb_typeof(details)='object' and octet_length(details::text)<=6000);
create table public.zuri_post_likes(post_id uuid not null,user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(post_id,user_id));
create table public.zuri_post_comments(id uuid primary key,post_id uuid not null,author_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now());
create index zuri_post_comments_post on public.zuri_post_comments(post_id,created_at,id);
create table public.zuri_channel_collections(id uuid primary key,channel_id uuid not null references public.zuri_entities(id),title text not null check(length(trim(title)) between 1 and 80),created_at timestamptz not null default now(),unique(channel_id,title));
create table public.zuri_collection_posts(collection_id uuid references public.zuri_channel_collections(id),post_id uuid not null,primary key(collection_id,post_id));
create table public.zuri_post_contexts(post_id uuid references public.zuri_object_activity(id),entity_id uuid references public.zuri_entities(id),primary key(post_id,entity_id));
create index zuri_post_contexts_entity on public.zuri_post_contexts(entity_id,post_id);
create table public.zuri_post_chapters(post_id uuid references public.zuri_object_activity(id),chapter_id uuid references public.zuri_app_records(id),user_id uuid not null references auth.users(id),primary key(post_id,chapter_id));
do $$declare tab text;begin foreach tab in array array['zuri_post_likes','zuri_post_comments','zuri_channel_collections','zuri_collection_posts','zuri_post_contexts','zuri_post_chapters'] loop
 execute format('alter table public.%I enable row level security',tab);execute format('revoke all on public.%I from public,anon,authenticated',tab);execute format('grant all on public.%I to service_role',tab);
end loop;end $$;

-- Internal canonical lookup covers earlier Channel broadcasts as well as newer posts.
create function zuri_internal.post_info(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(p) from (select a.id,a.entity_id,a.author_id,a.kind,a.body,a.media_id,a.created_at from public.zuri_object_activity a where a.id=target union all select c.id,c.channel_id,c.author_id,'post',c.body,null::uuid,c.created_at from public.zuri_channel_updates c where c.id=target) p limit 1
$$;
create function zuri_internal.post_access(actor uuid,target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select zuri_internal.object_access(actor,(p->>'entity_id')::uuid,p->>'kind'='chat') from (select zuri_internal.post_info(target) p) x
$$;
create function zuri_internal.post_enrich(actor uuid,item jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select item||jsonb_build_object('like_count',(select count(*) from public.zuri_post_likes where post_id=(item->>'id')::uuid),'liked',exists(select 1 from public.zuri_post_likes where post_id=(item->>'id')::uuid and user_id=actor),'comment_count',(select count(*) from public.zuri_post_comments where post_id=(item->>'id')::uuid),'contexts',coalesce((select jsonb_agg(jsonb_build_object('id',obj.id,'kind',obj.kind,'title',obj.title)) from public.zuri_post_contexts ctx join public.zuri_entities obj on obj.id=ctx.entity_id where ctx.post_id=(item->>'id')::uuid and zuri_internal.object_access(actor,obj.id,false)),'[]'::jsonb))
$$;
revoke all on function zuri_internal.post_info(uuid),zuri_internal.post_access(uuid,uuid),zuri_internal.post_enrich(uuid,jsonb) from public,anon,authenticated;

alter function zuri_internal.object_action(text,jsonb) rename to object_action_v15;
create function zuri_internal.object_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; obj public.zuri_entities; post jsonb; ctx jsonb; chapter public.zuri_app_records; existing public.zuri_offerings; v_details jsonb:=coalesce(payload->'details','{}');
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if action in ('objects.activity','objects.discovery') then
  if action='objects.activity' then
   select * into obj from public.zuri_entities where id=(payload->>'id')::uuid;
   if not zuri_internal.object_access(actor,obj.id,coalesce(payload->>'view','')='chat') then raise exception 'Object access required' using errcode='42501';end if;
  end if;
  select coalesce(jsonb_agg(zuri_internal.post_enrich(actor,to_jsonb(q)) order by q.created_at desc,q.id desc),'[]') into result from (
   select p.*,ent.title as context_title,ent.kind as context_kind,coalesce(nullif(pr.display_name,''),'ZURI member') as author_name,md.mime as media_mime
   from (select a.id,a.entity_id,a.author_id,a.kind,a.body,a.media_id,a.created_at from public.zuri_object_activity a union all select c.id,c.channel_id,c.author_id,'post',c.body,null::uuid,c.created_at from public.zuri_channel_updates c) p
   join public.zuri_entities ent on ent.id=p.entity_id left join public.zuri_profiles pr on pr.user_id=p.author_id left join public.zuri_media md on md.id=p.media_id
   where zuri_internal.object_access(actor,ent.id,p.kind='chat') and
    (case when action='objects.discovery' then p.kind='post' and (coalesce(payload->>'world','rizz')<>'aura' or ent.kind in ('space','society') and p.media_id is not null)
    else (p.entity_id=obj.id or p.kind='post' and exists(select 1 from public.zuri_post_contexts pc where pc.post_id=p.id and pc.entity_id=obj.id)) and case payload->>'view' when 'chat' then p.kind='chat' when 'media' then p.media_id is not null else p.kind='post' end end)
    and (not(payload ? 'before_at') or (p.created_at,p.id)<((payload->>'before_at')::timestamptz,(payload->>'before_id')::uuid))
    and (not(payload ? 'collection_id') or exists(select 1 from public.zuri_collection_posts cp join public.zuri_channel_collections cc on cc.id=cp.collection_id where cp.post_id=p.id and cc.id=(payload->>'collection_id')::uuid and cc.channel_id=p.entity_id))
   order by p.created_at desc,p.id desc limit 40
  ) q;return result;
 elsif action='objects.publish' then
  if jsonb_array_length(coalesce(payload->'contexts','[]'))>12 or jsonb_array_length(coalesce(payload->'chapters','[]'))>12 then raise exception 'Choose up to 12 contexts' using errcode='22023';end if;
  result:=zuri_internal.object_action_v15(action,payload);
  if payload->>'kind'='chat' and (jsonb_array_length(coalesce(payload->'contexts','[]'))>0 or jsonb_array_length(coalesce(payload->'chapters','[]'))>0) then raise exception 'Chat stays in its conversation' using errcode='42501';end if;
  select * into obj from public.zuri_entities where id=(payload->>'id')::uuid;
  for ctx in select value from jsonb_array_elements(coalesce(payload->'contexts','[]')) loop
   if not exists(select 1 from public.zuri_entities ent where ent.id=(ctx#>>'{}')::uuid and zuri_internal.object_access(actor,ent.id,true) and ent.status='published' and (ent.kind<>'channel' or ent.owner_id=actor) and (obj.visibility='public' or ent.visibility='private')) then raise exception 'Context participation and matching privacy required' using errcode='42501';end if;
   insert into public.zuri_post_contexts values((result->>'id')::uuid,(ctx#>>'{}')::uuid) on conflict do nothing;
  end loop;
  for ctx in select value from jsonb_array_elements(coalesce(payload->'chapters','[]')) loop
   select * into chapter from public.zuri_app_records where id=(ctx#>>'{}')::uuid and owner_id=actor and kind='chapter';
   if chapter.id is null then raise exception 'Your private Chapter required' using errcode='42501';end if;
   insert into public.zuri_post_chapters values((result->>'id')::uuid,chapter.id,actor) on conflict do nothing;
  end loop;
  if nullif(payload->>'collection_id','') is not null then
   if not exists(select 1 from public.zuri_channel_collections where id=(payload->>'collection_id')::uuid and channel_id=obj.id) or obj.owner_id<>actor then raise exception 'Your channel collection required' using errcode='42501';end if;
   insert into public.zuri_collection_posts values((payload->>'collection_id')::uuid,(result->>'id')::uuid) on conflict do nothing;
  end if;return result;
 elsif action='objects.offer.save' then
  if jsonb_typeof(v_details)<>'object' or octet_length(v_details::text)>6000 or length(coalesce(v_details->>'category',''))>100 or length(coalesce(v_details->>'availability',''))>500 or length(coalesce(v_details->>'delivery',''))>500 or length(coalesce(v_details->>'duration',''))>100 then raise exception 'Check offering details' using errcode='22023';end if;
  select * into existing from public.zuri_offerings where creation_request_id=(payload->>'request_id')::uuid;
  if existing.id is not null and payload->>'offering_id' is null and existing.details<>v_details then raise exception 'Request already used' using errcode='40001';end if;
  result:=zuri_internal.object_action_v15(action,payload);
  update public.zuri_offerings set details=v_details where id=(result->>'id')::uuid returning to_jsonb(zuri_offerings.*) into result;return result;
 end if;
 return zuri_internal.object_action_v15(action,payload);
end $$;
revoke all on function zuri_internal.object_action(text,jsonb) from public,anon,authenticated;

create function zuri_internal.social_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; post jsonb; result jsonb; item public.zuri_post_comments; saved public.zuri_app_records; ch public.zuri_app_records; cid jsonb; collection public.zuri_channel_collections; ctx public.zuri_entities; profile public.zuri_profiles; desired boolean;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if action like 'social.%' then
  target:=(payload->>'id')::uuid;post:=zuri_internal.post_info(target);
  if post is null or post->>'kind'='chat' or not zuri_internal.post_access(actor,target) then raise exception 'Post unavailable' using errcode='42501';end if;
  if action='social.post' then
   select zuri_internal.post_enrich(actor,post||jsonb_build_object('context_title',ent.title,'context_kind',ent.kind,'author_name',coalesce(pr.display_name,'ZURI member'),'media_mime',md.mime)) into result from public.zuri_entities ent left join public.zuri_profiles pr on pr.user_id=(post->>'author_id')::uuid left join public.zuri_media md on md.id=(post->>'media_id')::uuid where ent.id=(post->>'entity_id')::uuid;return result;
  elsif action='social.like' then
   if jsonb_typeof(payload->'liked')<>'boolean' then raise exception 'Choose like state' using errcode='22023';end if;
   if (payload->>'liked')::boolean then insert into public.zuri_post_likes values(target,actor,now()) on conflict do nothing;else delete from public.zuri_post_likes where post_id=target and user_id=actor;end if;
   return zuri_internal.post_enrich(actor,jsonb_build_object('id',target));
  elsif action='social.comment' then
   select * into item from public.zuri_post_comments where id=(payload->>'request_id')::uuid;
   if item.id is not null then if item.post_id=target and item.author_id=actor and item.body=trim(payload->>'body') then return to_jsonb(item);end if;raise exception 'Request already used' using errcode='40001';end if;
   insert into public.zuri_post_comments(id,post_id,author_id,body) values((payload->>'request_id')::uuid,target,actor,trim(payload->>'body')) returning * into item;return to_jsonb(item);
  elsif action='social.comments' then
   select coalesce(jsonb_agg(q order by q.created_at,q.id),'[]') into result from (select cm.id,cm.author_id,coalesce(nullif(pr.display_name,''),'ZURI member') as author_name,cm.body,cm.created_at from public.zuri_post_comments cm left join public.zuri_profiles pr on pr.user_id=cm.author_id where cm.post_id=target and (not(payload ? 'after_at') or (cm.created_at,cm.id)>((payload->>'after_at')::timestamptz,(payload->>'after_id')::uuid)) order by cm.created_at,cm.id limit 40) q;return result;
  end if;
 elsif action like 'collections.%' then
  select * into ctx from public.zuri_entities where id=(payload->>'id')::uuid and kind='channel';
  if not zuri_internal.object_access(actor,ctx.id,false) then raise exception 'Channel unavailable' using errcode='42501';end if;
  if action='collections.list' then
   select coalesce(jsonb_agg(q),'[]') into result from (select cc.*, (select count(*) from public.zuri_collection_posts cp where cp.collection_id=cc.id) as post_count from public.zuri_channel_collections cc where cc.channel_id=ctx.id order by cc.created_at,cc.id) q;return result;
  end if;
  if ctx.owner_id<>actor then raise exception 'Channel owner required' using errcode='42501';end if;
  if action='collections.save' then
   select * into collection from public.zuri_channel_collections where id=(payload->>'collection_id')::uuid;
   if collection.id is not null and collection.channel_id<>ctx.id then raise exception 'Your channel collection required' using errcode='42501';end if;
   insert into public.zuri_channel_collections(id,channel_id,title) values((payload->>'collection_id')::uuid,ctx.id,trim(payload->>'title')) on conflict(id) do update set title=excluded.title returning * into collection;return to_jsonb(collection);
  elsif action='collections.assign' then
   select * into collection from public.zuri_channel_collections where id=(payload->>'collection_id')::uuid and channel_id=ctx.id;post:=zuri_internal.post_info((payload->>'post_id')::uuid);
   if collection.id is null or post->>'entity_id' is distinct from ctx.id::text or post->>'kind'<>'post' then raise exception 'Choose a post from this channel' using errcode='42501';end if;
   insert into public.zuri_collection_posts values(collection.id,(post->>'id')::uuid) on conflict do nothing;return '{"assigned":true}';
  end if;
 elsif action='profile.channels' then
  target:=coalesce((payload->>'id')::uuid,actor);select * into profile from public.zuri_profiles where user_id=target;
  if target<>actor and profile.is_public is distinct from true then raise exception 'Profile unavailable' using errcode='42501';end if;
  select coalesce(jsonb_agg(q),'[]') into result from (select ent.id,ent.title,ent.description,ent.visibility,(select coalesce(jsonb_agg(jsonb_build_object('id',cc.id,'title',cc.title)),'[]') from public.zuri_channel_collections cc where cc.channel_id=ent.id) as collections from public.zuri_entities ent where ent.owner_id=target and ent.kind='channel' and (target=actor or ent.visibility='public' and ent.status='published') order by ent.updated_at desc limit 100) q;return result;
 elsif action='profile.public' then
  select * into profile from public.zuri_profiles where user_id=(payload->>'id')::uuid and is_public;
  if profile.user_id is null then raise exception 'Profile unavailable' using errcode='42501';end if;
  return jsonb_build_object('id',profile.user_id,'display_name',profile.display_name,'bio',profile.bio,'location',profile.location,'handle',profile.handle,'links',profile.links,'is_public',true,'receive_invites',profile.receive_invites);
 elsif action='chapters.add_moment' then
  if jsonb_array_length(coalesce(payload->'chapters','[]')) not between 1 and 12 then raise exception 'Choose a private Chapter' using errcode='22023';end if;
  if nullif(payload->>'media_id','') is not null and not exists(select 1 from public.zuri_media where id=(payload->>'media_id')::uuid and owner_id=actor and state='ready' and mime in ('image/jpeg','image/png','image/webp','video/mp4')) then raise exception 'Your ready media required' using errcode='42501';end if;
  if length(trim(coalesce(payload->>'body','')))=0 and nullif(payload->>'media_id','') is null then raise exception 'Write something or add media' using errcode='22023';end if;
  select * into saved from public.zuri_app_records where id=(payload->>'request_id')::uuid;
  if saved.id is null then
   if (select count(*) from public.zuri_app_records where owner_id=actor)>=2000 then raise exception 'Record limit reached' using errcode='P0001';end if;
   insert into public.zuri_app_records(id,owner_id,kind,content) values((payload->>'request_id')::uuid,actor,'moment',jsonb_build_object('title',left(coalesce(nullif(trim(payload->>'body'),''),'A moment'),120),'text',coalesce(payload->>'body',''),'mediaId',payload->>'media_id','mime',payload->>'mime')) returning * into saved;
  elsif saved.owner_id<>actor or saved.kind<>'moment' or saved.content->>'text' is distinct from coalesce(payload->>'body','') or saved.content->>'mediaId' is distinct from payload->>'media_id' then raise exception 'Request already used' using errcode='40001';end if;
  for cid in select value from jsonb_array_elements(payload->'chapters') loop
   select * into ch from public.zuri_app_records where id=(cid#>>'{}')::uuid and kind='chapter' and owner_id=actor for update;
   if ch.id is null then raise exception 'Your Chapter required' using errcode='42501';end if;
   if not coalesce(ch.content->'momentIds','[]') @> jsonb_build_array(saved.id::text) then update public.zuri_app_records set content=jsonb_set(content,'{momentIds}',coalesce(content->'momentIds','[]')||jsonb_build_array(saved.id::text)),revision=revision+1,updated_at=now() where id=ch.id;end if;
  end loop;return to_jsonb(saved);
 elsif action='chapters.posts' then
  target:=(payload->>'id')::uuid;
  if not exists(select 1 from public.zuri_app_records where id=target and owner_id=actor and kind='chapter') then raise exception 'Your Chapter required' using errcode='42501';end if;
  select coalesce(jsonb_agg(zuri_internal.post_enrich(actor,info)),'[]') into result from (select zuri_internal.post_info(pc.post_id)||jsonb_build_object('author_name',coalesce(pr.display_name,'ZURI member'),'context_title',ent.title,'context_kind',ent.kind,'media_mime',md.mime) info from public.zuri_post_chapters pc join public.zuri_object_activity act on act.id=pc.post_id join public.zuri_entities ent on ent.id=act.entity_id left join public.zuri_profiles pr on pr.user_id=act.author_id left join public.zuri_media md on md.id=act.media_id where pc.chapter_id=target and pc.user_id=actor and zuri_internal.post_access(actor,pc.post_id) order by act.created_at desc limit 100) q;return result;
 end if;raise exception 'Unknown social operation' using errcode='22023';
end $$;
revoke all on function zuri_internal.social_action(text,jsonb) from public,anon,authenticated;

create function public.zuri_context_media(actor uuid,target uuid,kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ent public.zuri_entities; offer public.zuri_offerings; prof public.zuri_profiles; file_id uuid; v_owner_id uuid; result jsonb;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if kind='offering-photo' then
  select * into offer from public.zuri_offerings where id=target;
  if offer.id is null or not zuri_internal.object_access(actor,offer.entity_id,false) or not offer.published and offer.owner_id<>actor then raise exception 'Offering unavailable' using errcode='42501';end if;
  file_id:=offer.media_id;v_owner_id:=offer.owner_id;
 else
  select * into ent from public.zuri_entities where id=target;
  if not zuri_internal.object_access(actor,ent.id,false) then raise exception 'Context unavailable' using errcode='42501';end if;
  v_owner_id:=ent.owner_id;
  if kind='host-avatar' then select * into prof from public.zuri_profiles where user_id=ent.owner_id; if prof.avatar_public or ent.owner_id=actor then file_id:=prof.avatar_media_id;end if;
  elsif kind='entity-avatar' then file_id:=coalesce(nullif(ent.details->>'avatarMediaId',''),ent.details->>'mediaId')::uuid;
  else raise exception 'Choose a photo type' using errcode='22023';end if;
 end if;
 select to_jsonb(md) into result from public.zuri_media md where md.id=file_id and md.owner_id=v_owner_id and md.state='ready' and md.mime in ('image/jpeg','image/png','image/webp');
 if result is null then raise exception 'Photo unavailable' using errcode='42501';end if;return result;
end $$;
revoke all on function public.zuri_context_media(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.zuri_context_media(uuid,uuid,text) to service_role;

-- Preserve the existing explicit photo privacy choice; opt-in is new and defaults off.
alter function public.zuri_profile_save(jsonb) set schema zuri_internal;
alter function zuri_internal.zuri_profile_save(jsonb) rename to profile_save_v11;
revoke all on function zuri_internal.profile_save_v11(jsonb) from public,anon,authenticated;
create function public.zuri_profile_save(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if payload ? 'avatar_public' and jsonb_typeof(payload->'avatar_public')<>'boolean' then raise exception 'Choose photo visibility' using errcode='22023';end if;
 result:=zuri_internal.profile_save_v11(payload);
 if payload ? 'avatar_public' then update public.zuri_profiles set avatar_public=(payload->>'avatar_public')::boolean where user_id=auth.uid() returning to_jsonb(zuri_profiles.*) into result;end if;return result;
end $$;
revoke all on function public.zuri_profile_save(jsonb) from public,anon;grant execute on function public.zuri_profile_save(jsonb) to authenticated;

create function zuri_internal.search_match(haystack text,needle text) returns boolean language sql immutable set search_path='' as $$
 select strpos(lower(haystack),lower(trim(needle)))>0 or not exists(select 1 from regexp_split_to_table(lower(trim(needle)),E'\\s+') token where not exists(select 1 from regexp_split_to_table(lower(haystack),'[^[:alnum:]_]+') word where left(word,length(token))=token))
$$;
grant execute on function zuri_internal.search_match(text,text) to anon,authenticated;
create or replace function public.zuri_discover(query text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(q),'[]') from (
 select 'entity' kind,ent.id,ent.title name,ent.description,ent.kind entity_kind,nullif(ent.details->>'location','') location,null::text handle,null::jsonb links
 from public.zuri_entities ent where ent.status='published' and ent.visibility='public' and length(trim(query)) between 2 and 100 and (zuri_internal.search_match(ent.title||' '||ent.description||' '||coalesce(ent.details->>'location',''),query) or exists(select 1 from public.zuri_offerings off where off.entity_id=ent.id and off.published and zuri_internal.search_match(off.title||' '||off.description||' '||coalesce(off.details->>'category',''),query)))
 union all select 'person',pr.user_id,pr.display_name,pr.bio,'person',nullif(pr.location,''),pr.handle,pr.links from public.zuri_profiles pr where pr.is_public and length(trim(query)) between 2 and 100 and zuri_internal.search_match(pr.display_name||' '||pr.bio||' '||pr.location||' '||coalesce(pr.handle,''),query)
 order by name limit 60) q
$$;
do $$declare definition text;marker text:=' elsif action=''records.list'' then';begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position(marker in definition)=0 or position('zuri_internal.social_action' in definition)>0 then raise exception 'Unexpected backend definition';end if;
 execute replace(definition,marker,E' elsif action in (''social.post'',''social.like'',''social.comment'',''social.comments'',''collections.list'',''collections.save'',''collections.assign'',''profile.public'',''profile.channels'',''chapters.add_moment'',''chapters.posts'') then\n return zuri_internal.social_action(action,payload);\n'||marker);
end $$;
alter function zuri_internal.entity_action(text,jsonb) rename to entity_action_v14;
create function zuri_internal.entity_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 result:=zuri_internal.entity_action_v14(action,payload);
 if action='entities.list' then select coalesce(jsonb_agg(item||jsonb_build_object('host_name',coalesce(pr.display_name,'Host'))),'[]') into result from jsonb_array_elements(result) item left join public.zuri_profiles pr on pr.user_id=(item->>'owner_id')::uuid;
 elsif action='entities.get' then result:=result||jsonb_build_object('host_name',(select coalesce(display_name,'Host') from public.zuri_profiles where user_id=(result->>'owner_id')::uuid));end if;return result;
end $$;
revoke all on function zuri_internal.entity_action(text,jsonb) from public,anon,authenticated;

commit;
