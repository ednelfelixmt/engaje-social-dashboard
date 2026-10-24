-- Fix an actual privilege escalation path: client_admin/editor can invoke privileged CSV import.
-- No client records touched; preserve function body except its authorization predicate.
begin;
do $guard$
declare old_definition text; new_definition text;
begin
 select pg_get_functiondef(p.oid) into old_definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname='import_spreadsheet'
 and pg_get_function_identity_arguments(p.oid)='p_organization_id uuid, p_file_path text, p_file_name text, p_sha256 text, p_rows jsonb';
 if old_definition is null then raise exception 'Missing private.import_spreadsheet; migration aborted'; end if;
 new_definition:=replace(old_definition,
 'not private.has_org_role(p_organization_id,array[''client_admin'',''editor'']::public.member_role[])',
 'not private.is_super_admin()');
 if old_definition=new_definition then raise exception 'Authorization predicate differs; migration aborted'; end if;
 execute new_definition;
end $guard$;
drop policy if exists engaje_storage_insert on storage.objects;
create policy engaje_storage_insert on storage.objects
 for insert to authenticated with check
 ((bucket_id = any(array['branding'::text,'spreadsheets'::text]))
 and (select private.is_super_admin()));
drop policy if exists engaje_storage_delete on storage.objects;
create policy engaje_storage_delete on storage.objects
 for delete to authenticated using
 ((bucket_id = any(array['branding'::text,'spreadsheets'::text]))
 and (select private.is_super_admin()));
commit;
