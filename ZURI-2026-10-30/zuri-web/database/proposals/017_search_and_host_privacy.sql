begin;
create or replace function zuri_internal.search_match(haystack text,needle text) returns boolean language sql immutable set search_path='' as $$
 select needle ~ '[[:alnum:]]' and (strpos(lower(haystack),lower(trim(needle)))>0 or not exists(select 1 from regexp_split_to_table(lower(trim(needle)),'[^[:alnum:]_]+') token where token<>'' and not exists(select 1 from regexp_split_to_table(lower(haystack),'[^[:alnum:]_]+') word where left(word,length(token))=token)))
$$;
create or replace function zuri_internal.entity_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 result:=zuri_internal.entity_action_v14(action,payload);
 if action='entities.list' then select coalesce(jsonb_agg(item||jsonb_build_object('host_name',coalesce(pr.display_name,'Host'))),'[]') into result from jsonb_array_elements(result) item left join public.zuri_profiles pr on pr.user_id=(item->>'owner_id')::uuid and (pr.is_public or pr.user_id=auth.uid() or zuri_internal.object_access(auth.uid(),(item->>'id')::uuid,true));
 elsif action='entities.get' then result:=result||jsonb_build_object('host_name',(select coalesce(display_name,'Host') from public.zuri_profiles where user_id=(result->>'owner_id')::uuid and (is_public or user_id=auth.uid() or zuri_internal.object_access(auth.uid(),(result->>'id')::uuid,true))));end if;return result;
end $$;
notify pgrst,'reload schema';
commit;
