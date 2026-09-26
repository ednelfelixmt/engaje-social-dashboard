-- Engaje Mídia Hub — etapa 1. PostgreSQL 15+ / Supabase.
-- Bootstrap para banco NOVO; não aplicar sobre o schema legado.
-- As únicas tabelas da aplicação são as 11 solicitadas.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create type public.member_role as enum ('super_admin','client_admin','editor','viewer');
create type public.organization_status as enum ('active','paused');
create type public.integration_provider as enum ('meta_ads','facebook_organic','instagram_organic','google_ads','google_business','youtube','tiktok_ads','tiktok_organic','hubspot','rd_station','generic_crm','windsor','stract');
create type public.integration_status as enum ('disconnected','pending','connected','syncing','error','expired');
create type public.revenue_source as enum ('crm','spreadsheet');
create type public.upload_status as enum ('pending','processing','completed','failed');
create type public.creative_kind as enum ('image','video','carousel','text');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_agency boolean not null default false,
  status public.organization_status not null default 'active',
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Uma instalação atende UMA agência; seus clientes são organizações isoladas.
create unique index organizations_one_agency on public.organizations (is_agency) where is_agency;

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);
create index organization_members_user on public.organization_members(user_id,organization_id) where is_active;

-- Perfil por organização: um usuário pode pertencer a vários clientes.
create table public.profiles (
  organization_id uuid not null,
  user_id uuid not null,
  display_name text not null default '' check (length(display_name) <= 160),
  avatar_path text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id),
  foreign key (organization_id,user_id) references public.organization_members(organization_id,user_id) on delete cascade
);

create table public.branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  platform_name text not null default 'Engaje Mídia Hub',
  logo_path text,
  favicon_path text,
  login_background_path text,
  dashboard_background_path text,
  primary_color text not null default '#FFD600' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#242430' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#0F0F13' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  login_background_color text not null default '#0F0F13' check (login_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_position text not null default 'center' check (background_position in ('center','top','bottom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (logo_path is null or logo_path like organization_id::text || '/%'),
  check (favicon_path is null or favicon_path like organization_id::text || '/%'),
  check (login_background_path is null or login_background_path like organization_id::text || '/%'),
  check (dashboard_background_path is null or dashboard_background_path like organization_id::text || '/%')
);

create table public.dashboard_configs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled_pages text[] not null default array['overview','paid','funnel','organic','creatives','external'],
  enabled_metrics text[] not null default array['spend','impressions','clicks','ctr','leads','registration_leads','message_leads','cpl','purchases','cpa','revenue','roas'],
  widget_order text[] not null default array['kpis','funnel','campaigns','timeline'],
  only_platforms_with_data boolean not null default true,
  comparison_enabled boolean not null default true,
  preferred_revenue_source public.revenue_source not null default 'crm',
  target_roas numeric(18,6) check (target_roas >= 0),
  target_roi numeric(18,6),
  target_cpa numeric(18,6) check (target_cpa >= 0),
  target_revenue numeric(18,6) check (target_revenue >= 0),
  target_purchases bigint check (target_purchases >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (enabled_pages <@ array['overview','paid','meta_ads','google_ads','tiktok_ads','funnel','organic','facebook_organic','instagram_organic','tiktok_organic','creatives','external']),
  check (cardinality(enabled_metrics) > 0 and enabled_metrics <@ array['spend','revenue','roas','roi','purchases','cpa','conversion_rate','checkouts','cost_per_checkout','impressions','cpm','clicks','ctr','cpc','page_views','cost_per_page_view','leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message','reach','interactions','engagement_rate','likes','comments','shares','saves','video_views']),
  check (widget_order <@ array['kpis','funnel','campaigns','timeline','creatives','platforms'])
);

-- Uma linha por provedor/conta. Nunca armazenar tokens em config ou last_error.
-- credential_secret_id referencia um segredo em Vault, acessível só no backend.
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  external_account_id text not null check (length(external_account_id) > 0),
  account_name text not null,
  status public.integration_status not null default 'disconnected',
  is_enabled boolean not null default true,
  credential_secret_id uuid,
  scopes text[] not null default '{}',
  config jsonb not null default '{}' check (jsonb_typeof(config)='object'),
  last_sync_started_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  unique (organization_id,provider,external_account_id)
);

-- A autenticação da plataforma é independente dos ativos e dos clientes.
-- integrations permanece como adaptador de sincronização para preservar FKs e histórico.
create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  agency_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid references public.organizations(id) on delete set null,
  provider public.integration_provider not null,
  external_user_id text not null check (length(external_user_id) > 0),
  account_name text not null,
  status public.integration_status not null default 'pending',
  credential_secret_id uuid,
  scopes text[] not null default '{}',
  config jsonb not null default '{}' check (jsonb_typeof(config)='object'),
  last_discovered_at timestamptz,
  last_error text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_organization_id,provider,external_user_id)
);

create table public.platform_organizations (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.platform_connections(id) on delete cascade,
  provider public.integration_provider not null,
  external_id text not null,
  name text not null,
  organization_type text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata)='object'),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id,organization_type,external_id)
);

create table public.platform_assets (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.platform_connections(id) on delete cascade,
  platform_organization_id uuid references public.platform_organizations(id) on delete set null,
  provider public.integration_provider not null,
  asset_type text not null check (length(asset_type) > 0),
  external_id text not null,
  name text not null,
  asset_status text not null default 'active',
  parent_external_id text,
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata)='object'),
  recommended boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id,asset_type,external_id)
);

create table public.client_asset_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.platform_assets(id) on delete restrict,
  integration_id uuid,
  assignment_status text not null default 'assigned' check (assignment_status in ('assigned','removed')),
  sync_enabled boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  config jsonb not null default '{}' check (jsonb_typeof(config)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id) on delete restrict
);
create unique index one_active_client_per_asset on public.client_asset_assignments(asset_id) where assignment_status='assigned';
create index client_asset_assignments_org on public.client_asset_assignments(organization_id,assignment_status);
create index client_asset_assignments_assigned_by on public.client_asset_assignments(assigned_by);
create index client_asset_assignments_integration on public.client_asset_assignments(organization_id,integration_id);
create index platform_connections_target_org on public.platform_connections(target_organization_id);
create index platform_assets_platform_org on public.platform_assets(platform_organization_id);

create table public.sync_configs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.client_asset_assignments(id) on delete cascade,
  enabled boolean not null default true,
  metric_family text,
  config jsonb not null default '{}' check (jsonb_typeof(config)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.platform_connections(id) on delete set null,
  assignment_id uuid references public.client_asset_assignments(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  rows_processed integer not null default 0 check (rows_processed >= 0),
  error_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sync_jobs_org on public.sync_jobs(organization_id);
create index sync_jobs_connection on public.sync_jobs(connection_id);
create index sync_jobs_assignment on public.sync_jobs(assignment_id);

create table public.integration_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  connection_id uuid references public.platform_connections(id) on delete set null,
  sync_job_id uuid references public.sync_jobs(id) on delete set null,
  alert_key text not null unique,
  code text not null check (code in ('integration_status','connection_status','stale_sync','sync_failed')),
  severity text not null check (severity in ('warning','critical')),
  status text not null default 'open' check (status in ('open','resolved')),
  title text not null,
  detail text,
  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integration_alerts_org_status on public.integration_alerts(organization_id,status,last_seen_at desc);
create index integration_alerts_integration on public.integration_alerts(integration_id);
create index integration_alerts_connection on public.integration_alerts(connection_id);
create index integration_alerts_sync_job on public.integration_alerts(sync_job_id);

create table public.spreadsheet_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  file_path text not null,
  file_name text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  status public.upload_status not null default 'pending',
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_imported integer not null default 0 check (rows_imported >= 0 and rows_imported <= rows_received),
  error_summary text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  unique (organization_id,sha256),
  check (file_path like organization_id::text || '/%')
);

-- Grão: dia + plataforma + conta + campanha + anúncio; SEM breakdowns sobrepostos.
-- account_id/campaign_id/ad_id são strings (IDs externos podem exceder JS safe integer).
create table public.metrics_ads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null,
  metric_date date not null,
  platform public.integration_provider not null check (platform in ('meta_ads','google_ads','tiktok_ads')),
  account_id text not null,
  campaign_id text not null,
  campaign_name text not null,
  campaign_status text check (campaign_status is null or campaign_status ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  adset_id text,
  ad_id text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  spend numeric(18,6) not null check (spend >= 0),
  revenue numeric(18,6),
  impressions bigint check (impressions >= 0),
  clicks bigint check (clicks >= 0),
  page_views bigint check (page_views >= 0),
  leads bigint check (leads >= 0),
  message_leads bigint check (message_leads >= 0),
  checkouts bigint check (checkouts >= 0),
  purchases bigint check (purchases >= 0),
  attribution_window text not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id),
  unique (organization_id,platform,account_id,campaign_id,ad_id,metric_date,currency)
);

-- Grão: dia + campanha + uma única dimensão de segmentação. Nunca somar tipos
-- diferentes entre si, pois cada tipo representa uma visão completa do mesmo tráfego.
create table public.metrics_ads_breakdowns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null,
  metric_date date not null,
  platform public.integration_provider not null check (platform in ('meta_ads','google_ads','tiktok_ads')),
  account_id text not null,
  campaign_id text not null,
  campaign_name text not null,
  dimension_type text not null check (dimension_type in ('audience','creative','gender','age','device','state','city')),
  dimension_value text not null,
  dimension_label text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  spend numeric(18,6) not null check (spend >= 0),
  revenue numeric(18,6),
  impressions bigint check (impressions >= 0),
  clicks bigint check (clicks >= 0),
  leads bigint check (leads >= 0),
  message_leads bigint check (message_leads >= 0),
  checkouts bigint check (checkouts >= 0),
  purchases bigint check (purchases >= 0),
  attribution_window text not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id) on delete cascade,
  unique (organization_id,platform,account_id,campaign_id,dimension_type,dimension_value,metric_date,currency)
);

-- Catálogo atual de campanhas, inclusive sem veiculação no período selecionado.
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null,
  platform public.integration_provider not null check (platform in ('meta_ads','google_ads','tiktok_ads')),
  account_id text not null,
  external_id text not null,
  name text not null,
  status text check (status is null or status ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,platform,account_id,external_id),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id) on delete cascade
);
create index ad_campaigns_integration_idx on public.ad_campaigns (organization_id,integration_id);

-- Grão: dia + fonte + moeda + canal + conta + campanha.
-- Receita líquida reconhecida no dia (inclui estornos); NULL = desconhecida, 0 = zero real.
-- campaign_id='' é exclusivamente receita não atribuída; nunca copiar totais para cada campanha.
-- Importar o lote diário inteiro numa transação; is_complete só após conciliação do dia.
create table public.metrics_crm (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid,
  spreadsheet_upload_id uuid,
  source public.revenue_source not null,
  metric_date date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  channel text not null default 'unattributed' check (channel in ('meta_ads','google_ads','tiktok_ads','organic','direct','unattributed')),
  account_id text not null default '',
  campaign_id text not null default '',
  revenue numeric(18,6),
  purchases bigint check (purchases >= 0),
  leads bigint check (leads >= 0),
  checkouts bigint check (checkouts >= 0),
  is_complete boolean not null default false,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id),
  foreign key (organization_id,spreadsheet_upload_id) references public.spreadsheet_uploads(organization_id,id),
  check ((source='crm' and integration_id is not null and spreadsheet_upload_id is null) or
         (source='spreadsheet' and spreadsheet_upload_id is not null and integration_id is null)),
  check (campaign_id='' or (account_id<>'' and channel in ('meta_ads','google_ads','tiktok_ads'))),
  unique (organization_id,source,metric_date,currency,channel,account_id,campaign_id)
);

create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null,
  platform public.integration_provider not null,
  account_id text not null,
  external_id text not null,
  campaign_id text,
  ad_id text,
  kind public.creative_kind not null,
  caption text,
  media_url text,
  thumbnail_url text,
  storage_path text,
  permalink text,
  published_at timestamptz,
  url_expires_at timestamptz,
  lifetime_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(lifetime_metrics)='object'),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  unique (organization_id,platform,account_id,external_id),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id),
  check (storage_path is null or storage_path like organization_id::text || '/%')
);

-- Métricas diárias de post, não snapshots lifetime somados repetidamente.
create table public.metrics_organic (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null,
  creative_id uuid not null,
  metric_date date not null,
  platform public.integration_provider not null check (platform in ('facebook_organic','instagram_organic','tiktok_organic','youtube','google_business')),
  impressions bigint check (impressions >= 0),
  reach bigint check (reach >= 0),
  clicks bigint check (clicks >= 0),
  page_views bigint check (page_views >= 0),
  likes bigint check (likes >= 0),
  comments bigint check (comments >= 0),
  shares bigint check (shares >= 0),
  saves bigint check (saves >= 0),
  video_views bigint check (video_views >= 0),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,integration_id) references public.integrations(organization_id,id),
  foreign key (organization_id,creative_id) references public.creatives(organization_id,id),
  unique (organization_id,creative_id,metric_date)
);

create index metrics_ads_period on public.metrics_ads(organization_id,metric_date,platform);
create index metrics_ads_integration on public.metrics_ads(organization_id,integration_id);
create index metrics_ads_breakdowns_period on public.metrics_ads_breakdowns(organization_id,metric_date,platform,dimension_type);
create index metrics_ads_breakdowns_integration on public.metrics_ads_breakdowns(organization_id,integration_id);
create index metrics_crm_period on public.metrics_crm(organization_id,metric_date,source);
create index metrics_crm_integration on public.metrics_crm(organization_id,integration_id);
create index metrics_crm_upload on public.metrics_crm(organization_id,spreadsheet_upload_id);
create index spreadsheet_uploads_uploaded_by_idx on public.spreadsheet_uploads(uploaded_by);
create index metrics_organic_period on public.metrics_organic(organization_id,metric_date,platform);
create index metrics_organic_integration on public.metrics_organic(organization_id,integration_id);
create index creatives_period on public.creatives(organization_id,published_at desc);
create index creatives_integration on public.creatives(organization_id,integration_id);

-- SECURITY DEFINER exclusivamente no schema privado, para consultar memberships sem recursão RLS.
create function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.user_id=auth.uid() and m.is_active and m.role='super_admin' and o.is_agency and o.status='active'
  );
$$;
create function private.user_belongs_to_org(p_organization_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.is_super_admin() or exists (
    select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.is_active and o.status='active'
  ));
$$;
create function private.has_org_role(p_organization_id uuid,p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.is_super_admin() or exists (
    select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.is_active and m.role=any(p_roles) and o.status='active'
  ));
$$;
revoke all on function private.is_super_admin(),private.user_belongs_to_org(uuid),private.has_org_role(uuid,public.member_role[]) from public,anon;
grant execute on function private.is_super_admin(),private.user_belongs_to_org(uuid),private.has_org_role(uuid,public.member_role[]) to authenticated,service_role;
-- Wrappers RPC públicos não privilegiados, úteis no Server Component/middleware.
create function public.is_super_admin() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_super_admin(); $$;
create function public.user_belongs_to_org(p_organization_id uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.user_belongs_to_org(p_organization_id); $$;
revoke all on function public.is_super_admin(),public.user_belongs_to_org(uuid) from public,anon;
grant execute on function public.is_super_admin(),public.user_belongs_to_org(uuid) to authenticated,service_role;

create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
create function private.check_member_role() returns trigger language plpgsql set search_path='' as $$
begin
  if new.role='super_admin' and not exists (select 1 from public.organizations where id=new.organization_id and is_agency) then
    raise exception 'super_admin exige organização da agência' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger check_member_role before insert or update on public.organization_members for each row execute function private.check_member_role();

-- Identidade tenant imutável, inclusive para usuários com acesso a dois clientes.
create function private.prevent_tenant_move() returns trigger language plpgsql set search_path='' as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id é imutável' using errcode='23514';
  end if;
  return new;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['organizations','profiles','organization_members','branding','dashboard_configs','integrations','ad_campaigns','metrics_ads','metrics_ads_breakdowns','metrics_crm','metrics_organic','creatives','spreadsheet_uploads'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
    if t<>'organizations' then
      execute format('create trigger prevent_tenant_move before update on public.%I for each row execute function private.prevent_tenant_move()',t);
      execute format('create policy tenant_read on public.%I for select to authenticated using (private.user_belongs_to_org(organization_id))',t);
    end if;
  end loop;
end $$;

grant insert,update on public.organizations to authenticated;
create policy org_read on public.organizations for select to authenticated using (private.user_belongs_to_org(id));
create policy org_insert on public.organizations for insert to authenticated with check ((select private.is_super_admin()));
create policy org_update on public.organizations for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Cadastro/invites e promoção de roles ficam sob controle exclusivo da agência.
grant insert,update,delete on public.organization_members to authenticated;
create policy members_insert on public.organization_members for insert to authenticated with check ((select private.is_super_admin()));
create policy members_update on public.organization_members for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy members_delete on public.organization_members for delete to authenticated using ((select private.is_super_admin()));

grant insert on public.profiles to authenticated;
grant update (display_name,avatar_path,locale) on public.profiles to authenticated;
create policy profile_insert on public.profiles for insert to authenticated with check (private.user_belongs_to_org(organization_id) and (user_id=(select auth.uid()) or (select private.is_super_admin())));
create policy profile_update on public.profiles for update to authenticated using (private.user_belongs_to_org(organization_id) and (user_id=(select auth.uid()) or (select private.is_super_admin()))) with check (private.user_belongs_to_org(organization_id) and (user_id=(select auth.uid()) or (select private.is_super_admin())));

do $$ declare t text; begin
  foreach t in array array['branding','dashboard_configs'] loop
    execute format('grant insert,update,delete on public.%I to authenticated',t);
    execute format('create policy config_insert on public.%I for insert to authenticated with check (private.has_org_role(organization_id,array[''client_admin'',''editor'']::public.member_role[]))',t);
    execute format('create policy config_update on public.%I for update to authenticated using (private.has_org_role(organization_id,array[''client_admin'',''editor'']::public.member_role[])) with check (private.has_org_role(organization_id,array[''client_admin'',''editor'']::public.member_role[]))',t);
    execute format('create policy config_delete on public.%I for delete to authenticated using (private.has_org_role(organization_id,array[''client_admin'']::public.member_role[]))',t);
  end loop;
end $$;

-- Integrations/métricas/criativos/uploads: somente leitura no navegador.
-- Route Handlers autenticam usuário + role + organização ANTES de usar service_role.
-- Tokens ficam no Vault; nem a referência do segredo é exposta aos clientes.
revoke select on public.integrations from authenticated;
grant select (id,organization_id,provider,external_account_id,account_name,status,is_enabled,scopes,config,last_sync_started_at,last_synced_at,last_error,token_expires_at,created_at,updated_at) on public.integrations to authenticated;

-- Catálogo e vínculos são somente leitura no navegador. Toda mutação passa pela
-- Edge Function, que valida o usuário antes de usar service_role.
do $$ declare t text; begin
  foreach t in array array['platform_connections','platform_organizations','platform_assets','client_asset_assignments','sync_configs','sync_jobs','integration_alerts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
  end loop;
end $$;
create policy connection_read on public.platform_connections for select to authenticated using (
  (select private.is_super_admin()) or private.user_belongs_to_org(target_organization_id)
);
create policy platform_org_read on public.platform_organizations for select to authenticated using (
  exists(select 1 from public.platform_connections c where c.id=connection_id and ((select private.is_super_admin()) or private.user_belongs_to_org(c.target_organization_id)))
);
create policy asset_read on public.platform_assets for select to authenticated using (
  exists(select 1 from public.platform_connections c where c.id=connection_id and ((select private.is_super_admin()) or private.user_belongs_to_org(c.target_organization_id)))
  or exists(select 1 from public.client_asset_assignments a where a.asset_id=id and a.assignment_status='assigned' and private.user_belongs_to_org(a.organization_id))
);
create policy assignment_read on public.client_asset_assignments for select to authenticated using (private.user_belongs_to_org(organization_id));
create policy sync_config_read on public.sync_configs for select to authenticated using (
  exists(select 1 from public.client_asset_assignments a where a.id=assignment_id and private.user_belongs_to_org(a.organization_id))
);
create policy sync_job_read on public.sync_jobs for select to authenticated using (private.user_belongs_to_org(organization_id));
create policy integration_alert_read on public.integration_alerts for select to authenticated using (private.user_belongs_to_org(organization_id));
revoke select on public.platform_connections from authenticated;
grant select (id,agency_organization_id,target_organization_id,provider,external_user_id,account_name,status,scopes,config,last_discovered_at,last_error,token_expires_at,created_at,updated_at) on public.platform_connections to authenticated;

create function private.monitor_integration_health() returns integer
language plpgsql security invoker set search_path='' as $$
declare open_count integer;
begin
  update public.sync_jobs set status='failed',completed_at=now(),error_summary='Sincronização interrompida por tempo excedido.'
  where status='running' and started_at < now()-interval '30 minutes';

  insert into public.integration_alerts(organization_id,integration_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
  select i.organization_id,i.id,'integration:'||i.id||':status','integration_status','critical','open',
    i.account_name||' exige atenção',coalesce(i.last_error,'A integração está com status '||i.status::text),now(),null
  from public.integrations i where i.status in ('error','expired')
  on conflict(alert_key) do update set severity=excluded.severity,status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;

  insert into public.integration_alerts(organization_id,integration_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
  select i.organization_id,i.id,'integration:'||i.id||':stale','stale_sync','warning','open',
    i.account_name||' está sem atualização','Última sincronização há mais de 24 horas.',now(),null
  from public.integrations i where i.is_enabled and i.status in ('connected','syncing') and coalesce(i.last_synced_at,i.created_at)<now()-interval '24 hours'
  on conflict(alert_key) do update set status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;

  insert into public.integration_alerts(organization_id,connection_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
  select coalesce(c.target_organization_id,c.agency_organization_id),c.id,'connection:'||c.id||':status','connection_status','critical','open',
    c.account_name||' perdeu a conexão',coalesce(c.last_error,'A autenticação precisa ser renovada.'),now(),null
  from public.platform_connections c where c.status in ('error','expired')
  on conflict(alert_key) do update set status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;

  insert into public.integration_alerts(organization_id,sync_job_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
  select j.organization_id,j.id,'sync-job:'||j.id||':failed','sync_failed','critical','open',
    'Falha na sincronização',coalesce(j.error_summary,'A tarefa não foi concluída.'),now(),null
  from public.sync_jobs j where j.status='failed' and j.created_at>now()-interval '7 days'
  on conflict(alert_key) do update set status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;

  update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now()
  where a.status='open' and a.code='integration_status' and not exists(select 1 from public.integrations i where i.id=a.integration_id and i.status in ('error','expired'));
  update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now()
  where a.status='open' and a.code='stale_sync' and not exists(select 1 from public.integrations i where i.id=a.integration_id and i.is_enabled and i.status in ('connected','syncing') and coalesce(i.last_synced_at,i.created_at)<now()-interval '24 hours');
  update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now()
  where a.status='open' and a.code='connection_status' and not exists(select 1 from public.platform_connections c where c.id=a.connection_id and c.status in ('error','expired'));
  update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now()
  where a.status='open' and a.code='sync_failed' and exists(select 1 from public.sync_jobs failed join public.sync_jobs recovered on recovered.assignment_id=failed.assignment_id and recovered.status='completed' and recovered.completed_at>failed.completed_at where failed.id=a.sync_job_id);

  select count(*) into open_count from public.integration_alerts where status='open';
  return open_count;
end;$$;
revoke all on function private.monitor_integration_health() from public,anon,authenticated;
grant execute on function private.monitor_integration_health() to service_role;

-- Configuração inicial automática. Não utiliza user_metadata para roles.
create function private.initialize_organization() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.branding(organization_id) values(new.id);
  insert into public.dashboard_configs(organization_id) values(new.id);
  return new;
end;
$$;
create trigger initialize_organization after insert on public.organizations for each row execute function private.initialize_organization();
revoke all on function private.initialize_organization(),private.touch_updated_at(),private.check_member_role(),private.prevent_tenant_move() from public,anon,authenticated;

-- Agregar separadamente ANTES do JOIN evita multiplicação de investimento por linhas CRM.
-- A fonte preferida tem precedência; se incompleta/ausente, tenta a outra; por último Ads.
-- Uma fonte completa substitui o total diário de Ads, inclusive quando sua receita é zero.
create view public.daily_performance with (security_invoker=true) as
with ads as (
  select organization_id,metric_date,currency,sum(spend) as spend,
    case when count(revenue)=count(*) then sum(revenue) end as ad_revenue,
    case when count(purchases)=count(*) then sum(purchases) end as ad_purchases,
    case when count(impressions)=count(*) then sum(impressions) end as impressions,
    case when count(clicks)=count(*) then sum(clicks) end as clicks,
    case when count(page_views)=count(*) then sum(page_views) end as page_views,
    case when count(leads)=count(*) then sum(leads) end as ad_leads,
    case when count(message_leads)=count(*) then sum(message_leads) end as message_leads,
    case when count(checkouts)=count(*) then sum(checkouts) end as ad_checkouts,
    max(synced_at) as ads_synced_at
  from public.metrics_ads group by organization_id,metric_date,currency
), actual_candidates as (
  select m.organization_id,m.metric_date,m.currency,m.source,
    sum(m.revenue) as real_revenue,
    case when count(m.purchases)=count(*) then sum(m.purchases) end as real_purchases,
    case when count(m.leads)=count(*) then sum(m.leads) end as real_leads,
    case when count(m.checkouts)=count(*) then sum(m.checkouts) end as real_checkouts,
    max(m.synced_at) as real_synced_at,
    row_number() over (partition by m.organization_id,m.metric_date,m.currency order by
      (m.source=coalesce(c.preferred_revenue_source,'crm'::public.revenue_source)) desc,m.source) as priority
  from public.metrics_crm m left join public.dashboard_configs c using (organization_id)
  group by m.organization_id,m.metric_date,m.currency,m.source,c.preferred_revenue_source
  having bool_and(m.is_complete) and count(m.revenue)=count(*)
), actual as (select * from actual_candidates where priority=1), totals as (
  select coalesce(a.organization_id,r.organization_id) as organization_id,
    coalesce(a.metric_date,r.metric_date) as metric_date,coalesce(a.currency,r.currency) as currency,
    coalesce(a.spend,0::numeric) as spend,a.ad_revenue,r.real_revenue,
    coalesce(r.real_revenue,a.ad_revenue) as revenue,
    case when r.organization_id is not null then r.source::text when a.ad_revenue is not null then 'ads' else 'unavailable' end as revenue_source,
    case when r.organization_id is not null then r.real_purchases else a.ad_purchases end as purchases,
    a.impressions,a.clicks,a.page_views,a.message_leads,
    case when r.organization_id is not null then r.real_leads else a.ad_leads end as leads,
    case when r.organization_id is not null then r.real_checkouts else a.ad_checkouts end as checkouts,
    a.ads_synced_at,r.real_synced_at
  from ads a full outer join actual r using (organization_id,metric_date,currency)
)
select *, revenue/nullif(spend,0) as roas,
  (revenue-spend)/nullif(spend,0)*100 as roi,
  spend/nullif(purchases,0) as cpa,
  clicks::numeric/nullif(impressions,0)*100 as ctr
from totals;
revoke all on public.daily_performance from public,anon,authenticated;
grant select on public.daily_performance to authenticated,service_role;

-- Storage: buckets privados. Servir branding pré-login através de endpoint controlado
-- por slug que só devolve campos públicos e URLs assinadas, implementado na etapa 2.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('branding','branding',false,10485760,array['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon']),
 ('creatives','creatives',false,52428800,array['image/png','image/jpeg','image/webp','video/mp4']),
 ('spreadsheets','spreadsheets',false,10485760,array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

-- Segmento inicial precisa ser UUID válido: entrada malformada nega acesso sem cast error.
create function private.storage_org(p_name text) returns uuid language sql immutable set search_path='' as $$
 select case when split_part(p_name,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then split_part(p_name,'/',1)::uuid end;
$$;
revoke all on function private.storage_org(text) from public,anon;
grant execute on function private.storage_org(text) to authenticated,service_role;
create policy engaje_storage_read on storage.objects for select to authenticated using (
 bucket_id in ('branding','creatives','spreadsheets') and private.user_belongs_to_org(private.storage_org(name))
);
create policy engaje_storage_insert on storage.objects for insert to authenticated with check (
 bucket_id in ('branding','spreadsheets') and private.has_org_role(private.storage_org(name),array['client_admin','editor']::public.member_role[])
);
create policy engaje_storage_update on storage.objects for update to authenticated using (
 bucket_id='branding' and private.has_org_role(private.storage_org(name),array['client_admin','editor']::public.member_role[])
) with check (
 bucket_id='branding' and private.has_org_role(private.storage_org(name),array['client_admin','editor']::public.member_role[])
);
create policy engaje_storage_delete on storage.objects for delete to authenticated using (
 bucket_id in ('branding','spreadsheets') and private.has_org_role(private.storage_org(name),array['client_admin','editor']::public.member_role[])
);
commit;
