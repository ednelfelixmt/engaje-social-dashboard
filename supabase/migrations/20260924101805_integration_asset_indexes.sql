begin;
create index client_asset_assignments_assigned_by on public.client_asset_assignments(assigned_by);
create index client_asset_assignments_integration on public.client_asset_assignments(organization_id,integration_id);
create index platform_connections_target_org on public.platform_connections(target_organization_id);
create index platform_assets_platform_org on public.platform_assets(platform_organization_id);
create index sync_jobs_org on public.sync_jobs(organization_id);
create index sync_jobs_connection on public.sync_jobs(connection_id);
create index sync_jobs_assignment on public.sync_jobs(assignment_id);
commit;
