begin;

-- Make the owner-only archive action available even where the event-management
-- proposal was not previously applied.  Archived objects disappear from every
-- browse and discovery surface while their audit trail remains intact.
do $$
declare definition text; marker text:=' elsif action=''records.list'' then';
begin
 select pg_get_functiondef('public.zuri_backend(text,jsonb)'::regprocedure) into definition;
 if position('''entities.delete''' in definition)>0 then return;end if;
 if position(marker in definition)=0 then raise exception 'Backend dispatcher changed';end if;
 execute replace(definition,marker,E' elsif action=''entities.delete'' then\n  return zuri_internal.entity_action(action,payload);\n'||marker);
end $$;

notify pgrst,'reload schema';
commit;
