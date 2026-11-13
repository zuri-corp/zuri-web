begin;

-- Gallery references are metadata. Storage objects remain private and are signed
-- only after the same offering/Space access check as the existing cover photo.
create function zuri_internal.validate_offering_gallery() returns trigger
language plpgsql security definer set search_path='' as $$
declare item jsonb; gallery jsonb:=coalesce(new.details->'gallery','[]'::jsonb);
begin
 if jsonb_typeof(gallery)<>'array' then raise exception 'Invalid offering gallery' using errcode='22023';end if;
 if jsonb_array_length(gallery)>5 then raise exception 'Use up to five gallery items' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(gallery) loop
  if coalesce(item->>'id','') !~ '^[a-fA-F0-9-]{36}$' or not exists(
   select 1 from public.zuri_media m where m.id=(item->>'id')::uuid and m.owner_id=new.owner_id
   and m.state='ready' and m.mime=item->>'mime' and m.mime in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')
  ) then raise exception 'Gallery item unavailable' using errcode='42501';end if;
 end loop;
 return new;
end $$;
revoke all on function zuri_internal.validate_offering_gallery() from public,anon,authenticated;
create trigger zuri_validate_offering_gallery before insert or update of details on public.zuri_offerings for each row execute function zuri_internal.validate_offering_gallery();

alter function public.zuri_context_media(uuid,uuid,text) rename to zuri_context_media_v18;
create function public.zuri_context_media(actor uuid,target uuid,kind text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if kind='offering-photo' and zuri_internal.active_user(actor) and not exists(select 1 from public.zuri_offerings where id=target) then
  select to_jsonb(m) into result from public.zuri_media m where m.id=target and m.state='ready' and exists(
   select 1 from public.zuri_offerings o where o.owner_id=m.owner_id
    and (o.published or o.owner_id=actor) and zuri_internal.object_access(actor,o.entity_id,false)
    and coalesce(o.details->'gallery','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',target::text,'mime',m.mime))
  );
  if result is not null then return result;end if;
 end if;
 return public.zuri_context_media_v18(actor,target,kind);
end $$;
revoke all on function public.zuri_context_media(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.zuri_context_media(uuid,uuid,text) to service_role;
commit;
