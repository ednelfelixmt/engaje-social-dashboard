-- Phase 02: prevent client roles modifying existing branding files.
begin;
drop policy if exists engaje_storage_update on storage.objects;
create policy engaje_storage_update on storage.objects
 for update to authenticated
 using (bucket_id = 'branding' and (select private.is_super_admin()))
 with check (bucket_id = 'branding' and (select private.is_super_admin()));
commit;
