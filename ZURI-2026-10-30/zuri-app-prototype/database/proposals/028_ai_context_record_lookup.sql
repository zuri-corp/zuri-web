-- A selected private record is resolved by its owner, never by the model.
begin;

do $$
declare
 definition text;
 marker text:=' elsif action=''records.list'' then';
 lookup text:=E' elsif action=''records.get'' then\n'
  ||E'  select to_jsonb(r) into result from public.zuri_app_records r where r.id=(payload->>''id'')::uuid and r.owner_id=a;\n'
  ||E'  if result is null then raise exception ''Record unavailable'' using errcode=''42501''; end if;\n'
  ||E'  return result;\n';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position('''records.get''' in definition)>0 then return; end if;
 if position(marker in definition)=0 then raise exception 'Backend dispatcher changed; record lookup was not applied'; end if;
 execute replace(definition,marker,lookup||marker);
end $$;

notify pgrst,'reload schema';
commit;
