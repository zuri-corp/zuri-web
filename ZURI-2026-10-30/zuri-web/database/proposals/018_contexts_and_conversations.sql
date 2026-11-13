begin;
alter table public.zuri_object_activity add column title text not null default '' check(length(title)<=120),add column reply_to uuid references public.zuri_object_activity(id),add column media_name text not null default '' check(length(media_name)<=180);
alter table public.zuri_chat_messages add column media_id uuid references public.zuri_media(id),add column reply_to uuid references public.zuri_chat_messages(id),add column media_name text not null default '' check(length(media_name)<=180);
alter table public.zuri_chat_messages drop constraint zuri_chat_messages_body_check;
alter table public.zuri_chat_messages add constraint zuri_chat_message_content check(length(body)<=4000 and (length(trim(body))>0 or media_id is not null));
create table public.zuri_entity_contexts(entity_id uuid references public.zuri_entities(id),context_id uuid references public.zuri_entities(id),primary key(entity_id,context_id),check(entity_id<>context_id));
create index zuri_entity_contexts_context on public.zuri_entity_contexts(context_id,entity_id);
create table public.zuri_entity_chapters(entity_id uuid references public.zuri_entities(id),chapter_id uuid references public.zuri_app_records(id),owner_id uuid references auth.users(id),primary key(entity_id,chapter_id));
create table public.zuri_message_reactions(origin text check(origin in ('dm','group')),message_id uuid not null,user_id uuid references auth.users(id),emoji text not null check(emoji in ('👍','❤️','😂','🔥','🙏','🎉')),primary key(origin,message_id,user_id));
do $$declare tab text;begin foreach tab in array array['zuri_entity_contexts','zuri_entity_chapters','zuri_message_reactions'] loop execute format('alter table public.%I enable row level security',tab);execute format('revoke all on public.%I from public,anon,authenticated',tab);execute format('grant all on public.%I to service_role',tab);end loop;end $$;

create function public.zuri_browse_entities(entity_kind text,query text default '',before_at timestamptz default null,before_id uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(q order by q.created_at desc,q.id desc),'[]') from (
 select obj.*,coalesce(pr.display_name,'Host') host_name from public.zuri_entities obj left join public.zuri_profiles pr on pr.user_id=obj.owner_id and pr.is_public
 where obj.status='published' and obj.visibility='public' and obj.kind=entity_kind and length(query)<=100 and (query='' or zuri_internal.search_match(obj.title||' '||obj.description||' '||coalesce(obj.details->>'location','')||' '||coalesce(obj.details->>'category',''),query)) and (before_at is null or (obj.created_at,obj.id)<(before_at,before_id)) order by obj.created_at desc,obj.id desc limit 40) q
$$;
revoke all on function public.zuri_browse_entities(text,text,timestamptz,uuid) from public;grant execute on function public.zuri_browse_entities(text,text,timestamptz,uuid) to anon,authenticated;

create function zuri_internal.message_reactions(actor uuid,source text,target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(q),'[]') from (select emoji,count(*) as count,bool_or(user_id=actor) as mine from public.zuri_message_reactions where origin=source and message_id=target group by emoji order by emoji) q
$$;
create function zuri_internal.profile_known(actor uuid,target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select zuri_internal.active_user(actor) and zuri_internal.active_user(target) and (actor=target or exists(select 1 from public.zuri_profiles where user_id=target and is_public) or exists(select 1 from public.zuri_conversation_members me join public.zuri_conversation_members them on me.conversation_id=them.conversation_id where me.user_id=actor and me.state='accepted' and them.user_id=target and them.state='accepted') or exists(select 1 from public.zuri_entity_members me join public.zuri_entity_members them on me.entity_id=them.entity_id where me.user_id=actor and them.user_id=target and me.state='active' and them.state='active') or exists(select 1 from public.zuri_object_activity act where act.author_id=target and zuri_internal.post_access(actor,act.id)))
$$;
revoke all on function zuri_internal.message_reactions(uuid,text,uuid),zuri_internal.profile_known(uuid,uuid) from public,anon,authenticated;

-- Spaces are places with user content, not social membership groups. Keep old
-- access records intact while removing joining and member management semantics.
do $$declare def text;begin
 select pg_get_functiondef('zuri_internal.object_action_v15(text,jsonb)'::regprocedure) into def;
 def:=replace(def,'joined:=zuri_internal.object_access(actor,e.id,true);','joined:=zuri_internal.object_access(actor,e.id,e.kind<>''space'');');
 def:=replace(def,'mime in (''image/jpeg'',''image/png'',''image/webp'',''video/mp4'')','(mime in (''image/jpeg'',''image/png'',''image/webp'',''video/mp4'') or payload->>''kind''=''chat'' and mime=''application/pdf'')');execute def;
end $$;
do $$declare def text;marker text:='select item||jsonb_build_object(';begin
 select pg_get_functiondef('zuri_internal.post_enrich(uuid,jsonb)'::regprocedure) into def;
 if position(marker in def)=0 then raise exception 'Unexpected post metadata function';end if;
 def:=replace(def,marker,'select item||jsonb_build_object(''title'',coalesce((select title from public.zuri_object_activity where id=(item->>''id'')::uuid),''''))||jsonb_build_object(');execute def;
end $$;
alter function zuri_internal.object_action(text,jsonb) rename to object_action_v16;
do $$declare def text;begin select pg_get_functiondef('zuri_internal.object_action_v16(text,jsonb)'::regprocedure) into def;def:=replace(def,'ent.kind in (''space'',''society'') and p.media_id is not null','ent.kind in (''space'',''society'')');execute def;end $$;
create function zuri_internal.object_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; obj public.zuri_entities; previous public.zuri_object_activity; actor uuid:=auth.uid();begin
 if action in ('objects.members','objects.admit') and exists(select 1 from public.zuri_entities where id=(payload->>'id')::uuid and kind='space') then raise exception 'Spaces do not have members' using errcode='22023';end if;
 if action='objects.publish' then
  if length(coalesce(payload->>'title',''))>120 or length(coalesce(payload->>'media_name',''))>180 then raise exception 'Check title or file name' using errcode='22023';end if;
  if payload->>'reply_to' is not null and not exists(select 1 from public.zuri_object_activity where id=(payload->>'reply_to')::uuid and entity_id=(payload->>'id')::uuid and kind='chat' and payload->>'kind'='chat') then raise exception 'Reply must stay in its chat' using errcode='42501';end if;
  select * into previous from public.zuri_object_activity where id=(payload->>'request_id')::uuid;
  if previous.id is not null and (previous.title<>coalesce(payload->>'title','') or previous.reply_to is distinct from (payload->>'reply_to')::uuid or previous.media_name<>coalesce(payload->>'media_name','')) then raise exception 'Request already used' using errcode='40001';end if;
 end if;
 result:=zuri_internal.object_action_v16(action,payload);
 if action='objects.summary' then
  result:=result||jsonb_build_object('viewer_id',actor);
  if result->'entity'->>'kind'='space' then result:=result||jsonb_build_object('member_count',null,'joined',false,'can_post',coalesce((result->>'readable')::boolean,false) and result->'entity'->>'status'='published');end if;
 elsif action='objects.publish' then
  update public.zuri_object_activity set title=coalesce(payload->>'title',''),reply_to=(payload->>'reply_to')::uuid,media_name=coalesce(payload->>'media_name','') where id=(result->>'id')::uuid returning to_jsonb(zuri_object_activity.*) into result;
 elsif action in ('objects.activity','objects.discovery') then
  select * into obj from public.zuri_entities where id=(payload->>'id')::uuid;
  select coalesce(jsonb_agg(item||jsonb_build_object('title',coalesce(act.title,''),'media_name',coalesce(act.media_name,''),'reply_to',act.reply_to,'reply_body',(select body from public.zuri_object_activity where id=act.reply_to),'reactions',zuri_internal.message_reactions(actor,'group',(item->>'id')::uuid)) order by ord),'[]') into result from jsonb_array_elements(result) with ordinality as entries(item,ord) left join public.zuri_object_activity act on act.id=(item->>'id')::uuid where not(action='objects.activity' and payload->>'view'='media' and obj.kind<>'ping' and item->>'kind'='chat');
 end if;return result;
end $$;
revoke all on function zuri_internal.object_action(text,jsonb) from public,anon,authenticated;

alter function zuri_internal.entity_action(text,jsonb) rename to entity_action_v17;
create function zuri_internal.entity_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; actor uuid:=auth.uid();obj public.zuri_entities; context public.zuri_entities; item jsonb;begin
 if action in ('entities.join','entities.invite') and exists(select 1 from public.zuri_entities where id=(payload->>'id')::uuid and kind='space') then raise exception 'Spaces do not have memberships' using errcode='22023';end if;
 if action in ('entities.create','entities.update') then
  if length(coalesce(payload->'details'->>'category',''))>80 or coalesce(payload->'details'->>'genderPreference','any') not in ('any','women','men') or jsonb_array_length(coalesce(payload->'contexts','[]'))>8 or jsonb_array_length(coalesce(payload->'chapters','[]'))>8 then raise exception 'Check category, preference and contexts' using errcode='22023';end if;
 end if;
 result:=zuri_internal.entity_action_v17(action,payload);
 if action in ('entities.create','entities.update') and result->>'kind' in ('event','ping') then
  for item in select value from jsonb_array_elements(coalesce(payload->'contexts','[]')) loop
   select * into context from public.zuri_entities where id=(item#>>'{}')::uuid;
   if context.id=(result->>'id')::uuid or context.id is null or not zuri_internal.object_access(actor,context.id,context.kind<>'space') or (context.visibility='private' and result->>'visibility'<>'private') then raise exception 'Choose an accessible context with matching visibility' using errcode='42501';end if;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(payload->'chapters','[]')) loop if not exists(select 1 from public.zuri_app_records where id=(item#>>'{}')::uuid and owner_id=actor and kind='chapter') then raise exception 'Your Chapter required' using errcode='42501';end if;end loop;
  if payload ? 'contexts' then delete from public.zuri_entity_contexts where entity_id=(result->>'id')::uuid;insert into public.zuri_entity_contexts select (result->>'id')::uuid,(value#>>'{}')::uuid from jsonb_array_elements(payload->'contexts') on conflict do nothing;end if;
  if payload ? 'chapters' then delete from public.zuri_entity_chapters where entity_id=(result->>'id')::uuid;insert into public.zuri_entity_chapters select (result->>'id')::uuid,(value#>>'{}')::uuid,actor from jsonb_array_elements(payload->'chapters') on conflict do nothing;end if;
 end if;return result;
end $$;
revoke all on function zuri_internal.entity_action(text,jsonb) from public,anon,authenticated;

create function zuri_internal.conversation_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();target uuid:=(payload->>'id')::uuid;result jsonb;member_state text;msg public.zuri_chat_messages;existing public.zuri_chat_messages;source text:=payload->>'origin';ready boolean;known boolean;peer uuid;prof public.zuri_profiles;v_emoji text:=payload->>'emoji';obj public.zuri_entities;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501';end if;
 if action='entities.contexts' then
  select coalesce(jsonb_agg(q),'[]') into result from (select ent.* from public.zuri_entities ent where ent.status='published' and (ent.owner_id=actor or ent.kind='space' and ent.visibility='public' or exists(select 1 from public.zuri_entity_members where entity_id=ent.id and user_id=actor and state='active')) order by ent.updated_at desc limit 150) q;return result;
 elsif action='contexts.related' then
  if not zuri_internal.object_access(actor,target,false) then raise exception 'Context unavailable' using errcode='42501';end if;
  select coalesce(jsonb_agg(q),'[]') into result from (
   select ent.id::text,ent.title,ent.kind,ent.visibility from public.zuri_entity_contexts cx join public.zuri_entities ent on ent.id=cx.context_id where cx.entity_id=target and zuri_internal.object_access(actor,ent.id,false)
   union all select 'chapter:'||ch.id::text,ch.content->>'title','chapter','private' from public.zuri_entity_chapters cx join public.zuri_app_records ch on ch.id=cx.chapter_id where cx.entity_id=target and cx.owner_id=actor and ch.owner_id=actor
  ) q;return result;
 elsif action='entities.context.get' then
  select * into obj from public.zuri_entities where id=target and owner_id=actor;if obj.id is null then raise exception 'Owner required' using errcode='42501';end if;
  return jsonb_build_object('contexts',coalesce((select jsonb_agg(context_id) from public.zuri_entity_contexts where entity_id=target),'[]'),'chapters',coalesce((select jsonb_agg(chapter_id) from public.zuri_entity_chapters where entity_id=target and owner_id=actor),'[]'));
 elsif action='contexts.plans' then
  if not zuri_internal.object_access(actor,target,false) then raise exception 'Context unavailable' using errcode='42501';end if;
  select coalesce(jsonb_agg(q),'[]') into result from (select ent.* from public.zuri_entities ent where ent.kind in ('event','ping') and zuri_internal.object_access(actor,ent.id,false) and (ent.details->>'parentId'=target::text or exists(select 1 from public.zuri_entity_contexts where entity_id=ent.id and context_id=target)) order by ent.starts_at nulls last limit 100) q;return result;
 elsif action='chapters.plans' then
  if not exists(select 1 from public.zuri_app_records where id=target and owner_id=actor and kind='chapter') then raise exception 'Your Chapter required' using errcode='42501';end if;
  select coalesce(jsonb_agg(q),'[]') into result from (select ent.* from public.zuri_entity_chapters ctx join public.zuri_entities ent on ent.id=ctx.entity_id where ctx.chapter_id=target and ctx.owner_id=actor and zuri_internal.object_access(actor,ent.id,false) order by ent.starts_at nulls last limit 100) q;return result;
 elsif action='profiles.view' then
  if not zuri_internal.profile_known(actor,target) then raise exception 'Profile unavailable' using errcode='42501';end if;
  select * into prof from public.zuri_profiles where user_id=target;
  if prof.is_public or actor=target then return jsonb_build_object('id',target,'display_name',prof.display_name,'bio',prof.bio,'location',prof.location,'handle',prof.handle,'links',prof.links,'is_public',prof.is_public,'receive_invites',prof.receive_invites);end if;
  return jsonb_build_object('id',target,'display_name',coalesce(prof.display_name,'ZURI member'),'bio','','location','','handle',null,'links','[]'::jsonb,'is_public',false,'receive_invites',false);
 elsif action='chats.inbox' then
  select coalesce(jsonb_agg(q order by q.updated_at desc,q.id),'[]') into result from (
   select conv.id,me.state,(select count(*)>=2 from public.zuri_conversation_members where conversation_id=conv.id and state='accepted') ready,them.user_id as peer_id,coalesce(nullif(pr.display_name,''),'ZURI member') title,
   case when me.state='accepted' then coalesce(nullif(last_msg.body,''),case when last_msg.media_id is not null then 'Attachment' end,'') else '' end as preview,coalesce(last_msg.created_at,conv.created_at) updated_at
   from public.zuri_conversations conv join public.zuri_conversation_members me on me.conversation_id=conv.id and me.user_id=actor and me.state<>'left'
   left join lateral(select cm.user_id from public.zuri_conversation_members cm where cm.conversation_id=conv.id and cm.user_id<>actor and cm.state<>'left' order by cm.created_at limit 1) them on true
   left join public.zuri_profiles pr on pr.user_id=them.user_id left join lateral(select * from public.zuri_chat_messages where conversation_id=conv.id order by created_at desc,id desc limit 1) last_msg on true
   order by coalesce(last_msg.created_at,conv.created_at) desc limit 100) q;return result;
 elsif action in ('chats.thread','chats.send.v2') then
  select state into member_state from public.zuri_conversation_members where conversation_id=target and user_id=actor and state<>'left';if member_state is null then raise exception 'Conversation unavailable' using errcode='42501';end if;
  ready:=member_state='accepted' and (select count(*)>=2 from public.zuri_conversation_members where conversation_id=target and state='accepted') and not exists(select 1 from public.zuri_conversation_members m join public.zuri_blocks b on b.user_id=actor and b.blocked_id=m.user_id or b.blocked_id=actor and b.user_id=m.user_id where m.conversation_id=target);
  select m.user_id into peer from public.zuri_conversation_members m where m.conversation_id=target and m.user_id<>actor and m.state<>'left' limit 1;select * into prof from public.zuri_profiles where user_id=peer;
  if action='chats.thread' then
   select coalesce(jsonb_agg(q order by q.created_at,q.id),'[]') into result from (select mrow.*,coalesce(pr.display_name,'ZURI member') author_name,md.mime as media_mime,reply.body as reply_body,zuri_internal.message_reactions(actor,'dm',mrow.id) reactions from public.zuri_chat_messages mrow left join public.zuri_profiles pr on pr.user_id=mrow.sender_id left join public.zuri_media md on md.id=mrow.media_id left join public.zuri_chat_messages reply on reply.id=mrow.reply_to where mrow.conversation_id=target and member_state='accepted' and (not(payload ? 'before_at') or (mrow.created_at,mrow.id)<((payload->>'before_at')::timestamptz,(payload->>'before_id')::uuid)) order by mrow.created_at desc,mrow.id desc limit 40) q;
   return jsonb_build_object('id',target,'title',coalesce(prof.display_name,'Conversation'),'peer_id',peer,'state',member_state,'ready',ready,'messages',result);
  end if;
  perform 1 from public.zuri_conversations where id=target for update;
  if not ready then raise exception 'Accepted, unblocked conversation required' using errcode='42501';end if;
  if payload->>'media_id' is not null and not exists(select 1 from public.zuri_media where id=(payload->>'media_id')::uuid and owner_id=actor and state='ready') then raise exception 'Your ready attachment required' using errcode='42501';end if;
  if payload->>'reply_to' is not null and not exists(select 1 from public.zuri_chat_messages where id=(payload->>'reply_to')::uuid and conversation_id=target) then raise exception 'Reply must stay in its conversation' using errcode='42501';end if;
  select * into existing from public.zuri_chat_messages where sender_id=actor and request_id=(payload->>'request_id')::uuid;
  if existing.id is not null then if existing.conversation_id=target and existing.body=trim(coalesce(payload->>'body','')) and existing.media_id is not distinct from (payload->>'media_id')::uuid and existing.reply_to is not distinct from (payload->>'reply_to')::uuid then return to_jsonb(existing);end if;raise exception 'Request already used' using errcode='40001';end if;
  insert into public.zuri_chat_messages(conversation_id,sender_id,request_id,body,media_id,reply_to,media_name) values(target,actor,(payload->>'request_id')::uuid,trim(coalesce(payload->>'body','')),(payload->>'media_id')::uuid,(payload->>'reply_to')::uuid,coalesce(payload->>'media_name','')) returning * into msg;
  insert into public.zuri_notifications(user_id,kind,reference_id) select user_id,'message',target from public.zuri_conversation_members where conversation_id=target and user_id<>actor and state='accepted';return to_jsonb(msg);
 elsif action='messages.react' then
  if source='dm' then select * into msg from public.zuri_chat_messages where id=target;if msg.id is null or not zuri_internal.read_chat(msg.conversation_id) then raise exception 'Message unavailable' using errcode='42501';end if;
  elsif source='group' then if not exists(select 1 from public.zuri_object_activity where id=target and kind='chat' and zuri_internal.object_access(actor,entity_id,true)) then raise exception 'Message unavailable' using errcode='42501';end if;
  else raise exception 'Choose a conversation' using errcode='22023';end if;
  if v_emoji not in ('👍','❤️','😂','🔥','🙏','🎉') or v_emoji is null then raise exception 'Choose a reaction' using errcode='22023';end if;
  if payload->'active'='true'::jsonb then insert into public.zuri_message_reactions values(source,target,actor,v_emoji) on conflict(origin,message_id,user_id) do update set emoji=excluded.emoji;else delete from public.zuri_message_reactions where origin=source and message_id=target and user_id=actor and zuri_message_reactions.emoji=v_emoji;end if;return zuri_internal.message_reactions(actor,source,target);
 end if;raise exception 'Unknown conversation operation' using errcode='22023';
end $$;
revoke all on function zuri_internal.conversation_action(text,jsonb) from public,anon,authenticated;

create function public.zuri_person_photo(actor uuid,person_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare prof public.zuri_profiles;result jsonb;begin
 if not zuri_internal.profile_known(actor,person_id) then raise exception 'Profile unavailable' using errcode='42501';end if;select * into prof from public.zuri_profiles where user_id=person_id;
 if actor<>person_id and not prof.avatar_public then raise exception 'Photo is private' using errcode='42501';end if;
 select to_jsonb(md) into result from public.zuri_media md where md.id=prof.avatar_media_id and md.owner_id=person_id and md.state='ready' and md.mime in ('image/jpeg','image/png','image/webp');if result is null then raise exception 'Photo unavailable' using errcode='42501';end if;return result;
end $$;
create function public.zuri_chat_media(actor uuid,message_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare msg public.zuri_chat_messages;result jsonb;begin
 select * into msg from public.zuri_chat_messages where id=message_id;if msg.id is null or not zuri_internal.active_user(actor) or not exists(select 1 from public.zuri_conversation_members where conversation_id=msg.conversation_id and user_id=actor and state='accepted') then raise exception 'Attachment unavailable' using errcode='42501';end if;
 select to_jsonb(md) into result from public.zuri_media md where md.id=msg.media_id and md.owner_id=msg.sender_id and md.state='ready';if result is null then raise exception 'Attachment unavailable' using errcode='42501';end if;return result;
end $$;
revoke all on function public.zuri_person_photo(uuid,uuid),public.zuri_chat_media(uuid,uuid) from public,anon,authenticated;grant execute on function public.zuri_person_photo(uuid,uuid),public.zuri_chat_media(uuid,uuid) to service_role;
do $$declare def text;marker text:=' elsif action=''records.list'' then';begin select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into def;if position(marker in def)=0 then raise exception 'Unexpected backend definition';end if;execute replace(def,marker,E' elsif action in (''entities.contexts'',''contexts.related'',''entities.context.get'',''contexts.plans'',''chapters.plans'',''profiles.view'',''chats.inbox'',''chats.thread'',''chats.send.v2'',''messages.react'') then\n return zuri_internal.conversation_action(action,payload);\n'||marker);end $$;
notify pgrst,'reload schema';
commit;
