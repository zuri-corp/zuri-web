-- PROPOSED, UNAPPLIED. Requires reconciliation of proposal 001 plus actual
-- admin_users/enquiries/auth schema in staging. Never run blindly in production.
-- Delegated management does not transfer canonical ownership or Member status.
begin;
create table public.zuri_pamoja_managers (
 content_id uuid not null references public.zuri_website_content(id),
 user_id uuid not null references auth.users(id),
 granted_at timestamptz not null default now(), revoked_at timestamptz,
 primary key(content_id,user_id)
);
create table public.zuri_pamoja_settings (
 content_id uuid primary key references public.zuri_website_content(id),
 moments_enabled boolean not null default false
);
create table public.zuri_pamoja_moments (
 id uuid primary key default gen_random_uuid(),
 content_id uuid not null references public.zuri_website_content(id),
 display_name text not null check(char_length(trim(display_name)) between 1 and 80),
 note text not null check(char_length(trim(note)) between 1 and 1200),
 permission_reference text not null check(char_length(trim(permission_reference)) between 10 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn')),
 created_at timestamptz not null default now(), published_at timestamptz,
 reviewed_by uuid references auth.users(id), review_reference text,
 check(status <> 'approved' or (published_at is not null and reviewed_by is not null and char_length(trim(review_reference)) >= 10))
);
-- Base moderation foundation. Proposal 003 adds approved basic-account contribution intake.
create table public.zuri_pamoja_management_audit (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.zuri_website_content(id),
 actor_id uuid not null references auth.users(id), action text not null,
 subject_id uuid, reference text not null, created_at timestamptz not null default now()
);
alter table public.zuri_pamoja_managers enable row level security;
alter table public.zuri_pamoja_settings enable row level security;
alter table public.zuri_pamoja_moments enable row level security;
alter table public.zuri_pamoja_management_audit enable row level security;
revoke all on public.zuri_pamoja_managers,public.zuri_pamoja_settings,public.zuri_pamoja_moments,public.zuri_pamoja_management_audit from public,anon,authenticated;
grant all on public.zuri_pamoja_managers,public.zuri_pamoja_settings,public.zuri_pamoja_moments to service_role;
grant select,insert on public.zuri_pamoja_management_audit to service_role;
create index zuri_pamoja_pending on public.zuri_pamoja_moments(created_at,id) where status='pending';

create function public.zuri_pamoja_manage(actor uuid, action text, content_id uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid := content_id; act text := action; p public.zuri_website_content%rowtype; result jsonb;
begin
 if not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until < now()) and u.deleted_at is null) then
  raise exception 'Verified account required' using errcode='42501';
 end if;
 if act='list' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
   select c.id,c.kind,c.slug,c.revision,c.data,coalesce(s.moments_enabled,false) as moments_enabled
   from public.zuri_pamoja_managers m join public.zuri_website_content c on c.id=m.content_id
   left join public.zuri_pamoja_settings s on s.content_id=c.id
   where m.user_id=actor and m.revoked_at is null and c.kind in ('space','person') and c.status <> 'archived'
   order by c.updated_at desc,c.id limit 100
  ) x; return result;
 end if;
 -- All management/review mutations serialize on the same profile row so revocation
 -- cannot race an owner write and pausing cannot race approval for this profile.
 select * into p from public.zuri_website_content c where c.id=target for update;
 if p.id is null or p.kind not in ('space','person') or p.status='archived' then raise exception 'Ineligible profile' using errcode='22023'; end if;
 if not exists(select 1 from public.zuri_pamoja_managers m where m.content_id=target and m.user_id=actor and m.revoked_at is null) then raise exception 'Management access required' using errcode='42501'; end if;
 if act='moments' then
  if p.kind <> 'space' or jsonb_typeof(payload->'enabled') <> 'boolean' or payload->'enabled' is null then raise exception 'Invalid Moments setting' using errcode='22023'; end if;
  insert into public.zuri_pamoja_settings values(target,(payload->>'enabled')::boolean)
   on conflict on constraint zuri_pamoja_settings_pkey do update set moments_enabled=excluded.moments_enabled;
  insert into public.zuri_pamoja_management_audit(content_id,actor_id,action,reference) values(target,actor,'moments',payload->>'enabled');
 elsif act='draft' then
  if payload->>'kind' <> p.kind or jsonb_typeof(payload->'data') <> 'object' or payload->'data' is null then raise exception 'Invalid draft' using errcode='22023'; end if;
  if (payload->>'revision')::integer is distinct from p.revision then raise exception 'Stale draft' using errcode='40001'; end if;
  update public.zuri_website_content c set data=payload->'data',revision=c.revision+1,updated_at=now(),updated_by=actor where c.id=target;
  insert into public.zuri_pamoja_management_audit(content_id,actor_id,action,reference) values(target,actor,'draft','Manager submitted draft for editorial review');
 else raise exception 'Unknown action' using errcode='22023'; end if;
 return jsonb_build_object('saved',true);
end $$;

create function public.zuri_pamoja_review(actor uuid, action text, content_id uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid:=content_id; act text:=action; p public.zuri_website_content%rowtype; subject uuid; evidence text; grants jsonb; moments jsonb; profiles jsonb; accounts jsonb; claims jsonb;
begin
 if not exists(select 1 from public.admin_users a where a.user_id=actor) then raise exception 'Admin required' using errcode='42501'; end if;
 if act='list' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into grants from (select m.content_id,m.user_id,m.granted_at,m.revoked_at from public.zuri_pamoja_managers m order by m.granted_at desc,m.content_id,m.user_id limit 100) x;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into moments from (select m.id,m.content_id,m.display_name,m.note,m.status,m.permission_reference from public.zuri_pamoja_moments m where m.status='pending' order by m.created_at,m.id limit 100) x;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into profiles from (select c.id,c.data->>'name' as name,c.slug from public.zuri_website_content c where c.kind in ('space','person') and c.consent_verified and c.status <> 'archived' order by c.updated_at desc,c.id limit 100) x;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into accounts from (select u.id,u.email from auth.users u where u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until < now()) order by u.created_at desc,u.id limit 100) x;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into claims from (select e.id,e.name,e.email from public.enquiries e where e.message like 'Pamoja manual claim request%' order by e.created_at desc,e.id limit 100) x;
  return jsonb_build_object('grants',grants,'moments',moments,'profiles',profiles,'accounts',accounts,'claims',claims);
 end if;
 evidence:=trim(payload->>'reference');
 if evidence is null or char_length(evidence) not between 10 and 1000 then raise exception 'Evidence required' using errcode='22023'; end if;
 select * into p from public.zuri_website_content c where c.id=target for update;
 if p.id is null or p.kind not in ('space','person') then raise exception 'Ineligible profile' using errcode='22023'; end if;
 if act='grant' then
  subject:=(payload->>'user_id')::uuid;
  if p.status='archived' or not p.consent_verified then raise exception 'Consent required' using errcode='22023'; end if;
  if not exists(select 1 from auth.users u where u.id=subject and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())) then raise exception 'Verified active account required' using errcode='22023'; end if;
  if not exists(select 1 from public.enquiries e where e.id::text=payload->>'enquiry_id' and e.message like 'Pamoja manual claim request%') then raise exception 'Claim enquiry required' using errcode='22023'; end if;
  insert into public.zuri_pamoja_managers(content_id,user_id) values(target,subject)
   on conflict on constraint zuri_pamoja_managers_pkey do update set granted_at=now(),revoked_at=null;
  evidence:=evidence || ' | Claim enquiry: ' || (payload->>'enquiry_id');
 elsif act='revoke' then
  subject:=(payload->>'user_id')::uuid;
  update public.zuri_pamoja_managers m set revoked_at=now() where m.content_id=target and m.user_id=subject and m.revoked_at is null;
  if not found then raise exception 'No active grant' using errcode='40001'; end if;
  if not exists(select 1 from public.zuri_pamoja_managers m where m.content_id=target and m.revoked_at is null) then update public.zuri_pamoja_settings s set moments_enabled=false where s.content_id=target; end if;
 elsif act in ('approve','reject','withdraw') then
  subject:=(payload->>'moment_id')::uuid;
  if act='approve' and (p.kind <> 'space' or p.status <> 'published' or not p.consent_verified or not exists(select 1 from public.zuri_pamoja_settings s where s.content_id=target and s.moments_enabled)) then raise exception 'Publication or opt-in missing' using errcode='22023'; end if;
  update public.zuri_pamoja_moments m set status=case act when 'approve' then 'approved' when 'reject' then 'rejected' else 'withdrawn' end,
   published_at=case when act='approve' then now() else m.published_at end,reviewed_by=actor,review_reference=evidence
   where m.id=subject and m.content_id=target and m.status=case when act='withdraw' then 'approved' else 'pending' end;
  if not found then raise exception 'Moment changed or unavailable' using errcode='40001'; end if;
 else raise exception 'Unknown action' using errcode='22023'; end if;
 insert into public.zuri_pamoja_management_audit(content_id,actor_id,action,subject_id,reference) values(target,actor,act,subject,evidence);
 return jsonb_build_object('saved',true);
end $$;

create function public.zuri_public_moments(address text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('enabled',true,'items',coalesce((select jsonb_agg(x) from (
  select m.id,m.display_name,m.note,m.published_at from public.zuri_pamoja_moments m
  where m.content_id=c.id and m.status='approved' order by m.published_at desc,m.id limit 30
 ) x),'[]'::jsonb)) from public.zuri_website_content c join public.zuri_pamoja_settings s on s.content_id=c.id
 where c.slug=address and c.kind='space' and c.status='published' and c.published_data is not null and c.consent_verified and s.moments_enabled),jsonb_build_object('enabled',false,'items','[]'::jsonb));
$$;
revoke all on function public.zuri_pamoja_manage(uuid,text,uuid,jsonb),public.zuri_pamoja_review(uuid,text,uuid,jsonb),public.zuri_public_moments(text) from public,anon,authenticated;
grant execute on function public.zuri_pamoja_manage(uuid,text,uuid,jsonb),public.zuri_pamoja_review(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.zuri_public_moments(text) to anon,authenticated,service_role;
commit;
