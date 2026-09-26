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
  foreign key (organization_id,integration_id)
    references public.integrations(organization_id,id) on delete cascade,
  unique (organization_id,platform,account_id,campaign_id,dimension_type,dimension_value,metric_date,currency)
);

create index metrics_ads_breakdowns_period
  on public.metrics_ads_breakdowns(organization_id,metric_date,platform,dimension_type);
create index metrics_ads_breakdowns_integration
  on public.metrics_ads_breakdowns(organization_id,integration_id);

alter table public.metrics_ads_breakdowns enable row level security;
revoke all on public.metrics_ads_breakdowns from public, anon, authenticated;
grant all on public.metrics_ads_breakdowns to service_role;
grant select on public.metrics_ads_breakdowns to authenticated;

create policy tenant_read on public.metrics_ads_breakdowns
  for select to authenticated
  using (private.user_belongs_to_org(organization_id));

create trigger touch_updated_at
  before update on public.metrics_ads_breakdowns
  for each row execute function private.touch_updated_at();
create trigger prevent_tenant_move
  before update on public.metrics_ads_breakdowns
  for each row execute function private.prevent_tenant_move();
