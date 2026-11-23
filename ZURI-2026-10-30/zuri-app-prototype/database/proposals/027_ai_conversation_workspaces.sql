begin;

-- Private AI workspaces are deliberately separate from Rizz conversations and
-- public content.  They provide resumable, user-owned context for Viola/Sanyu.
create table if not exists public.zuri_ai_threads(
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 assistant text not null check(assistant in ('viola','robert')),
 title text not null check(length(trim(title)) between 1 and 80),
 contexts jsonb not null default '[]'::jsonb check(jsonb_typeof(contexts)='array' and jsonb_array_length(contexts)<=4),
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists zuri_ai_threads_owner_updated on public.zuri_ai_threads(owner_id,updated_at desc) where archived_at is null;
create table if not exists public.zuri_ai_thread_messages(
 id uuid primary key,
 thread_id uuid not null references public.zuri_ai_threads(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('user','assistant')),
 content text not null check(length(trim(content)) between 1 and 4000),
 sources jsonb not null default '[]'::jsonb check(jsonb_typeof(sources)='array' and jsonb_array_length(sources)<=12),
 created_at timestamptz not null default now()
);
create index if not exists zuri_ai_thread_messages_thread_created on public.zuri_ai_thread_messages(thread_id,created_at desc);
alter table public.zuri_ai_threads enable row level security;
alter table public.zuri_ai_thread_messages enable row level security;
revoke all on public.zuri_ai_threads,public.zuri_ai_thread_messages from public,anon,authenticated;

create or replace function zuri_internal.ai_conversation_action(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); thread_id uuid:=nullif(payload->>'id','')::uuid; thread public.zuri_ai_threads; message_id uuid; role_value text; content_value text;
begin
 if not zuri_internal.active_user(actor) then raise exception 'Verified account required' using errcode='42501'; end if;
 if action='ai.threads.list' then
  return coalesce((select jsonb_agg(to_jsonb(row) order by row.updated_at desc) from (select id,assistant,title,contexts,created_at,updated_at from public.zuri_ai_threads where owner_id=actor and archived_at is null order by updated_at desc limit 30) row),'[]'::jsonb);
 end if;
 if thread_id is null then raise exception 'Conversation workspace required' using errcode='22023'; end if;
 if action='ai.threads.save' then
  if payload->>'assistant' not in ('viola','robert') or length(trim(coalesce(payload->>'title','')))<1 or jsonb_typeof(coalesce(payload->'contexts','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(payload->'contexts','[]'::jsonb))>4 then raise exception 'Invalid conversation workspace' using errcode='22023'; end if;
  insert into public.zuri_ai_threads(id,owner_id,assistant,title,contexts) values(thread_id,actor,payload->>'assistant',left(trim(payload->>'title'),80),payload->'contexts')
  on conflict(id) do update set title=excluded.title,contexts=excluded.contexts,updated_at=now() where zuri_ai_threads.owner_id=actor;
  if not found then raise exception 'Conversation workspace not found' using errcode='P0002'; end if;
  return jsonb_build_object('saved',true);
 end if;
 select * into thread from public.zuri_ai_threads where id=thread_id and owner_id=actor for update;
 if thread.id is null then raise exception 'Conversation workspace not found' using errcode='P0002'; end if;
 if action='ai.threads.get' then
  return to_jsonb(thread)||jsonb_build_object('messages',coalesce((select jsonb_agg(to_jsonb(row) order by row.created_at asc) from (select id,role,content,sources,created_at from public.zuri_ai_thread_messages where thread_id=thread.id and owner_id=actor order by created_at desc limit 50) row),'[]'::jsonb));
 elsif action='ai.threads.message' then
  message_id:=nullif(payload->>'message_id','')::uuid;role_value:=payload->>'role';content_value:=trim(coalesce(payload->>'content',''));
  if message_id is null or role_value not in ('user','assistant') or length(content_value) not between 1 and 4000 or jsonb_typeof(coalesce(payload->'sources','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(payload->'sources','[]'::jsonb))>12 then raise exception 'Invalid conversation message' using errcode='22023'; end if;
  insert into public.zuri_ai_thread_messages(id,thread_id,owner_id,role,content,sources) values(message_id,thread.id,actor,role_value,content_value,coalesce(payload->'sources','[]'::jsonb)) on conflict(id) do nothing;
  update public.zuri_ai_threads set updated_at=now() where id=thread.id;
  return jsonb_build_object('saved',true);
 elsif action='ai.threads.archive' then
  update public.zuri_ai_threads set archived_at=now(),updated_at=now() where id=thread.id;
  return jsonb_build_object('archived',true);
 end if;
 raise exception 'Unknown AI conversation action' using errcode='22023';
end $$;
revoke all on function zuri_internal.ai_conversation_action(text,jsonb) from public,anon,authenticated;

do $$
declare definition text; marker text:=' elsif action=''records.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position('''ai.threads.list''' in definition)>0 then return; end if;
 if position(marker in definition)=0 then raise exception 'Backend dispatcher changed'; end if;
 execute replace(definition,marker,E' elsif action in (''ai.threads.list'',''ai.threads.get'',''ai.threads.save'',''ai.threads.message'',''ai.threads.archive'') then\n  return zuri_internal.ai_conversation_action(action,payload);\n'||marker);
end $$;

notify pgrst,'reload schema';
commit;
