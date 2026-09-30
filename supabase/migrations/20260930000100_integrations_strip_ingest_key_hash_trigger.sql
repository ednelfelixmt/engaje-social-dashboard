-- Rede de proteção: qualquer escrita (inclusive de versões antigas da Edge Function) que ponha
-- ingest_key_hash em integrations.config é redirecionada para a tabela privada.
-- BEFORE UPDATE: a linha já existe (FK satisfeita) e as alterações em NEW são aplicadas.
create or replace function private.move_ingest_key_hash() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.config ? 'ingest_key_hash' then
    if new.config->>'ingest_key_hash' ~ '^[0-9a-f]{64}$' then
      insert into public.integration_ingest_keys(integration_id, organization_id, key_hash, rotated_at)
      values (new.id, new.organization_id, new.config->>'ingest_key_hash', coalesce((new.config->>'ingest_key_rotated_at')::timestamptz, now()))
      on conflict (integration_id) do update set key_hash = excluded.key_hash, rotated_at = excluded.rotated_at;
    end if;
    new.config := (new.config - 'ingest_key_hash') || '{"ingest_configured": true}'::jsonb;
  end if;
  return new;
end $$;
revoke all on function private.move_ingest_key_hash() from public, anon, authenticated;
grant execute on function private.move_ingest_key_hash() to service_role;

drop trigger if exists integrations_move_ingest_key_hash on public.integrations;
create trigger integrations_move_ingest_key_hash
  before update of config on public.integrations
  for each row when (new.config ? 'ingest_key_hash')
  execute function private.move_ingest_key_hash();
