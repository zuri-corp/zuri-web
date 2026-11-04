-- Shared ZURI onboarding fields. Review and apply only after confirming the
-- deployed schema includes proposals 008-010.
begin;

alter table public.zuri_profiles
 add column location text not null default '' check(length(location)<=100),
 add column avatar_media_id uuid references public.zuri_media(id) on delete set null;

revoke select on public.zuri_profiles from anon,authenticated;
grant select(user_id,handle,display_name,bio,links,is_public,receive_invites,updated_at,location)
 on public.zuri_profiles to anon,authenticated;

create function zuri_internal.require_profile_public_consent() returns trigger
language plpgsql security definer set search_path='' as $$
declare latest_choice boolean;
begin
 if new.is_public and (tg_op='INSERT' or not old.is_public) then
  select accepted into latest_choice from public.zuri_consents
  where user_id=new.user_id and purpose='public-profile'
  order by created_at desc,id desc limit 1;
  if latest_choice is distinct from true then raise exception 'Choose public-profile consent first' using errcode='42501';end if;
 end if;
 if not new.is_public then new.receive_invites:=false;end if;
 return new;
end $$;
revoke all on function zuri_internal.require_profile_public_consent() from public,anon,authenticated;
create trigger zuri_profile_public_consent
 before insert or update on public.zuri_profiles
 for each row execute function zuri_internal.require_profile_public_consent();

create function public.zuri_profile_save(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 a uuid:=auth.uid();
 result jsonb;
 photo uuid;
 public_choice boolean;
 invite_choice boolean;
 link_values jsonb;
begin
 if not zuri_internal.active_user(a) then raise exception 'Verified active account required' using errcode='42501';end if;
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>16000 then raise exception 'Invalid profile' using errcode='22023';end if;
 if jsonb_typeof(payload->'display_name') is distinct from 'string'
  or length(trim(payload->>'display_name')) not between 1 and 80
  or jsonb_typeof(coalesce(payload->'bio','""'::jsonb)) is distinct from 'string'
  or length(coalesce(payload->>'bio',''))>600
  or jsonb_typeof(coalesce(payload->'location','""'::jsonb)) is distinct from 'string'
  or length(coalesce(payload->>'location',''))>100
  or jsonb_typeof(payload->'is_public') is distinct from 'boolean'
  or (payload ? 'receive_invites' and jsonb_typeof(payload->'receive_invites') is distinct from 'boolean')
 then raise exception 'Check your name, about, location and visibility choices' using errcode='22023';end if;
 link_values:=coalesce(payload->'links','[]'::jsonb);
 if not zuri_internal.safe_links(link_values) then raise exception 'Use public HTTPS links' using errcode='22023';end if;
 public_choice:=(payload->>'is_public')::boolean;
 invite_choice:=coalesce((payload->>'receive_invites')::boolean,false) and public_choice;
 if nullif(trim(coalesce(payload->>'avatar_media_id','')),'') is not null then
  photo:=(payload->>'avatar_media_id')::uuid;
  if not exists(select 1 from public.zuri_media where id=photo and owner_id=a and state='ready' and mime in ('image/jpeg','image/png','image/webp')) then
   raise exception 'Choose an uploaded profile image belonging to your account' using errcode='22023';
  end if;
 end if;
 insert into public.zuri_consents(user_id,purpose,version,accepted,created_at)
 values(a,'public-profile','profile-onboarding-v1',public_choice,clock_timestamp());
 insert into public.zuri_profiles(user_id,handle,display_name,bio,links,is_public,receive_invites,location,avatar_media_id)
 values(a,nullif(lower(trim(payload->>'handle')),''),trim(payload->>'display_name'),coalesce(payload->>'bio',''),link_values,public_choice,invite_choice,coalesce(payload->>'location',''),photo)
 on conflict(user_id) do update set
  handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,links=excluded.links,
  is_public=excluded.is_public,receive_invites=excluded.receive_invites,location=excluded.location,
  avatar_media_id=excluded.avatar_media_id,updated_at=now()
 returning to_jsonb(zuri_profiles.*) into result;
 return result;
end $$;
revoke all on function public.zuri_profile_save(jsonb) from public,anon;
grant execute on function public.zuri_profile_save(jsonb) to authenticated;

create or replace function public.zuri_discover(query text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]') from (
  select 'entity' kind,e.id,e.title name,e.description,e.kind entity_kind,null::text location,null::text handle,null::jsonb links
  from public.zuri_entities e
  where e.status='published' and e.visibility='public' and length(trim(query)) between 2 and 100
   and to_tsvector('english',e.title||' '||e.description) @@ websearch_to_tsquery('english',query)
  union all
  select 'person',p.user_id,p.display_name,p.bio,'person',nullif(p.location,''),p.handle,p.links
  from public.zuri_profiles p
  where p.is_public and length(trim(query)) between 2 and 100
   and to_tsvector('english',p.display_name||' '||p.bio||' '||p.location||' '||coalesce(p.handle,'')) @@ websearch_to_tsquery('english',query)
  limit 30
 ) x;
$$;

commit;
