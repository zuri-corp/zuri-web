-- Requires 008 and 006. Exact owner email/caps were supplied by the owner.
-- Does not create Auth users, send email, or mark an unverified email verified.
begin;
create table public.zuri_account_bootstrap(
 email text primary key check(email=lower(email)),monthly_ai_micros bigint not null check(monthly_ai_micros between 0 and 1000000000),
 administrator boolean not null default false,enabled boolean not null default true,
 claimed_by uuid unique references auth.users(id),approved_reference text not null
);
alter table public.zuri_account_bootstrap enable row level security;
revoke all on public.zuri_account_bootstrap from public,anon,authenticated;
grant all on public.zuri_account_bootstrap to service_role;
insert into public.zuri_account_bootstrap(email,monthly_ai_micros,administrator,approved_reference)
 values('zuri.incorp@gmail.com',3000000,false,'Owner selected the ZURI pilot account and USD 3 monthly / USD 5 fleet daily caps; 29 October 2026');
create function zuri_internal.bootstrap_account() returns trigger language plpgsql security definer set search_path='' as $$
declare grant_row public.zuri_account_bootstrap;
begin
 if tg_op='UPDATE' and (old.email is distinct from new.email or new.deleted_at is not null or (new.banned_until is not null and new.banned_until>now())) then
  if exists(select 1 from public.zuri_account_bootstrap where claimed_by=new.id) then
   update public.zuri_ai_accounts set enabled=false where user_id=new.id;
   delete from public.admin_users where user_id=new.id;
  end if;
 end if;
 if new.email_confirmed_at is null or new.deleted_at is not null or (new.banned_until is not null and new.banned_until>now()) then return new;end if;
 insert into public.zuri_profiles(user_id,display_name) values(new.id,'ZURI member') on conflict do nothing;
 select * into grant_row from public.zuri_account_bootstrap where email=lower(new.email) and enabled for update;
 if grant_row.email is not null and (grant_row.claimed_by is null or grant_row.claimed_by=new.id) then
  update public.zuri_account_bootstrap set claimed_by=new.id where email=grant_row.email;
  if grant_row.administrator then insert into public.admin_users(user_id) values(new.id) on conflict do nothing;end if;
  insert into public.zuri_ai_accounts(user_id,enabled,monthly_limit_micros) values(new.id,true,grant_row.monthly_ai_micros)
   on conflict(user_id) do update set enabled=true,monthly_limit_micros=excluded.monthly_limit_micros;
  update public.zuri_ai_policy set enabled=true where id and daily_limit_micros>0;
 end if;return new;
end $$;
revoke all on function zuri_internal.bootstrap_account() from public,anon,authenticated;
create trigger zuri_verified_account after insert or update of email,email_confirmed_at,deleted_at,banned_until on auth.users for each row execute function zuri_internal.bootstrap_account();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('pamoja-intake','pamoja-intake',false,2097152,array['image/jpeg','image/png','image/webp']),
 ('zuri-private','zuri-private',false,10485760,array['image/jpeg','image/png','image/webp','video/mp4','application/pdf']),
 ('zuri-editorial','zuri-editorial',false,10485760,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id in ('pamoja-intake','zuri-private','zuri-editorial') and public) then raise exception 'ZURI storage must be private; inspect existing bucket before proceeding';end if;
end $$;
-- Uploads/deletions are server-only after quota reservation and signature checks.
create policy zuri_private_own_read on storage.objects for select to authenticated
 using(bucket_id='zuri-private' and zuri_internal.active_user(auth.uid()) and exists(select 1 from public.zuri_media m where m.path=name and m.owner_id=auth.uid() and m.state='ready'));

create function public.zuri_backend_health() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('database',true,'schema','zuri-backend-009','privateByDefault',true,'payments',false,'aiExecution',false);
$$;
revoke all on function public.zuri_backend_health() from public;
grant execute on function public.zuri_backend_health() to anon,authenticated,service_role;

-- Cleanup is an explicit operator job; no private user records are auto-expired.
create function public.zuri_backend_maintenance() returns jsonb language plpgsql security definer set search_path='' as $$
declare removed integer;begin
 delete from public.zuri_backend_limits where window_start<now()-interval '2 days';get diagnostics removed=row_count;
 return jsonb_build_object('oldRateWindowsRemoved',removed);
end $$;
revoke all on function public.zuri_backend_maintenance() from public,anon,authenticated;
grant execute on function public.zuri_backend_maintenance() to service_role;

do $$ declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['zuri_chat_messages','zuri_notifications'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
  end loop;
 end if;
end $$;
commit;
