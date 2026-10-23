-- Phase 02: client memberships are dashboard readers, never configuration editors.
-- Run only after validating admin access and backup / rollback plans.
begin;
drop policy if exists config_insert on public.dashboard_configs;
drop policy if exists config_update on public.dashboard_configs;
drop policy if exists config_delete on public.dashboard_configs;
create policy config_insert on public.dashboard_configs for insert to authenticated
 with check ((select private.is_super_admin()));
create policy config_update on public.dashboard_configs for update to authenticated
 using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy config_delete on public.dashboard_configs for delete to authenticated
 using ((select private.is_super_admin()));
drop policy if exists config_insert on public.branding;
drop policy if exists config_update on public.branding;
drop policy if exists config_delete on public.branding;
create policy config_insert on public.branding for insert to authenticated
 with check ((select private.is_super_admin()));
create policy config_update on public.branding for update to authenticated
 using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy config_delete on public.branding for delete to authenticated
 using ((select private.is_super_admin()));
commit;
