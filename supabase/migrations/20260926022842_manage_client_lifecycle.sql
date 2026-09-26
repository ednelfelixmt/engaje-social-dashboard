create or replace function private.disconnect_client_organization(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_name text;
  secret_ids uuid[];
  removed_integrations integer := 0;
  released_assets integer := 0;
begin
  if (select auth.uid()) is null or not (select private.is_super_admin()) then
    raise exception 'Somente um super administrador pode gerenciar o ciclo de vida de clientes';
  end if;

  select name into client_name
  from public.organizations
  where id = p_organization_id and not is_agency
  for update;

  if not found then
    raise exception 'Cliente não encontrado';
  end if;

  if exists (
    select 1 from public.integrations
    where organization_id = p_organization_id and status = 'syncing'
  ) or exists (
    select 1 from public.sync_jobs
    where organization_id = p_organization_id and status in ('queued','running')
  ) then
    raise exception 'Há uma sincronização em andamento. Aguarde a conclusão antes de desconectar o cliente';
  end if;

  select array_agg(credential_secret_id) filter (where credential_secret_id is not null)
  into secret_ids
  from public.integrations
  where organization_id = p_organization_id;

  update public.platform_assets as asset
  set asset_status = 'active', updated_at = now()
  where exists (
    select 1 from public.client_asset_assignments as assignment
    where assignment.organization_id = p_organization_id
      and assignment.asset_id = asset.id
      and assignment.assignment_status = 'assigned'
  );
  get diagnostics released_assets = row_count;

  delete from public.integration_alerts where organization_id = p_organization_id;
  delete from public.client_asset_assignments where organization_id = p_organization_id;
  delete from public.metrics_organic where organization_id = p_organization_id;
  delete from public.creatives where organization_id = p_organization_id;
  delete from public.metrics_ads where organization_id = p_organization_id;
  delete from public.ad_campaigns where organization_id = p_organization_id;
  delete from public.metrics_crm
  where organization_id = p_organization_id and integration_id is not null;

  delete from public.integrations where organization_id = p_organization_id;
  get diagnostics removed_integrations = row_count;

  update public.platform_connections
  set target_organization_id = null, updated_at = now()
  where target_organization_id = p_organization_id;

  if coalesce(array_length(secret_ids, 1), 0) > 0 then
    delete from vault.secrets where id = any(secret_ids);
  end if;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'name', client_name,
    'removed_integrations', removed_integrations,
    'released_assets', released_assets
  );
end;
$$;

create or replace function public.disconnect_client_organization(p_organization_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.disconnect_client_organization(p_organization_id);
$$;

create or replace function private.delete_client_organization(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null or not (select private.is_super_admin()) then
    raise exception 'Somente um super administrador pode excluir clientes';
  end if;

  result := private.disconnect_client_organization(p_organization_id);
  delete from public.organizations
  where id = p_organization_id and not is_agency;

  if not found then
    raise exception 'Cliente não encontrado';
  end if;

  return result || jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.delete_client_organization(p_organization_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.delete_client_organization(p_organization_id);
$$;

revoke all on function private.disconnect_client_organization(uuid), private.delete_client_organization(uuid) from public, anon, authenticated;
grant execute on function private.disconnect_client_organization(uuid), private.delete_client_organization(uuid) to authenticated;
revoke all on function public.disconnect_client_organization(uuid), public.delete_client_organization(uuid) from public, anon;
grant execute on function public.disconnect_client_organization(uuid), public.delete_client_organization(uuid) to authenticated;
