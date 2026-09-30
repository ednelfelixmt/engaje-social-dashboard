-- Permite ao agendador importar histórico maior (30 a 400 dias), ex.: select private.run_scheduled_syncs(null, 180);
drop function if exists private.run_scheduled_syncs(uuid);

create or replace function private.run_scheduled_syncs(p_integration uuid default null, p_history_days integer default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_url text;
  v_count integer := 0;
  r record;
begin
  if p_history_days is not null and p_history_days not between 30 and 400 then raise exception 'p_history_days deve estar entre 30 e 400'; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'engaje_cron_secret';
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'engaje_functions_url';
  if v_secret is null or v_url is null then raise exception 'Segredos do agendador ausentes no Vault'; end if;
  for r in
    select i.id from public.integrations i join public.organizations o on o.id = i.organization_id
    where i.is_enabled and o.status = 'active'
      and i.provider in ('meta_ads', 'facebook_organic', 'instagram_organic', 'windsor')
      and (i.status in ('connected', 'error') or (i.status = 'syncing' and i.last_sync_started_at < now() - interval '30 minutes'))
      and (p_integration is null or i.id = p_integration)
  loop
    perform net.http_post(
      url := v_url || '/meta-auth',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('action', 'scheduled_sync', 'integrationId', r.id) || case when p_history_days is null then '{}'::jsonb else jsonb_build_object('historyDays', p_history_days) end,
      timeout_milliseconds := 140000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function private.run_scheduled_syncs(uuid, integer) from public, anon, authenticated;
