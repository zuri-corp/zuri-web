-- STAGING PROPOSAL. Apply after review. Does not enable AI or provision paid plans.
-- Only the trusted ZURI server (service_role) may use these RPCs.
begin;
create table public.zuri_ai_policy (
  id boolean primary key default true check(id), enabled boolean not null default false,
  trial_monthly_micros bigint not null default 0 check(trial_monthly_micros between 0 and 1000000000),
  daily_limit_micros bigint not null default 0 check(daily_limit_micros between 0 and 1000000000000)
);
insert into public.zuri_ai_policy(id) values(true);
create table public.zuri_ai_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  monthly_limit_micros bigint not null check(monthly_limit_micros between 0 and 1000000000)
);
create table public.zuri_ai_account_usage (
  user_id uuid references auth.users(id) on delete cascade, month date not null,
  held_micros bigint not null default 0 check(held_micros>=0), spent_micros bigint not null default 0 check(spent_micros>=0),
  primary key(user_id,month)
);
create table public.zuri_ai_daily_usage (
  day date primary key, held_micros bigint not null default 0 check(held_micros>=0), spent_micros bigint not null default 0 check(spent_micros>=0)
);
create table public.zuri_ai_requests (
  user_id uuid references auth.users(id) on delete cascade, request_id uuid not null,
  fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
  mode text not null check(mode in ('intent','guide','viola')), model text not null check(length(model) between 1 and 100),
  status text not null default 'held' check(status in ('held','settled')),
  month date not null, day date not null,
  reserved_micros bigint not null check(reserved_micros>0), actual_micros bigint,
  input_rate bigint not null check(input_rate between 1 and 1000000000), output_rate bigint not null check(output_rate between 1 and 1000000000),
  input_tokens integer, output_tokens integer,
  created_at timestamptz not null default now(), settled_at timestamptz,
  primary key(user_id,request_id)
);
create index zuri_ai_request_rate on public.zuri_ai_requests(user_id,created_at);
alter table public.zuri_ai_policy enable row level security;
alter table public.zuri_ai_accounts enable row level security;
alter table public.zuri_ai_account_usage enable row level security;
alter table public.zuri_ai_daily_usage enable row level security;
alter table public.zuri_ai_requests enable row level security;
revoke all on public.zuri_ai_policy,public.zuri_ai_accounts,public.zuri_ai_account_usage,public.zuri_ai_daily_usage,public.zuri_ai_requests from public,anon,authenticated;

create function public.zuri_ai_status(actor uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.zuri_ai_policy; a public.zuri_ai_accounts; u public.zuri_ai_account_usage; d public.zuri_ai_daily_usage; lim bigint;
begin
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now())) then raise exception 'Verified account required' using errcode='42501'; end if;
  select * into p from public.zuri_ai_policy where id;
  select * into a from public.zuri_ai_accounts where user_id=actor;
  select * into u from public.zuri_ai_account_usage where user_id=actor and month=date_trunc('month',now() at time zone 'UTC')::date;
  select * into d from public.zuri_ai_daily_usage where day=(now() at time zone 'UTC')::date;
  lim=coalesce(a.monthly_limit_micros,p.trial_monthly_micros,0);
  return jsonb_build_object('enabled',coalesce(p.enabled,false) and coalesce(a.enabled,true) and lim>coalesce(u.spent_micros,0)+coalesce(u.held_micros,0) and p.daily_limit_micros>coalesce(d.spent_micros,0)+coalesce(d.held_micros,0),
    'monthlyLimitMicros',lim,'spentMicros',coalesce(u.spent_micros,0),'heldMicros',coalesce(u.held_micros,0),
    'remainingMicros',greatest(0,lim-coalesce(u.spent_micros,0)-coalesce(u.held_micros,0)),'period','UTC calendar month');
end $$;

create function public.zuri_ai_reserve(actor uuid,request_id uuid,fingerprint text,mode text,model text,reserved_micros bigint,input_rate bigint,output_rate bigint) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.zuri_ai_policy; a public.zuri_ai_accounts; u public.zuri_ai_account_usage; d public.zuri_ai_daily_usage;
  month_key date=date_trunc('month',now() at time zone 'UTC')::date; day_key date=(now() at time zone 'UTC')::date;
begin
  -- A consistent lock order makes account + fleet reservations atomic across workers.
  select * into p from public.zuri_ai_policy where id for update;
  if not found or not p.enabled then raise exception 'AI disabled' using errcode='42501'; end if;
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now())) then raise exception 'Verified account required' using errcode='42501'; end if;
  if reserved_micros is null or reserved_micros<1 or reserved_micros>1000000000 or request_id is null or fingerprint is null or fingerprint !~ '^[a-f0-9]{64}$' or mode is null or mode not in ('intent','guide','viola') or model is null or length(model) not between 1 and 100 or input_rate is null or input_rate not between 1 and 1000000000 or output_rate is null or output_rate not between 1 and 1000000000 then raise exception 'Invalid reservation' using errcode='22023'; end if;
  if exists(select 1 from public.zuri_ai_requests r where r.user_id=actor and r.request_id=zuri_ai_reserve.request_id) then raise exception 'Already submitted; never repeat provider call' using errcode='23505'; end if;
  insert into public.zuri_ai_accounts(user_id,monthly_limit_micros) values(actor,p.trial_monthly_micros) on conflict do nothing;
  select * into a from public.zuri_ai_accounts where user_id=actor for update;
  if not a.enabled then raise exception 'Account AI disabled' using errcode='42501'; end if;
  if (select count(*) from public.zuri_ai_requests r where r.user_id=actor and r.created_at>now()-interval '1 minute')>=6 then raise exception 'Slow down' using errcode='P0001'; end if;
  insert into public.zuri_ai_account_usage(user_id,month) values(actor,month_key) on conflict do nothing;
  insert into public.zuri_ai_daily_usage(day) values(day_key) on conflict do nothing;
  select * into u from public.zuri_ai_account_usage where user_id=actor and month=month_key for update;
  select * into d from public.zuri_ai_daily_usage where day=day_key for update;
  if u.held_micros+u.spent_micros+reserved_micros>a.monthly_limit_micros or d.held_micros+d.spent_micros+reserved_micros>p.daily_limit_micros then raise exception 'Allowance exceeded' using errcode='P0001'; end if;
  insert into public.zuri_ai_requests(user_id,request_id,fingerprint,mode,model,month,day,reserved_micros,input_rate,output_rate)
    values(actor,request_id,fingerprint,mode,model,month_key,day_key,reserved_micros,input_rate,output_rate);
  update public.zuri_ai_account_usage set held_micros=held_micros+reserved_micros where user_id=actor and month=month_key;
  update public.zuri_ai_daily_usage set held_micros=held_micros+reserved_micros where day=day_key;
  return jsonb_build_object('reserved',true);
end $$;

create function public.zuri_ai_settle(actor uuid,request_id uuid,input_tokens integer,output_tokens integer,actual_micros bigint) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.zuri_ai_requests; p public.zuri_ai_policy; a public.zuri_ai_accounts; expected bigint;
begin
  select * into p from public.zuri_ai_policy where id for update;
  select * into a from public.zuri_ai_accounts where user_id=actor for update;
  select * into r from public.zuri_ai_requests q where q.user_id=actor and q.request_id=zuri_ai_settle.request_id for update;
  if not found then raise exception 'Reservation required' using errcode='42501'; end if;
  -- Return nothing when authority was revoked during the provider call. Hold for review.
  if not p.enabled or not a.enabled or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now())) then raise exception 'Authority changed' using errcode='42501'; end if;
  if input_tokens is null or output_tokens is null or input_tokens<0 or input_tokens>1000000 or output_tokens<0 or output_tokens>1600 then raise exception 'Invalid usage' using errcode='22023'; end if;
  expected=ceil((input_tokens::numeric*r.input_rate+output_tokens::numeric*r.output_rate)/1000000)::bigint;
  if actual_micros is null or actual_micros<>expected or expected>r.reserved_micros then raise exception 'Usage mismatch' using errcode='22023'; end if;
  if r.status='settled' then
    if r.actual_micros<>actual_micros or r.input_tokens<>input_tokens or r.output_tokens<>output_tokens then raise exception 'Settlement differs' using errcode='40001'; end if;
    return jsonb_build_object('settled',true);
  end if;
  update public.zuri_ai_account_usage set held_micros=held_micros-r.reserved_micros,spent_micros=spent_micros+actual_micros where user_id=actor and month=r.month;
  update public.zuri_ai_daily_usage set held_micros=held_micros-r.reserved_micros,spent_micros=spent_micros+actual_micros where day=r.day;
  update public.zuri_ai_requests q set status='settled',actual_micros=zuri_ai_settle.actual_micros,input_tokens=zuri_ai_settle.input_tokens,output_tokens=zuri_ai_settle.output_tokens,settled_at=now() where q.user_id=actor and q.request_id=zuri_ai_settle.request_id;
  return jsonb_build_object('settled',true);
end $$;
revoke all on function public.zuri_ai_status(uuid),public.zuri_ai_reserve(uuid,uuid,text,text,text,bigint,bigint,bigint),public.zuri_ai_settle(uuid,uuid,integer,integer,bigint) from public,anon,authenticated;
grant execute on function public.zuri_ai_status(uuid),public.zuri_ai_reserve(uuid,uuid,text,text,text,bigint,bigint,bigint),public.zuri_ai_settle(uuid,uuid,integer,integer,bigint) to service_role;
commit;
