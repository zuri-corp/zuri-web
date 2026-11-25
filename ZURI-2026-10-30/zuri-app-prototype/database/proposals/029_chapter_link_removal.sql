begin;

-- Removing a Chapter removes its association rows, not the linked entities
-- or posts. Without these cascades a linked Chapter cannot be deleted.
-- Refuse to guess if a deployment uses different or duplicate constraints.
do $$
declare
 table_name text;
 expected_name text;
 matching_count integer;
begin
 foreach table_name in array array['zuri_entity_chapters','zuri_post_chapters'] loop
  expected_name:=table_name||'_chapter_id_fkey';
  select count(*) into matching_count
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class t on t.oid=c.conrelid
  join pg_catalog.pg_namespace n on n.oid=t.relnamespace
  join pg_catalog.pg_attribute a on a.attrelid=t.oid and a.attnum=any(c.conkey)
  where n.nspname='public' and t.relname=table_name and c.contype='f'
   and c.confrelid='public.zuri_app_records'::regclass and a.attname='chapter_id';
  if matching_count<>1 or not exists(
   select 1 from pg_catalog.pg_constraint c
   where c.conrelid=to_regclass('public.'||table_name) and c.conname=expected_name and c.contype='f'
    and c.confrelid='public.zuri_app_records'::regclass
  ) then
   raise exception 'Unexpected Chapter reference on %; review before applying',table_name;
  end if;
 end loop;
end $$;

alter table public.zuri_entity_chapters
 drop constraint zuri_entity_chapters_chapter_id_fkey,
 add constraint zuri_entity_chapters_chapter_id_fkey
 foreign key (chapter_id) references public.zuri_app_records(id) on delete cascade;

alter table public.zuri_post_chapters
 drop constraint zuri_post_chapters_chapter_id_fkey,
 add constraint zuri_post_chapters_chapter_id_fkey
 foreign key (chapter_id) references public.zuri_app_records(id) on delete cascade;

notify pgrst,'reload schema';
commit;
