begin;
do $$
begin
 update public.zuri_ai_policy
 set trial_monthly_micros=250000
 where id and enabled and daily_limit_micros=5000000;
 if not found then
  raise exception 'Expected the active ZURI policy with a $5 daily cap';
 end if;
end $$;
commit;
