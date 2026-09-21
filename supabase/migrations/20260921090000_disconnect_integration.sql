create or replace function public.disconnect_integration(
  p_organization_id uuid,
  p_integration_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  integration_record public.integrations%rowtype;
  deleted_ads integer := 0;
  deleted_crm integer := 0;
  deleted_organic integer := 0;
  deleted_creatives integer := 0;
begin
  select * into integration_record
  from public.integrations
  where organization_id = p_organization_id and id = p_integration_id
  for update;

  if not found then
    raise exception 'Integração não encontrada neste cliente';
  end if;
  if integration_record.status = 'syncing' then
    raise exception 'A conta está sincronizando. Aguarde a conclusão antes de desconectar';
  end if;

  delete from public.metrics_organic where organization_id = p_organization_id and integration_id = p_integration_id;
  get diagnostics deleted_organic = row_count;
  delete from public.creatives where organization_id = p_organization_id and integration_id = p_integration_id;
  get diagnostics deleted_creatives = row_count;
  delete from public.metrics_ads where organization_id = p_organization_id and integration_id = p_integration_id;
  get diagnostics deleted_ads = row_count;
  delete from public.metrics_crm where organization_id = p_organization_id and integration_id = p_integration_id;
  get diagnostics deleted_crm = row_count;
  delete from public.integrations where organization_id = p_organization_id and id = p_integration_id;

  if integration_record.credential_secret_id is not null then
    delete from vault.secrets where id = integration_record.credential_secret_id;
  end if;

  return jsonb_build_object(
    'account_name', integration_record.account_name,
    'provider', integration_record.provider,
    'metrics_ads', deleted_ads,
    'metrics_crm', deleted_crm,
    'metrics_organic', deleted_organic,
    'creatives', deleted_creatives
  );
end;
$$;

revoke all on function public.disconnect_integration(uuid, uuid) from public, anon, authenticated;
grant execute on function public.disconnect_integration(uuid, uuid) to service_role;
