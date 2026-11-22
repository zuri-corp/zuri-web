-- Trusted database-operator operation, NOT a browser RPC or automatic signup rule.
-- Fill these three NULL values only after the owner chooses the account and caps.
-- One USD = 1,000,000 micro-USD. This provisions internal cost limits, not billing.
-- Requires 006_zuri_ai_gateway.sql. The unchanged template fails without writing.
begin;
do $zuri_pilot$
declare
  target_user_id uuid := null;
  monthly_limit_micros bigint := null;
  fleet_daily_limit_micros bigint := null;
begin
  if target_user_id is null or monthly_limit_micros is null or fleet_daily_limit_micros is null then
    raise exception 'Choose a verified account UUID and explicit monthly/daily cost caps first';
  end if;
  if monthly_limit_micros not between 1 and 1000000000 or fleet_daily_limit_micros not between 1 and 1000000000000 then
    raise exception 'Pilot cost caps are outside the gateway limits';
  end if;
  -- Follow the reservation lock order. Never reset spent or held usage.
  perform 1 from public.zuri_ai_policy where id for update;
  if not found then raise exception 'Apply gateway migration 006 before provisioning'; end if;
  if not exists(select 1 from auth.users where id=target_user_id and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now())) then
    raise exception 'A verified, active Supabase account is required';
  end if;
  insert into public.zuri_ai_accounts(user_id,enabled,monthly_limit_micros)
    values(target_user_id,true,monthly_limit_micros)
    on conflict(user_id) do update set enabled=true,monthly_limit_micros=excluded.monthly_limit_micros;
  -- No automatic free allowance for other/new accounts. Existing explicit account
  -- allowances are preserved; inspect them before enabling an existing gateway.
  update public.zuri_ai_policy set enabled=true,trial_monthly_micros=0,daily_limit_micros=fleet_daily_limit_micros where id;
  if (select (public.zuri_ai_status(target_user_id)->>'enabled')::boolean) is not true then
    raise exception 'Current held/spent usage leaves no allowance; review the caps without resetting usage';
  end if;
end $zuri_pilot$;
commit;
