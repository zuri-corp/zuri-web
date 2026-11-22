-- ADDITIVE STAGING MIGRATION, NOT APPLIED. Requires proposals 001/002 and the
-- existing auth.users/admin_users schema. No new identity or Space directory.
-- Browser roles have no table writes. Authenticated server RPCs enforce roles,
-- versioned consent and manager grants. Never expose service_role to a client.
begin;
create table public.zuri_developers(id uuid primary key default gen_random_uuid(),name text not null,kind text not null check(kind in ('individual','organization')),verified boolean not null default false,created_at timestamptz not null default now());
create table public.zuri_developer_members(developer_id uuid references public.zuri_developers(id),user_id uuid references auth.users(id),role text not null check(role in ('owner','developer','viewer')),primary key(developer_id,user_id));
create table public.zuri_tools(id uuid primary key default gen_random_uuid(),developer_id uuid not null references public.zuri_developers(id),slug text not null unique,name text not null,suspended boolean not null default false,published_version_id uuid,created_at timestamptz not null default now());
create table public.zuri_tool_versions(id uuid primary key default gen_random_uuid(),tool_id uuid not null references public.zuri_tools(id),manifest jsonb not null,status text not null default 'draft' check(status in ('draft','submitted','approved','rejected')),review_reference text,reviewed_by uuid references auth.users(id),created_at timestamptz not null default now());
-- PostgreSQL expression uniqueness uses a separate index.
create unique index zuri_tool_version_number on public.zuri_tool_versions(tool_id,(manifest->>'version'));
alter table public.zuri_tools add foreign key(published_version_id) references public.zuri_tool_versions(id);
create table public.zuri_tool_keys(id uuid primary key default gen_random_uuid(),tool_id uuid not null references public.zuri_tools(id),key_hash text not null unique check(key_hash ~ '^[a-f0-9]{64}$'),revoked_at timestamptz,created_at timestamptz not null default now());
create table public.zuri_tool_installations(id uuid primary key default gen_random_uuid(),tool_id uuid not null references public.zuri_tools(id),version_id uuid not null references public.zuri_tool_versions(id),space_id uuid not null references public.zuri_website_content(id),installed_by uuid not null references auth.users(id),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),permissions jsonb not null,consented_at timestamptz not null default now(),revoked_at timestamptz);
create unique index zuri_active_install on public.zuri_tool_installations(tool_id,space_id) where revoked_at is null;
create table public.zuri_tool_bookings(id uuid primary key default gen_random_uuid(),installation_id uuid not null references public.zuri_tool_installations(id),space_id uuid not null references public.zuri_website_content(id),customer_id uuid not null references auth.users(id),name text not null,note text not null default '',starts_at timestamptz not null,ends_at timestamptz not null,status text not null default 'requested' check(status in ('requested','confirmed','cancelled')),created_at timestamptz not null default now(),check(ends_at>starts_at));
create index zuri_booking_space_time on public.zuri_tool_bookings(space_id,starts_at,ends_at) where status<>'cancelled';
create table public.zuri_studio_audit(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),developer_id uuid references public.zuri_developers(id),action text not null,subject_id uuid,reference text not null,created_at timestamptz not null default now());
create table public.zuri_tool_usage(id uuid primary key default gen_random_uuid(),installation_id uuid not null references public.zuri_tool_installations(id),operation text not null,created_at timestamptz not null default now());
-- Pilot caps are cumulative metering limits, not a bank balance or paid credits.
create table public.zuri_developer_budgets(developer_id uuid primary key references public.zuri_developers(id),limit_micros bigint not null default 0 check(limit_micros>=0),spent_micros bigint not null default 0 check(spent_micros>=0),check(spent_micros<=limit_micros));
-- Commercial foundations only. No processor, collection or payout is connected.
create table public.zuri_tool_commercial_terms(tool_id uuid primary key references public.zuri_tools(id),currency text not null default 'USD' check(currency='USD'),price_micros bigint check(price_micros>=0),commission_bps integer check(commission_bps between 0 and 10000),approved_by uuid references auth.users(id),reference text);
create table public.zuri_tool_transactions(id uuid primary key default gen_random_uuid(),installation_id uuid not null references public.zuri_tool_installations(id),provider_event_id text not null unique,currency text not null check(currency='USD'),gross_micros bigint not null check(gross_micros>=0),commission_micros bigint not null check(commission_micros>=0),developer_micros bigint not null check(developer_micros>=0),status text not null check(status in ('pending','settled','refunded')),created_at timestamptz not null default now(),check(gross_micros=commission_micros+developer_micros));
create table public.zuri_tool_requests(id uuid primary key default gen_random_uuid(),installation_id uuid not null references public.zuri_tool_installations(id),request_id uuid not null,operation text not null,input jsonb not null,credential_id uuid references public.zuri_tool_keys(id),result jsonb,state text not null default 'reserved' check(state in ('reserved','settled','uncertain')),reserved_micros bigint not null default 0,actual_micros bigint,input_tokens integer,output_tokens integer,created_at timestamptz not null default now(),unique(installation_id,request_id));

create function public.zuri_studio_member(a uuid,d uuid,roles text[]) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.zuri_developer_members m where m.user_id=a and m.developer_id=d and m.role=any(roles)) $$;
create function public.zuri_studio_manager(a uuid,s uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.zuri_pamoja_managers m join public.zuri_website_content c on c.id=m.content_id join auth.users u on u.id=m.user_id where u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now()) and m.user_id=a and m.content_id=s and m.revoked_at is null and c.kind='space' and c.status='published' and c.consent_verified) $$;

create function public.zuri_tool_book(i public.zuri_tool_installations,a uuid,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare b public.zuri_tool_bookings%rowtype; st timestamptz:=(p->>'startsAt')::timestamptz; en timestamptz:=(p->>'endsAt')::timestamptz;
begin
 if char_length(trim(p->>'name')) not between 2 and 80 or coalesce(char_length(p->>'note'),0)>500 or st<=now() or st>now()+interval '366 days' or en<=st or en-st>interval '24 hours' then raise exception 'Invalid appointment' using errcode='22023';end if;
 -- Lock the canonical Space, not merely one installation, to prevent double booking.
 perform 1 from public.zuri_website_content c where c.id=i.space_id for update;
 if not public.zuri_studio_manager(i.installed_by,i.space_id) then raise exception 'Installation authority revoked' using errcode='42501';end if;
 if exists(select 1 from public.zuri_tool_bookings x where x.space_id=i.space_id and x.status<>'cancelled' and x.starts_at<en and x.ends_at>st) then raise exception 'Appointment overlaps an existing request' using errcode='23505';end if;
 if (select count(*) from public.zuri_tool_bookings x where x.customer_id=a and x.created_at>now()-interval '1 day')>=20 then raise exception 'Daily booking request limit reached' using errcode='P0001';end if;
 insert into public.zuri_tool_bookings(installation_id,space_id,customer_id,name,note,starts_at,ends_at) values(i.id,i.space_id,a,trim(p->>'name'),coalesce(p->>'note',''),st,en) returning * into b;
 return to_jsonb(b)||jsonb_build_object('startsAt',b.starts_at,'endsAt',b.ends_at);
end $$;

-- Called only by the authenticated server SDK endpoint. Raw credentials never
-- enter PostgreSQL: the server supplies SHA-256 hashes of two random secrets.
create function public.zuri_tool_runtime(key_hash text,install_hash text,operation text,input jsonb,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare kh text:=key_hash;ih text:=install_hash;op text:=operation;p jsonb:=input;rid uuid:=request_id;k public.zuri_tool_keys%rowtype;i public.zuri_tool_installations%rowtype;t public.zuri_tools%rowtype;v public.zuri_tool_versions%rowtype;r public.zuri_tool_requests%rowtype;b public.zuri_tool_bookings%rowtype;budget public.zuri_developer_budgets%rowtype;out jsonb;space_data jsonb;reserved bigint;
begin
 select * into k from public.zuri_tool_keys x where x.key_hash=kh and x.revoked_at is null for update;
 if k.id is null then raise exception 'Invalid Tool credential' using errcode='42501';end if;
 select * into t from public.zuri_tools x where x.id=k.tool_id for update;
 select * into i from public.zuri_tool_installations x where x.token_hash=ih and x.tool_id=t.id for update;
 select * into v from public.zuri_tool_versions x where x.id=i.version_id and x.tool_id=t.id;
 if i.id is null or i.revoked_at is not null or t.suspended or v.status<>'approved' or not public.zuri_studio_manager(i.installed_by,i.space_id) or not exists(select 1 from public.zuri_developers d where d.id=t.developer_id and d.verified) then raise exception 'Installation unavailable' using errcode='42501';end if;
 if op not in ('space.read','bookings.read','bookings.create','bookings.manage','ai.space-answer') or not i.permissions @> jsonb_build_array(jsonb_build_object('capability',op)) then raise exception 'Capability not granted' using errcode='42501';end if;
 select * into r from public.zuri_tool_requests x where x.installation_id=i.id and x.request_id=rid;
 if r.id is not null then
  if r.operation<>op or r.input is distinct from p then raise exception 'Idempotency key reused for different input' using errcode='22023';end if;
  if r.state='settled' then return jsonb_build_object('cached',true,'result',r.result);end if;
  raise exception 'Request already reserved or awaiting reconciliation' using errcode='40001';
 end if;
 if (select count(*) from public.zuri_tool_requests x where x.installation_id=i.id and x.created_at>now()-interval '1 minute')>=30 then raise exception 'Rate limit reached' using errcode='P0001';end if;
 perform 1 from public.zuri_website_content c where c.id=i.space_id for update;
 if not public.zuri_studio_manager(i.installed_by,i.space_id) then raise exception 'Installation authority revoked' using errcode='42501';end if;
 select c.published_data into space_data from public.zuri_website_content c where c.id=i.space_id and c.kind='space' and c.status='published' and c.consent_verified;
 -- Only explicitly public, approved business fields, never the editorial draft.
 space_data:=jsonb_build_object('name',space_data->'name','description',space_data->'description','offerings',space_data->'offerings','location',space_data->'location','links',space_data->'links');
 if op='ai.space-answer' then
  reserved:=(p->>'reservedMicros')::bigint;
  if reserved is null or reserved<=0 or char_length(p->>'question') not between 3 and 600 then raise exception 'AI reservation unavailable' using errcode='22023';end if;
  select * into budget from public.zuri_developer_budgets x where x.developer_id=t.developer_id for update;
  if budget.developer_id is null or budget.spent_micros+reserved>budget.limit_micros then raise exception 'Developer AI cap exhausted' using errcode='P0001';end if;
  update public.zuri_developer_budgets set spent_micros=spent_micros+reserved where developer_id=t.developer_id;
  insert into public.zuri_tool_requests(installation_id,request_id,operation,input,credential_id,reserved_micros) values(i.id,rid,op,p,k.id,reserved) returning * into r;
  return jsonb_build_object('reservationId',r.id,'context',space_data,'developerId',t.developer_id);
 end if;
 if op='space.read' then out:=space_data;
 elsif op='bookings.read' then select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('startsAt',x.starts_at,'endsAt',x.ends_at)),'[]') into out from (select * from public.zuri_tool_bookings x where x.installation_id=i.id order by starts_at desc limit 100) x;
 elsif op='bookings.create' then out:=public.zuri_tool_book(i,i.installed_by,p);
 else
  if p->>'status' not in ('confirmed','cancelled') then raise exception 'Invalid status' using errcode='22023';end if;
  update public.zuri_tool_bookings set status=p->>'status' where id=(p->>'id')::uuid and installation_id=i.id and status='requested' returning * into b;
  if b.id is null then raise exception 'Request unavailable or changed' using errcode='40001';end if;out:=to_jsonb(b);
 end if;
 insert into public.zuri_tool_requests(installation_id,request_id,operation,input,state,result) values(i.id,rid,op,p,'settled',out);
 insert into public.zuri_tool_usage(installation_id,operation) values(i.id,op);
 return jsonb_build_object('result',out);
end $$;

create function public.zuri_tool_ai_settle(reservation_id uuid,result jsonb,actual_micros bigint,input_tokens integer,output_tokens integer) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare r public.zuri_tool_requests%rowtype;i public.zuri_tool_installations%rowtype;t public.zuri_tools%rowtype;actual bigint:=actual_micros;
begin
 select x.* into t from public.zuri_tools x join public.zuri_tool_installations ins on ins.tool_id=x.id join public.zuri_tool_requests req on req.installation_id=ins.id where req.id=reservation_id for update of x;
 select x.* into i from public.zuri_tool_installations x join public.zuri_tool_requests req on req.installation_id=x.id where req.id=reservation_id for update of x;
 select * into r from public.zuri_tool_requests where id=reservation_id for update;
 if r.id is null or r.state<>'reserved' or actual is null or actual<0 or actual>r.reserved_micros or input_tokens is null or input_tokens<0 or output_tokens is null or output_tokens<0 then raise exception 'Reconciliation required' using errcode='22023';end if;
 if i.revoked_at is not null or t.suspended or not exists(select 1 from public.zuri_tool_keys where id=r.credential_id and revoked_at is null) or not public.zuri_studio_manager(i.installed_by,i.space_id) then
  update public.zuri_tool_requests set state='uncertain' where id=r.id;return jsonb_build_object('withheld',true);
 end if;
 update public.zuri_developer_budgets set spent_micros=spent_micros-r.reserved_micros+actual where developer_id=t.developer_id;
 update public.zuri_tool_requests set state='settled',result=zuri_tool_ai_settle.result,actual_micros=actual,input_tokens=zuri_tool_ai_settle.input_tokens,output_tokens=zuri_tool_ai_settle.output_tokens where id=r.id;
 insert into public.zuri_tool_usage(installation_id,operation) values(i.id,'ai.space-answer');
 return jsonb_build_object('result',result);
end $$;

create function public.zuri_studio_manage(actor uuid,action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a uuid:=actor;op text:=action;p jsonb:=payload;adm boolean;d uuid;t public.zuri_tools%rowtype;v public.zuri_tool_versions%rowtype;i public.zuri_tool_installations%rowtype;b public.zuri_tool_bookings%rowtype;out jsonb;m jsonb;sid uuid;role_name text;used bigint;
begin
 if op='catalog' then
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'versionId',v.id,'manifest',v.manifest,'developer',d.name)),'[]') into out from public.zuri_tools t join public.zuri_tool_versions v on v.id=t.published_version_id and v.tool_id=t.id join public.zuri_developers d on d.id=t.developer_id where not t.suspended and d.verified and v.status='approved';return out;
 end if;
 if not exists(select 1 from auth.users u where u.id=a and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())) then raise exception 'Verified account required' using errcode='42501';end if;
 perform 1 from auth.users where id=a for update;
 adm:=exists(select 1 from public.admin_users x where x.user_id=a);
 if op='snapshot' then
  return jsonb_build_object('userId',a,'admin',adm,
   'developers',(select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('role',(select role from public.zuri_developer_members dm where dm.user_id=a and dm.developer_id=x.id))),'[]') from public.zuri_developers x where adm or public.zuri_studio_member(a,x.id,array['owner','developer','viewer'])),
   'members',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.zuri_developer_members x where public.zuri_studio_member(a,x.developer_id,array['owner'])),
   'tools',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.zuri_tools x where adm or public.zuri_studio_member(a,x.developer_id,array['owner','developer','viewer'])),
   'versions',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.zuri_tool_versions x join public.zuri_tools t on t.id=x.tool_id where adm or public.zuri_studio_member(a,t.developer_id,array['owner','developer','viewer'])),
   'installations',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'tool_id',x.tool_id,'version_id',x.version_id,'space_id',x.space_id,'permissions',x.permissions,'revoked',x.revoked_at is not null)),'[]') from public.zuri_tool_installations x join public.zuri_tools t on t.id=x.tool_id where adm or public.zuri_studio_manager(a,x.space_id) or public.zuri_studio_member(a,t.developer_id,array['owner','developer','viewer'])),
   'bookings',(select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('startsAt',x.starts_at,'endsAt',x.ends_at)),'[]') from public.zuri_tool_bookings x where x.customer_id=a or public.zuri_studio_manager(a,x.space_id)),
   'keys',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'tool_id',x.tool_id,'created_at',x.created_at,'revoked',x.revoked_at is not null)),'[]') from public.zuri_tool_keys x join public.zuri_tools t on t.id=x.tool_id where public.zuri_studio_member(a,t.developer_id,array['owner'])),
   'spaces',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.published_data->>'name')),'[]') from public.zuri_website_content x where public.zuri_studio_manager(a,x.id)),
   'audit',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select * from public.zuri_studio_audit x where adm or public.zuri_studio_member(a,x.developer_id,array['owner','developer','viewer']) order by created_at desc limit 100) x),
   'usage',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select u.* from public.zuri_tool_usage u join public.zuri_tool_installations i on i.id=u.installation_id join public.zuri_tools t on t.id=i.tool_id where adm or public.zuri_studio_member(a,t.developer_id,array['owner','developer','viewer']) or public.zuri_studio_manager(a,i.space_id) order by u.created_at desc limit 200) x),
   'budgets',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.zuri_developer_budgets x where adm or public.zuri_studio_member(a,x.developer_id,array['owner','developer','viewer']))
  );
 end if;
 if op='register' then
  if char_length(trim(p->>'name')) not between 2 and 80 or p->>'kind' not in ('individual','organization') then raise exception 'Invalid developer' using errcode='22023';end if;
  if exists(select 1 from public.zuri_developer_members where user_id=a and role='owner') then raise exception 'A developer identity already exists' using errcode='23505';end if;
  insert into public.zuri_developers(name,kind) values(trim(p->>'name'),p->>'kind') returning id into d;
  insert into public.zuri_developer_members values(d,a,'owner');insert into public.zuri_developer_budgets(developer_id) values(d);
 elsif op in ('verify','budget','team') then
  d:=(p->>'developerId')::uuid;perform 1 from public.zuri_developers x where x.id=d for update;if not found then raise exception 'Developer unavailable' using errcode='22023';end if;
  if op='team' then
   if not public.zuri_studio_member(a,d,array['owner']) then raise exception 'Owner role required' using errcode='42501';end if;
   sid:=(p->>'userId')::uuid;role_name:=p->>'role';
   if not exists(select 1 from auth.users u where u.id=sid and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())) then raise exception 'Verified team account required' using errcode='22023';end if;
   if role_name not in ('owner','developer','viewer','remove') then raise exception 'Invalid role' using errcode='22023';end if;
   if role_name<>'owner' and exists(select 1 from public.zuri_developer_members where developer_id=d and user_id=sid and role='owner') and (select count(*) from public.zuri_developer_members where developer_id=d and role='owner')<=1 then raise exception 'Keep at least one owner' using errcode='22023';end if;
   if role_name='remove' then delete from public.zuri_developer_members where developer_id=d and user_id=sid;else insert into public.zuri_developer_members values(d,sid,role_name) on conflict(developer_id,user_id) do update set role=excluded.role;end if;
  else
   if not adm or char_length(trim(p->>'reference')) not between 10 and 1000 then raise exception 'Admin review reference required' using errcode='42501';end if;
   if op='verify' then
    if public.zuri_studio_member(a,d,array['owner','developer','viewer']) then raise exception 'Independent reviewer required' using errcode='42501';end if;
    update public.zuri_developers set verified=true where id=d;
   else
    if (p->>'limitMicros')::bigint not between 0 and 1000000000 then raise exception 'Invalid budget' using errcode='22023';end if;
    select spent_micros into used from public.zuri_developer_budgets where developer_id=d for update;
    if (p->>'limitMicros')::bigint<used then raise exception 'Cap cannot be lower than reserved or metered use' using errcode='22023';end if;
    update public.zuri_developer_budgets set limit_micros=(p->>'limitMicros')::bigint where developer_id=d;
   end if;
  end if;
 elsif op in ('create','version') then
  m:=p->'manifest';
  if jsonb_typeof(m)<>'object' or m->>'model'<>'connected' or m->'contexts'<>'["space"]'::jsonb or jsonb_typeof(m->'permissions')<>'array' or jsonb_array_length(m->'permissions') not between 1 and 5 or m->>'version'!~'^\d{1,4}\.\d{1,4}\.\d{1,4}$' or m->>'slug'!~'^[a-z][a-z0-9]*(-[a-z0-9]+)*$' then raise exception 'Invalid manifest' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(m->'permissions') x where x->>'capability' not in ('space.read','bookings.create','bookings.read','bookings.manage','ai.space-answer') or char_length(trim(x->>'purpose')) not between 15 and 300) then raise exception 'Invalid permission declaration' using errcode='22023';end if;
  if op='create' then
   d:=(p->>'developerId')::uuid;if not public.zuri_studio_member(a,d,array['owner','developer']) then raise exception 'Developer registration required' using errcode='42501';end if;
   insert into public.zuri_tools(developer_id,slug,name) values(d,m->>'slug',m->>'name') returning * into t;
  else
   select * into t from public.zuri_tools where id=(p->>'toolId')::uuid for update;d:=t.developer_id;
   if not public.zuri_studio_member(a,d,array['owner','developer']) then raise exception 'Developer access required' using errcode='42501';end if;
   if m->>'slug'<>t.slug then raise exception 'Keep the Tool address' using errcode='22023';end if;
  end if;
  insert into public.zuri_tool_versions(tool_id,manifest) values(t.id,m) returning id into sid;
 elsif op in ('submit','approve','reject','publish') then
  select x.* into t from public.zuri_tools x join public.zuri_tool_versions v on v.tool_id=x.id where v.id=(p->>'versionId')::uuid for update of x;
  select * into v from public.zuri_tool_versions where id=(p->>'versionId')::uuid and tool_id=t.id for update;d:=t.developer_id;
  if v.id is null then raise exception 'Version unavailable' using errcode='22023';end if;
  if op in ('approve','reject') then
   if not adm or public.zuri_studio_member(a,d,array['owner','developer','viewer']) or v.status<>'submitted' or char_length(trim(p->>'reference')) not between 10 and 1000 then raise exception 'Independent admin review required' using errcode='42501';end if;
   if op='approve' and not exists(select 1 from public.zuri_developers where id=d and verified) then raise exception 'Verify developer first' using errcode='22023';end if;
   update public.zuri_tool_versions set status=case op when 'approve' then 'approved' else 'rejected' end,review_reference=p->>'reference',reviewed_by=a where id=v.id;
  else
   if not public.zuri_studio_member(a,d,array['owner','developer']) or t.suspended then raise exception 'Active developer access required' using errcode='42501';end if;
   if op='submit' then
    if v.status<>'draft' then raise exception 'Only drafts can be submitted' using errcode='22023';end if;update public.zuri_tool_versions set status='submitted' where id=v.id;
   else
    if v.status<>'approved' or not exists(select 1 from public.zuri_developers where id=d and verified) then raise exception 'Approval required' using errcode='42501';end if;
    update public.zuri_tools set published_version_id=v.id,name=v.manifest->>'name' where id=t.id;
   end if;
  end if;sid:=v.id;
 elsif op='suspend' then
  if not adm or char_length(trim(p->>'reference')) not between 10 and 1000 then raise exception 'Admin review required' using errcode='42501';end if;
  update public.zuri_tools set suspended=true where id=(p->>'toolId')::uuid returning developer_id,id into d,sid;
 elsif op='install' then
  select x.* into t from public.zuri_tools x join public.zuri_tool_versions v on v.tool_id=x.id where v.id=(p->>'versionId')::uuid for update of x;
  select * into v from public.zuri_tool_versions where id=(p->>'versionId')::uuid and tool_id=t.id;
  if t.id is null or t.suspended or t.published_version_id is distinct from v.id or v.status<>'approved' or p->'consent'<>'true'::jsonb or not public.zuri_studio_manager(a,(p->>'spaceId')::uuid) then raise exception 'Published version, manager authority and explicit consent required' using errcode='42501';end if;
  insert into public.zuri_tool_installations(tool_id,version_id,space_id,installed_by,token_hash,permissions) values(t.id,v.id,(p->>'spaceId')::uuid,a,p->>'tokenHash',v.manifest->'permissions') returning id into sid;d:=t.developer_id;
 elsif op='revoke' then
  select * into i from public.zuri_tool_installations where id=(p->>'installationId')::uuid for update;
  if not public.zuri_studio_manager(a,i.space_id) then raise exception 'Space manager required' using errcode='42501';end if;
  update public.zuri_tool_installations set revoked_at=now() where id=i.id;sid:=i.id;
 elsif op in ('issue-key','revoke-key') then
  if op='issue-key' then select * into t from public.zuri_tools where id=(p->>'toolId')::uuid for update;
  else select x.* into t from public.zuri_tools x join public.zuri_tool_keys k on k.tool_id=x.id where k.id=(p->>'keyId')::uuid for update of x;end if;
  d:=t.developer_id;if not public.zuri_studio_member(a,d,array['owner']) then raise exception 'Developer owner required' using errcode='42501';end if;
  if op='issue-key' then insert into public.zuri_tool_keys(tool_id,key_hash) values(t.id,p->>'keyHash') returning id into sid;else update public.zuri_tool_keys set revoked_at=now() where id=(p->>'keyId')::uuid returning id into sid;end if;
 elsif op in ('booking-create','booking-status') then
  if op='booking-create' then select * into i from public.zuri_tool_installations where id=(p->>'installationId')::uuid;
  else select x.* into i from public.zuri_tool_installations x join public.zuri_tool_bookings b on b.installation_id=x.id where b.id=(p->>'bookingId')::uuid;end if;
  select * into t from public.zuri_tools where id=i.tool_id for update;
  select * into i from public.zuri_tool_installations where id=i.id for update;
  perform 1 from public.zuri_website_content c where c.id=i.space_id for update;
  if i.id is null or i.revoked_at is not null or t.suspended or not public.zuri_studio_manager(i.installed_by,i.space_id) then raise exception 'Active installation required' using errcode='42501';end if;
  if op='booking-create' then
   if not i.permissions @> '[{"capability":"bookings.create"}]'::jsonb then raise exception 'Permission missing' using errcode='42501';end if;
   out:=public.zuri_tool_book(i,a,p);
  else
   if not public.zuri_studio_manager(a,i.space_id) or not i.permissions @> '[{"capability":"bookings.manage"}]'::jsonb or p->>'status' not in ('confirmed','cancelled') then raise exception 'Manager permission required' using errcode='42501';end if;
   update public.zuri_tool_bookings set status=p->>'status' where id=(p->>'bookingId')::uuid and status='requested' returning * into b;
   if b.id is null then raise exception 'Request already changed' using errcode='40001';end if;out:=to_jsonb(b);
  end if;
  insert into public.zuri_tool_usage(installation_id,operation) values(i.id,op);sid:=i.id;
 else raise exception 'Unknown action' using errcode='22023';end if;
 insert into public.zuri_studio_audit(actor_id,developer_id,action,subject_id,reference) values(a,d,op,sid,coalesce(p->>'reference','Explicit Studio operation'));
 return coalesce(out,jsonb_build_object('saved',true,'id',sid));
end $$;

-- Deny table access even if default Supabase grants are permissive. All writes
-- use narrow RPCs after canonical auth.getUser checks on the trusted server.
do $$ declare name text;begin foreach name in array array['zuri_developers','zuri_developer_members','zuri_tools','zuri_tool_versions','zuri_tool_keys','zuri_tool_installations','zuri_tool_bookings','zuri_studio_audit','zuri_tool_usage','zuri_developer_budgets','zuri_tool_requests','zuri_tool_commercial_terms','zuri_tool_transactions'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from public,anon,authenticated',name);
 execute format('grant all on public.%I to service_role',name);
 end loop;end $$;
revoke all on function public.zuri_studio_member(uuid,uuid,text[]),public.zuri_studio_manager(uuid,uuid),public.zuri_tool_book(public.zuri_tool_installations,uuid,jsonb),public.zuri_studio_manage(uuid,text,jsonb),public.zuri_tool_runtime(text,text,text,jsonb,uuid),public.zuri_tool_ai_settle(uuid,jsonb,bigint,integer,integer) from public,anon,authenticated;
grant execute on function public.zuri_studio_manage(uuid,text,jsonb),public.zuri_tool_runtime(text,text,text,jsonb,uuid),public.zuri_tool_ai_settle(uuid,jsonb,bigint,integer,integer) to service_role;
commit;

