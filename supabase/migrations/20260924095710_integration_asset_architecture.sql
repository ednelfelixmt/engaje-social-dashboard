begin;

create table public.platform_connections (
  id uuid primary key default gen_random_uuid(), agency_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid references public.organizations(id) on delete set null, provider public.integration_provider not null,
  external_user_id text not null check(length(external_user_id)>0), account_name text not null,
  status public.integration_status not null default 'pending', credential_secret_id uuid, scopes text[] not null default '{}',
  config jsonb not null default '{}' check(jsonb_typeof(config)='object'), last_discovered_at timestamptz, last_error text,
  token_expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(agency_organization_id,provider,external_user_id)
);
create table public.platform_organizations (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.platform_connections(id) on delete cascade,
  provider public.integration_provider not null, external_id text not null, name text not null, organization_type text not null,
  status text not null default 'active', metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(connection_id,organization_type,external_id)
);
create table public.platform_assets (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.platform_connections(id) on delete cascade,
  platform_organization_id uuid references public.platform_organizations(id) on delete set null, provider public.integration_provider not null,
  asset_type text not null check(length(asset_type)>0), external_id text not null, name text not null, asset_status text not null default 'active',
  parent_external_id text, metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'), recommended boolean not null default true,
  last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(connection_id,asset_type,external_id)
);
create table public.client_asset_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.platform_assets(id) on delete restrict, integration_id uuid,
  assignment_status text not null default 'assigned' check(assignment_status in ('assigned','removed')), sync_enabled boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null, assigned_at timestamptz not null default now(), removed_at timestamptz,
  config jsonb not null default '{}' check(jsonb_typeof(config)='object'), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(organization_id,integration_id) references public.integrations(organization_id,id) on delete restrict
);
create unique index one_active_client_per_asset on public.client_asset_assignments(asset_id) where assignment_status='assigned';
create index client_asset_assignments_org on public.client_asset_assignments(organization_id,assignment_status);
create table public.sync_configs (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null unique references public.client_asset_assignments(id) on delete cascade,
  enabled boolean not null default true, metric_family text, config jsonb not null default '{}' check(jsonb_typeof(config)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.platform_connections(id) on delete set null, assignment_id uuid references public.client_asset_assignments(id) on delete set null,
  status text not null default 'queued' check(status in ('queued','running','completed','failed')), rows_processed integer not null default 0 check(rows_processed>=0),
  error_summary text, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['platform_connections','platform_organizations','platform_assets','client_asset_assignments','sync_configs','sync_jobs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  end loop;
end $$;
create policy connection_read on public.platform_connections for select to authenticated using ((select private.is_super_admin()) or private.user_belongs_to_org(target_organization_id));
create policy platform_org_read on public.platform_organizations for select to authenticated using (exists(select 1 from public.platform_connections c where c.id=connection_id and ((select private.is_super_admin()) or private.user_belongs_to_org(c.target_organization_id))));
create policy asset_read on public.platform_assets for select to authenticated using (
  exists(select 1 from public.platform_connections c where c.id=connection_id and ((select private.is_super_admin()) or private.user_belongs_to_org(c.target_organization_id)))
  or exists(select 1 from public.client_asset_assignments a where a.asset_id=id and a.assignment_status='assigned' and private.user_belongs_to_org(a.organization_id))
);
create policy assignment_read on public.client_asset_assignments for select to authenticated using(private.user_belongs_to_org(organization_id));
create policy sync_config_read on public.sync_configs for select to authenticated using(exists(select 1 from public.client_asset_assignments a where a.id=assignment_id and private.user_belongs_to_org(a.organization_id)));
create policy sync_job_read on public.sync_jobs for select to authenticated using(private.user_belongs_to_org(organization_id));
revoke select on public.platform_connections from authenticated;
grant select(id,agency_organization_id,target_organization_id,provider,external_user_id,account_name,status,scopes,config,last_discovered_at,last_error,token_expires_at,created_at,updated_at) on public.platform_connections to authenticated;

-- Migração sem perda: cada integração antiga ganha uma conexão/ativo/vínculo compatível.
insert into public.platform_connections(agency_organization_id,target_organization_id,provider,external_user_id,account_name,status,credential_secret_id,scopes,config,last_discovered_at,last_error,token_expires_at,created_at,updated_at)
select coalesce((select id from public.organizations where is_agency order by created_at limit 1),i.organization_id),i.organization_id,i.provider,
  'legacy:'||i.id,i.account_name,i.status,i.credential_secret_id,i.scopes,jsonb_build_object('legacy_integration_id',i.id),i.updated_at,i.last_error,i.token_expires_at,i.created_at,i.updated_at
from public.integrations i where coalesce(i.config->>'selection_pending','false')<>'true';
insert into public.platform_assets(connection_id,provider,asset_type,external_id,name,asset_status,metadata,recommended,last_seen_at,created_at,updated_at)
select c.id,i.provider,case i.provider when 'meta_ads' then 'ad_account' when 'facebook_organic' then 'facebook_page' when 'instagram_organic' then 'instagram_account'
  when 'google_ads' then 'ads_customer' when 'google_business' then 'business_location' when 'youtube' then 'youtube_channel' else 'account' end,
  i.external_account_id,i.account_name,case when i.status in ('connected','syncing') then 'active' else i.status::text end,
  jsonb_build_object('legacy_integration_id',i.id),true,i.updated_at,i.created_at,i.updated_at
from public.integrations i join public.platform_connections c on c.external_user_id='legacy:'||i.id;
insert into public.client_asset_assignments(organization_id,asset_id,integration_id,assignment_status,sync_enabled,assigned_at,config,created_at,updated_at)
select i.organization_id,a.id,i.id,'assigned',i.is_enabled,i.created_at,jsonb_build_object('migrated',true),i.created_at,i.updated_at
from public.integrations i join public.platform_connections c on c.external_user_id='legacy:'||i.id join public.platform_assets a on a.connection_id=c.id;
update public.platform_assets a set asset_status='assigned' where exists(select 1 from public.client_asset_assignments x where x.asset_id=a.id and x.assignment_status='assigned');
insert into public.sync_configs(assignment_id,enabled,metric_family,config)
select a.id,a.sync_enabled,case when i.provider in ('meta_ads','google_ads','tiktok_ads') then 'paid' when i.provider in ('facebook_organic','instagram_organic','tiktok_organic') then 'organic' else 'external' end,'{}'
from public.client_asset_assignments a join public.integrations i on i.id=a.integration_id;

create function private.store_platform_connection_token(p_id uuid,p_token text) returns void language plpgsql security definer set search_path='' as $$
declare secret_id uuid; begin
 select credential_secret_id into secret_id from public.platform_connections where id=p_id for update;
 if not found then raise exception 'Conexão inexistente'; end if;
 if secret_id is null then select vault.create_secret(p_token) into secret_id; update public.platform_connections set credential_secret_id=secret_id where id=p_id;
 else perform vault.update_secret(secret_id,p_token); end if;
end;$$;
create function private.platform_connection_token(p_id uuid) returns text language sql security definer set search_path='' as $$
 select s.decrypted_secret from vault.decrypted_secrets s join public.platform_connections c on c.credential_secret_id=s.id where c.id=p_id;
$$;
revoke all on function private.store_platform_connection_token(uuid,text),private.platform_connection_token(uuid) from public,anon,authenticated;
grant execute on function private.store_platform_connection_token(uuid,text),private.platform_connection_token(uuid) to service_role;
create function public.store_platform_connection_token(p_id uuid,p_token text) returns void language sql security invoker set search_path='' as $$select private.store_platform_connection_token(p_id,p_token);$$;
create function public.platform_connection_token(p_id uuid) returns text language sql security invoker set search_path='' as $$select private.platform_connection_token(p_id);$$;
revoke all on function public.store_platform_connection_token(uuid,text),public.platform_connection_token(uuid) from public,anon,authenticated;
grant execute on function public.store_platform_connection_token(uuid,text),public.platform_connection_token(uuid) to service_role;

commit;
