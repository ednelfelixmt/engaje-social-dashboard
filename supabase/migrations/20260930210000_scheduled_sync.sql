-- Sincronização automática das campanhas (Meta e Windsor), duas vezes ao dia.
-- Um pedido HTTP por integração para a função meta-auth (verify_jwt=false), autenticado por um
-- segredo guardado no Vault do banco. Nenhum secret de Edge Function é necessário.
create extension if not exists pg_net;

-- Segredo do agendador e URL das funções (ajuste a URL ao adaptar para outro projeto).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'engaje_cron_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'engaje_cron_secret', 'Segredo do agendador de sincronização Meta/Windsor');
  end if;
  if not exists (select 1 from vault.secrets where name = 'engaje_functions_url') then
    perform vault.create_secret('https://ityidnsfhgotucgvcifq.supabase.co/functions/v1', 'engaje_functions_url', 'URL base das Edge Functions');
  end if;
end $$;

-- Usada pela Edge Function para validar o segredo recebido no cabeçalho x-cron-secret.
create or replace function private.verify_cron_secret(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'engaje_cron_secret' and decrypted_secret = p_secret);
$$;
revoke all on function private.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function private.verify_cron_secret(text) to service_role;

create or replace function public.verify_cron_secret(p_secret text) returns boolean
language sql stable security invoker set search_path = '' as $$ select private.verify_cron_secret(p_secret); $$;
revoke all on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;

-- Dispara a sincronização das integrações elegíveis (ou só de uma, para testes).
create or replace function private.run_scheduled_syncs(p_integration uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_url text;
  v_count integer := 0;
  r record;
begin
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
      body := jsonb_build_object('action', 'scheduled_sync', 'integrationId', r.id),
      timeout_milliseconds := 140000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function private.run_scheduled_syncs(uuid) from public, anon, authenticated;

-- 09:00 e 21:00 UTC (06:00 e 18:00 em Brasília).
select cron.schedule('engaje-scheduled-sync', '0 9,21 * * *', 'select private.run_scheduled_syncs();');
