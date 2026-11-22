-- Public Rizz channels are published when their owner creates them.
begin;

do $$
declare c record;
begin
 for c in
  select conname
  from pg_constraint
  where conrelid='public.zuri_entities'::regclass
   and contype='c'
   and pg_get_constraintdef(oid) like '%reviewed_by%'
 loop
  execute format('alter table public.zuri_entities drop constraint %I',c.conname);
 end loop;
end $$;

alter table public.zuri_entities
 add constraint zuri_entities_publication_policy check(
  status<>'published'
  or length(trim(consent_reference))>=10
   and (
    kind='channel' and visibility='public' and reviewed_by is null and reviewed_at is null
    or reviewed_by is not null and reviewed_at is not null
   )
 );

create function zuri_internal.publish_public_channels() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.kind='channel' and new.visibility='public' then
  new.status:='published';
  new.reviewed_by:=null;
  new.reviewed_at:=null;
 end if;
 return new;
end $$;

create trigger zuri_public_channel_publish
 before insert on public.zuri_entities
 for each row execute function zuri_internal.publish_public_channels();

update public.zuri_entities
 set status='published',reviewed_by=null,reviewed_at=null,updated_at=now()
 where kind='channel' and visibility='public' and status in ('draft','pending')
  and length(trim(consent_reference))>=10;

commit;
