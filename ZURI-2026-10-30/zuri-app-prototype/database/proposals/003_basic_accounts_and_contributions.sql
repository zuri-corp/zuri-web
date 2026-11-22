-- PROPOSED ADDITIVE DDL, UNAPPLIED. Reconcile proposals 001/002 with the
-- actual schema in staging first. No email or phone is copied out of Auth.
begin;
create table public.zuri_pamoja_accounts (
 user_id uuid primary key references auth.users(id),
 display_name text not null check(char_length(trim(display_name)) between 1 and 80 and display_name !~ E'[@\\n\\r]'),
 updated_at timestamptz not null default now()
);
alter table public.zuri_pamoja_accounts enable row level security;
revoke all on public.zuri_pamoja_accounts from public,anon,authenticated;
grant select,insert,update on public.zuri_pamoja_accounts to service_role;
alter table public.zuri_pamoja_moments add column author_id uuid references auth.users(id),
 add column request_id uuid, add column permission_version text;
create unique index zuri_moment_submission_request on public.zuri_pamoja_moments(author_id,request_id) where author_id is not null and request_id is not null;
create index zuri_moment_contributor on public.zuri_pamoja_moments(author_id,created_at desc,id);

create function public.zuri_pamoja_contribute(actor uuid, action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare act text:=action; profile public.zuri_website_content%rowtype; basic public.zuri_pamoja_accounts%rowtype;
 moment public.zuri_pamoja_moments%rowtype; name text; note_text text; target uuid; page_number integer; total bigint; items jsonb;
begin
 if not exists(select 1 from auth.users u where u.id=actor and u.email is not null and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())) then raise exception 'Verified email required' using errcode='42501'; end if;
 if act='list' then
  page_number:=coalesce((payload->>'page')::integer,1);
  if page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select * into basic from public.zuri_pamoja_accounts a where a.user_id=actor;
  select count(*) into total from public.zuri_pamoja_moments m where m.author_id=actor;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into items from (
   select m.id,m.status,m.note,m.display_name,m.created_at,
    coalesce(c.published_data->>'name','Space unavailable') as space_name,
    case when c.status='published' and c.consent_verified then c.slug else null end as space_slug
   from public.zuri_pamoja_moments m join public.zuri_website_content c on c.id=m.content_id
   where m.author_id=actor order by m.created_at desc,m.id limit 20 offset (page_number-1)*20
  ) x;
  return jsonb_build_object('account',case when basic.user_id is null then null else jsonb_build_object('display_name',basic.display_name) end,'items',items,'total',total);
 end if;
 if act='account' then
  if jsonb_typeof(payload->'display_name') is distinct from 'string' then raise exception 'Public name required' using errcode='22023'; end if;
  name:=trim(payload->>'display_name');
  if char_length(name) not between 1 and 80 or name ~ E'[@\\n\\r]' then raise exception 'Use a public name, not an email' using errcode='22023'; end if;
  insert into public.zuri_pamoja_accounts(user_id,display_name) values(actor,name)
   on conflict on constraint zuri_pamoja_accounts_pkey do update set display_name=excluded.display_name,updated_at=now();
  return jsonb_build_object('saved',true);
 end if;
 -- The account lock serializes per-contributor requests and rate-limit checks.
 select * into basic from public.zuri_pamoja_accounts a where a.user_id=actor for update;
 if basic.user_id is null then raise exception 'Choose a public name first' using errcode='22023'; end if;
 if act='submit' then
  if payload->'consent' is distinct from 'true'::jsonb or payload->>'permission_version' is distinct from 'moments-note-v1' or jsonb_typeof(payload->'note') is distinct from 'string' then raise exception 'Permission and note required' using errcode='22023'; end if;
  note_text:=trim(payload->>'note');
  if char_length(note_text) not between 1 and 1200 or payload->>'request_id' is null or payload->>'slug' is null then raise exception 'Invalid submission' using errcode='22023'; end if;
  select * into profile from public.zuri_website_content c where c.kind='space' and c.slug=payload->>'slug' for update;
  if profile.id is null then raise exception 'Space unavailable' using errcode='22023'; end if;
  select * into moment from public.zuri_pamoja_moments m where m.author_id=actor and m.request_id=(payload->>'request_id')::uuid;
  if moment.id is not null then
   if moment.content_id <> profile.id or moment.note <> note_text then raise exception 'Request already used' using errcode='40001'; end if;
   return jsonb_build_object('id',moment.id,'status',moment.status);
  end if;
  -- Same profile lock as settings/review: pausing, consent withdrawal or archive
  -- cannot race this availability check into an unapproved public contribution.
  if profile.status <> 'published' or profile.published_data is null or not profile.consent_verified or not exists(select 1 from public.zuri_pamoja_settings s where s.content_id=profile.id and s.moments_enabled) then raise exception 'Guestbook closed' using errcode='22023'; end if;
  if (select count(*) from public.zuri_pamoja_moments m where m.author_id=actor and m.created_at > now()-interval '1 hour') >= 5 then raise exception 'Contribution rate exceeded' using errcode='P0001'; end if;
  insert into public.zuri_pamoja_moments(content_id,author_id,request_id,display_name,note,permission_version,permission_reference,status)
   values(profile.id,actor,(payload->>'request_id')::uuid,basic.display_name,note_text,'moments-note-v1','Contributor explicitly agreed to publish this note and chosen name; moments-note-v1','pending') returning * into moment;
  insert into public.zuri_pamoja_management_audit(content_id,actor_id,action,subject_id,reference) values(profile.id,actor,'moment-submit',moment.id,'moments-note-v1; explicit permission');
 elsif act='withdraw' then
  select m.content_id into target from public.zuri_pamoja_moments m where m.id=(payload->>'moment_id')::uuid and m.author_id=actor;
  if target is null then raise exception 'Your contribution only' using errcode='42501'; end if;
  perform 1 from public.zuri_website_content c where c.id=target for update;
  select * into moment from public.zuri_pamoja_moments m where m.id=(payload->>'moment_id')::uuid and m.author_id=actor for update;
  if moment.status <> 'withdrawn' then
   update public.zuri_pamoja_moments m set status='withdrawn' where m.id=moment.id returning * into moment;
   insert into public.zuri_pamoja_management_audit(content_id,actor_id,action,subject_id,reference) values(target,actor,'moment-withdraw',moment.id,'Contributor withdrew publication permission');
  end if;
 else raise exception 'Unknown contribution action' using errcode='22023'; end if;
 return jsonb_build_object('id',moment.id,'status',moment.status);
end $$;

create or replace function public.zuri_public_moments(address text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('enabled',true,'space_name',c.published_data->>'name','items',coalesce((select jsonb_agg(x) from (
  select m.id,m.display_name,m.note,m.published_at from public.zuri_pamoja_moments m
  where m.content_id=c.id and m.status='approved' order by m.published_at desc,m.id limit 30
 ) x),'[]'::jsonb)) from public.zuri_website_content c join public.zuri_pamoja_settings s on s.content_id=c.id
 where c.slug=address and c.kind='space' and c.status='published' and c.published_data is not null and c.consent_verified and s.moments_enabled),jsonb_build_object('enabled',false,'items','[]'::jsonb));
$$;
revoke all on function public.zuri_pamoja_contribute(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.zuri_pamoja_contribute(uuid,text,jsonb) to service_role;
-- CREATE OR REPLACE preserves existing grants; state the intended contract again.
revoke all on function public.zuri_public_moments(text) from public,anon,authenticated;
grant execute on function public.zuri_public_moments(text) to anon,authenticated,service_role;
commit;
