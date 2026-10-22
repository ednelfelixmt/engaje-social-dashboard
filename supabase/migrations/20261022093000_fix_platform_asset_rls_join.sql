-- Fase 00 security audit: correct asset authorization join.
-- Previous policy compared a.asset_id = a.id (two columns of assignment),
-- not the requested platform_assets.id. The clause was ineffective and
-- would behave incorrectly if an accidental UUID collision occurred.
-- Keep the existing connection-based branch intact.
drop policy if exists asset_read on public.platform_assets;
create policy asset_read on public.platform_assets for select to authenticated
using (
  exists (
    select 1 from public.platform_connections c
    where c.id = platform_assets.connection_id
    and (private.is_super_admin() or private.user_belongs_to_org(c.target_organization_id))
  )
  or exists (
    select 1 from public.client_asset_assignments a
    where a.asset_id = platform_assets.id
      and a.assignment_status = 'assigned'
      and private.user_belongs_to_org(a.organization_id)
  )
);
