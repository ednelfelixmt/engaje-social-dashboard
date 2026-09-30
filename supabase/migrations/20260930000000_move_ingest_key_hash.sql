-- O hash da chave de ingestão não pode ficar em integrations.config, coluna legível
-- por todos os usuários do cliente. Passa para tabela acessível só via service_role.
begin;
create table if not exists public.integration_ingest_keys (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  rotated_at timestamptz not null default now()
);
alter table public.integration_ingest_keys enable row level security;
revoke all on public.integration_ingest_keys from anon, authenticated;
grant all on public.integration_ingest_keys to service_role;

insert into public.integration_ingest_keys(integration_id, organization_id, key_hash, rotated_at)
select id, organization_id, config->>'ingest_key_hash', coalesce((config->>'ingest_key_rotated_at')::timestamptz, now())
from public.integrations
where config ? 'ingest_key_hash' and config->>'ingest_key_hash' ~ '^[0-9a-f]{64}$'
on conflict (integration_id) do nothing;

update public.integrations
set config = (config - 'ingest_key_hash') || '{"ingest_configured": true}'::jsonb
where config ? 'ingest_key_hash';
commit;
