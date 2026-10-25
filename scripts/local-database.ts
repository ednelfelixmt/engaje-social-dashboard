import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

/** Banco PostgreSQL WASM descartável. Stubs reproduzem só o contrato SQL Auth/Storage.
 * Não usa credenciais, rede, banco de produção ou serviço real de autenticação.
 */
export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
    $$;
    grant usage on schema auth to authenticated,anon,service_role;
    grant execute on function auth.uid() to authenticated,anon,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon,service_role;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant all on all tables in schema storage to service_role;
  `);
  await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/services.sql', import.meta.url), 'utf8'));
  // Replay the deployed authorization upgrades, not obsolete editor write permissions.
  for(const migration of [
    '20260928032000_expand_platform_metric_storage.sql',
    '20261018230000_executive_dashboard_targets.sql',
    '20261021150000_client_user_invitations.sql',
    '20261021170000_agency_user_invitations.sql',
    '20261023183000_client_dashboard_readonly.sql',
    '20261023215000_client_profiles_layouts_readonly.sql',
    '20261023223000_csv_import_storage_admin_only.sql',
    '20261024040500_storage_update_admin_only.sql',
    '20261025230609_atomic_client_administration.sql',
    '20261025230936_withhold_unverified_financial_roi.sql',
  ]){
    await db.exec(await readFile(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
  }
  return db;
}
