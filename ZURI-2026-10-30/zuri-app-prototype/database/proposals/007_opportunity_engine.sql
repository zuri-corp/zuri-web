-- ADDITIVE, NOT APPLIED. Requires auth.users and existing public.admin_users.
-- Apply to a staging branch first. No existing tables, identities or grants changed.
begin;
create table public.zuri_opportunity_policy (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_request_cap integer not null default 12 check(daily_request_cap between 0 and 1000),
 daily_micros_cap bigint not null default 0 check(daily_micros_cap>=0),
 request_reserve_micros bigint not null default 0 check(request_reserve_micros>=0)
);
insert into public.zuri_opportunity_policy(id) values(true);
create table public.zuri_opportunity_sources (
 id uuid primary key default gen_random_uuid(),provider text not null check(provider in ('x','google_maps','quicket')),
 label text not null check(length(label) between 1 and 120),mode text not null check(mode in ('account','search','venue','events')),
 query text not null check(length(query)<=320),enabled boolean not null default false,approved boolean not null default false,
 permission_reference text, interval_minutes integer not null default 360 check(interval_minutes between 15 and 10080),
 since_id text,cursor text,pending_since_id text,failures integer not null default 0,
 next_run_at timestamptz not null default now(),lease_token uuid,lease_until timestamptz,
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 unique(provider,mode,query),check(not approved or (permission_reference is not null and length(permission_reference)>4))
);
create table public.zuri_opportunity_usage (
 day date primary key, requests integer not null default 0,reserved_micros bigint not null default 0
);
create table public.zuri_opportunity_extraction_evidence (
 opportunity_id uuid primary key, fields jsonb not null,created_at timestamptz not null default now()
);
create table public.zuri_opportunity_runs (
 id uuid primary key default gen_random_uuid(),source_id uuid references public.zuri_opportunity_sources(id),
 started_at timestamptz not null default now(),finished_at timestamptz,status text not null default 'reserved',
 reserved_micros bigint not null, fetched integer not null default 0,filtered integer not null default 0,
 duplicates integer not null default 0, drafts integer not null default 0,error text,
 check(status in ('reserved','complete','backoff','failed'))
);
create table public.zuri_opportunities (
 id uuid primary key default gen_random_uuid(),fingerprint text not null unique,
 kind text not null check(kind in ('event','job','scholarship','grant','offer','service','collaboration','community')),
 title text not null check(length(title) between 1 and 180),summary text not null check(length(summary)<=1200),
 tags text[] not null default '{}',location text,eligibility text,expires_at timestamptz,
 status text not null default 'review' check(status in ('review','published','withdrawn')),confidence numeric not null check(confidence between 0 and 1),
 source_url text not null check(source_url ~ '^https://'),official_url text check(official_url ~ '^https://'),official_verified_at timestamptz,
 discovered_at timestamptz not null default now(),refreshed_at timestamptz not null default now(),fresh_until timestamptz not null,
 space_id text,venue_place_id text,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 check(status<>'published' or reviewed_by is not null)
);
create index zuri_opportunity_discovery on public.zuri_opportunities(status,kind,fresh_until);
create index zuri_opportunity_tags on public.zuri_opportunities using gin(tags);
create index zuri_opportunity_location on public.zuri_opportunities(lower(location));
alter table public.zuri_opportunities add column title_summary_search tsvector generated always as(to_tsvector('english',title||' '||summary)) stored;
create index zuri_opportunity_text on public.zuri_opportunities using gin(title_summary_search);
create table public.zuri_opportunity_evidence (
 source_id uuid references public.zuri_opportunity_sources(id),external_id text not null,
 opportunity_id uuid references public.zuri_opportunities(id) on delete cascade,content_hash text not null,
 source_url text not null,first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),
 primary key(source_id,external_id)
);
alter table public.zuri_opportunity_extraction_evidence add foreign key(opportunity_id) references public.zuri_opportunities(id) on delete cascade;
create table public.zuri_opportunity_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade, interests text[] not null default '{}',
 location text not null default '',updated_at timestamptz not null default now(),
 check(cardinality(interests)<=12 and length(location)<=100)
);
create table public.zuri_opportunity_saves (
 user_id uuid references auth.users(id) on delete cascade,opportunity_id uuid references public.zuri_opportunities(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(user_id,opportunity_id)
);
create table public.zuri_opportunity_edges (
 opportunity_id uuid references public.zuri_opportunities(id) on delete cascade,
 kind text not null check(kind in ('space','venue','organization','society','opportunity')),
 target_id text not null,source_url text not null check(source_url ~ '^https://'),
 reviewed_by uuid not null references auth.users(id),primary key(opportunity_id,kind,target_id)
);
create table public.zuri_opportunity_audit (
 id bigint generated always as identity primary key,actor uuid references auth.users(id),
 action text not null,target_id uuid,created_at timestamptz not null default now(),detail jsonb not null default '{}'
);
do $$ declare t text; begin
 foreach t in array array['zuri_opportunity_policy','zuri_opportunity_sources','zuri_opportunity_usage','zuri_opportunity_runs','zuri_opportunities','zuri_opportunity_evidence','zuri_opportunity_extraction_evidence','zuri_opportunity_preferences','zuri_opportunity_saves','zuri_opportunity_edges','zuri_opportunity_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.zuri_opportunities,public.zuri_opportunity_edges to anon,authenticated;
create policy opportunity_public on public.zuri_opportunities for select to anon,authenticated
 using(status='published' and fresh_until>now() and (expires_at is null or expires_at>now()));
create policy opportunity_edge_public on public.zuri_opportunity_edges for select to anon,authenticated
 using(exists(select 1 from public.zuri_opportunities o where o.id=opportunity_id));
grant select,insert,update,delete on public.zuri_opportunity_preferences,public.zuri_opportunity_saves to authenticated;
create policy own_opportunity_preferences on public.zuri_opportunity_preferences to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_opportunity_saves on public.zuri_opportunity_saves to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.zuri_opportunities o where o.id=opportunity_id));

-- Lock policy and daily ledger before reserving worst-case cost. One page per lease/run.
-- Ambiguous failures KEEP their reservation. This prevents retry overspend.
create function public.zuri_opportunity_claim() returns jsonb language plpgsql security definer set search_path=public as $$
declare p zuri_opportunity_policy; s zuri_opportunity_sources; u zuri_opportunity_usage; r uuid; token uuid;
begin
 select * into p from zuri_opportunity_policy where id=true for update;
 if not p.enabled or p.request_reserve_micros<=0 then return null; end if;
 insert into zuri_opportunity_usage(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 select * into u from zuri_opportunity_usage where day=(now() at time zone 'UTC')::date for update;
 if u.requests>=p.daily_request_cap or u.reserved_micros+p.request_reserve_micros>p.daily_micros_cap then return null; end if;
 select * into s from zuri_opportunity_sources where provider='x' and approved and enabled and next_run_at<=now()
 and (lease_until is null or lease_until<now()) order by next_run_at for update skip locked limit 1;
 if not found then return null; end if;
 token:=gen_random_uuid();
 update zuri_opportunity_sources set lease_token=token,lease_until=now()+interval '5 minutes' where id=s.id;
 update zuri_opportunity_usage set requests=requests+1,reserved_micros=reserved_micros+p.request_reserve_micros where day=u.day;
 insert into zuri_opportunity_runs(source_id,reserved_micros) values(s.id,p.request_reserve_micros) returning id into r;
 return jsonb_build_object('source',to_jsonb(s)||jsonb_build_object('lease_token',token),'run_id',r);
end $$;

-- Commit drafts, evidence, cursor checkpoint and run metrics atomically. Stale leases cannot commit.
create function public.zuri_opportunity_finish(source uuid,token uuid,run uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$
declare s zuri_opportunity_sources; item jsonb; oid uuid; dup integer:=0; added integer:=0;
begin
 select * into s from zuri_opportunity_sources where id=source for update;
 if s.lease_token is distinct from token or s.lease_until<now() then raise exception 'Stale ingestion lease' using errcode='40001'; end if;
 if not exists(select 1 from zuri_opportunity_runs where id=run and source_id=source and status='reserved') then raise exception 'Invalid run'; end if;
 if not s.enabled or not s.approved then raise exception 'Source disabled' using errcode='42501'; end if;
 for item in select * from jsonb_array_elements(coalesce(payload->'items','[]')) loop
   if exists(select 1 from zuri_opportunity_evidence where source_id=source and external_id=item->>'external_id' and content_hash=item->>'content_hash') then dup:=dup+1; continue; end if;
   insert into zuri_opportunities(fingerprint,kind,title,summary,tags,location,source_url,eligibility,expires_at,confidence,fresh_until)
   values(item->>'fingerprint',item->>'kind',item->>'title',item->>'summary',array[item->>'kind'],item->>'location',item->>'source_url',item->'extracted'->'eligibility'->>'value',nullif(item->'extracted'->'expires_at'->>'value','')::timestamptz,0.35,now()+interval '24 hours')
   on conflict(fingerprint) do nothing returning id into oid;
   if oid is null then select id into oid from zuri_opportunities where fingerprint=item->>'fingerprint';dup:=dup+1;else added:=added+1;end if;
   if item->'extracted' is not null then insert into zuri_opportunity_extraction_evidence(opportunity_id,fields) values(oid,item->'extracted') on conflict do nothing;end if;
   -- A changed source is withheld for review; a duplicate never refreshes a published expiry.
   if exists(select 1 from zuri_opportunity_evidence where source_id=source and external_id=item->>'external_id' and content_hash<>item->>'content_hash') then
     update zuri_opportunities set status='review',official_verified_at=null where id in(select opportunity_id from zuri_opportunity_evidence where source_id=source and external_id=item->>'external_id');
   end if;
   insert into zuri_opportunity_evidence(source_id,external_id,opportunity_id,content_hash,source_url) values(source,item->>'external_id',oid,item->>'content_hash',item->>'source_url')
   on conflict(source_id,external_id) do update set opportunity_id=excluded.opportunity_id,content_hash=excluded.content_hash,last_seen_at=now();
 end loop;
 update zuri_opportunity_sources set
   since_id=case when payload->>'status'='complete' and payload->>'cursor' is null then coalesce(payload->>'newest_id',pending_since_id,since_id) else since_id end,
   pending_since_id=case when payload->>'status'='complete' and payload->>'cursor' is null then null else coalesce(pending_since_id,payload->>'newest_id') end,
   cursor=case when payload->>'status'='complete' then payload->>'cursor' else cursor end,
   failures=case when payload->>'status'='complete' then 0 else failures+1 end,
   next_run_at=coalesce((payload->>'retry_at')::timestamptz,now()+make_interval(mins=>interval_minutes)),lease_token=null,lease_until=null where id=source;
 update zuri_opportunity_runs set status=payload->>'status',finished_at=now(),fetched=coalesce((payload->>'fetched')::int,0),filtered=coalesce((payload->>'filtered')::int,0),duplicates=dup,drafts=added,error=payload->>'error' where id=run;
 -- Retention maintenance is driven by the same scheduled worker, even when ingestion is disabled.
end $$;
create function public.zuri_opportunity_cleanup() returns void language sql security definer set search_path=public as $$
 update zuri_opportunities set status='withdrawn',title='Expired opportunity',summary='',location=null,eligibility=null,official_url=null,venue_place_id=null where fresh_until<now() and (summary<>'' or title<>'Expired opportunity');
 delete from zuri_opportunity_evidence where last_seen_at<now()-interval '30 days';
 delete from zuri_opportunity_extraction_evidence where opportunity_id in(select id from zuri_opportunities where fresh_until<now());
 delete from zuri_opportunity_runs where started_at<now()-interval '90 days';
$$;
-- Shared paid-call reservation for on-demand admin Maps and optional extraction.
-- Costs must come from verified server configuration, never client input.
create function public.zuri_opportunity_reserve(kind text,micros bigint) returns uuid language plpgsql security definer set search_path=public as $$
declare p zuri_opportunity_policy;u zuri_opportunity_usage;r uuid;
begin
 if kind not in ('maps','extraction') or micros<=0 then return null;end if;
 select * into p from zuri_opportunity_policy where id=true for update;
 if not p.enabled then return null;end if;
 insert into zuri_opportunity_usage(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 select * into u from zuri_opportunity_usage where day=(now() at time zone 'UTC')::date for update;
 if u.requests>=p.daily_request_cap or u.reserved_micros+micros>p.daily_micros_cap then return null;end if;
 update zuri_opportunity_usage set requests=requests+1,reserved_micros=reserved_micros+micros where day=u.day;
 insert into zuri_opportunity_runs(reserved_micros,error) values(micros,kind||' reservation') returning id into r;
 return r;
end $$;
revoke all on function public.zuri_opportunity_reserve(text,bigint) from public,anon,authenticated;
grant execute on function public.zuri_opportunity_reserve(text,bigint) to service_role;
create function public.zuri_opportunity_admin(actor uuid,action text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare target uuid; result jsonb;
begin
 if not exists(select 1 from admin_users where user_id=actor) then raise exception 'Admin required' using errcode='42501';end if;
 if action='source' then
  insert into zuri_opportunity_sources(provider,label,mode,query,permission_reference,enabled,approved,reviewed_by,reviewed_at)
  values('x',payload->>'label',payload->>'mode',payload->>'query',payload->>'permission_reference',false,false,actor,now()) returning id into target;
 elsif action='toggle-source' then
  target:=(payload->>'id')::uuid;
  update zuri_opportunity_sources set enabled=(payload->>'enabled')::boolean,approved=(payload->>'enabled')::boolean,reviewed_by=actor,reviewed_at=now() where id=target and provider='x' and permission_reference is not null;
  if not found then raise exception 'Source not eligible';end if;
 elsif action='moderate' then
  target:=(payload->>'id')::uuid;
  if payload->>'status' not in ('published','withdrawn','review') then raise exception 'Invalid moderation state';end if;
  if payload->>'status'='published' and (payload->>'evidence_reviewed' is distinct from 'true' or length(coalesce(payload->>'review_note',''))<10) then raise exception 'Evidence review required';end if;
  update zuri_opportunities set status=payload->>'status',reviewed_by=actor,reviewed_at=now(),refreshed_at=now(),
   fresh_until=least(fresh_until,now()+interval '24 hours'),
   official_url=nullif(payload->>'official_url',''),official_verified_at=case when nullif(payload->>'official_url','') is not null and payload->>'official_checked'='true' then now() else null end,
   expires_at=nullif(payload->>'expires_at','')::timestamptz,eligibility=nullif(payload->>'eligibility',''),
   confidence=case when payload->>'status'='published' then 0.7 else confidence end
  where id=target and (payload->>'status'<>'published' or fresh_until>now());
  if not found then raise exception 'Opportunity missing or stale';end if;
 elsif action='link' then
  target:=(payload->>'id')::uuid;
  if payload->>'kind' not in ('space','venue','organization','society','opportunity') then raise exception 'Invalid edge';end if;
  insert into zuri_opportunity_edges(opportunity_id,kind,target_id,source_url,reviewed_by) values(target,payload->>'kind',payload->>'target_id',payload->>'source_url',actor)
  on conflict(opportunity_id,kind,target_id) do update set source_url=excluded.source_url,reviewed_by=actor;
  if payload->>'kind'='venue' then update zuri_opportunities set venue_place_id=payload->>'target_id' where id=target;end if;
  if payload->>'kind'='space' then update zuri_opportunities set space_id=payload->>'target_id' where id=target;end if;
 elsif action='policy' then
  update zuri_opportunity_policy set enabled=(payload->>'enabled')::boolean,daily_request_cap=(payload->>'daily_request_cap')::integer,
   daily_micros_cap=(payload->>'daily_micros_cap')::bigint,request_reserve_micros=(payload->>'request_reserve_micros')::bigint where id=true;
 else raise exception 'Unsupported admin action';end if;
 insert into zuri_opportunity_audit(actor,action,target_id,detail) values(actor,action,target,payload);
 return jsonb_build_object('saved',true,'id',target);
end $$;
revoke all on function public.zuri_opportunity_admin(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.zuri_opportunity_admin(uuid,text,jsonb) to service_role;
revoke all on function public.zuri_opportunity_claim(),public.zuri_opportunity_finish(uuid,uuid,uuid,jsonb),public.zuri_opportunity_cleanup() from public,anon,authenticated;
grant execute on function public.zuri_opportunity_claim(),public.zuri_opportunity_finish(uuid,uuid,uuid,jsonb),public.zuri_opportunity_cleanup() to service_role;
commit;
