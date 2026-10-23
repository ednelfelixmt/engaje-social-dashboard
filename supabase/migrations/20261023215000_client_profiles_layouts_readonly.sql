-- Cliente visualiza, agência administra. Alteração de autorização, sem mudança de registros.
-- Conferir fluxos de perfil e personalização antes de aplicar no banco de produção.
begin;
drop policy if exists profile_insert on public.profiles;
drop policy if exists profile_update on public.profiles;
create policy profile_insert on public.profiles for insert to authenticated
 with check ((select private.is_super_admin()));
create policy profile_update on public.profiles for update to authenticated
 using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
drop policy if exists own_layout_insert on public.user_dashboard_layouts;
drop policy if exists own_layout_update on public.user_dashboard_layouts;
drop policy if exists own_layout_delete on public.user_dashboard_layouts;
create policy own_layout_insert on public.user_dashboard_layouts for insert to authenticated
 with check ((select private.is_super_admin()));
create policy own_layout_update on public.user_dashboard_layouts for update to authenticated
 using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy own_layout_delete on public.user_dashboard_layouts for delete to authenticated
 using ((select private.is_super_admin()));
commit;
