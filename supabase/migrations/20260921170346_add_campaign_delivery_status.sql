alter table public.metrics_ads
  add column campaign_status text;

alter table public.metrics_ads
  add constraint metrics_ads_campaign_status_format
  check (campaign_status is null or campaign_status ~ '^[A-Z][A-Z0-9_]{1,63}$');

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

alter table public.ad_campaigns enable row level security;
revoke all on public.ad_campaigns from anon, authenticated;
grant all on public.ad_campaigns to service_role;
grant select on public.ad_campaigns to authenticated;
create trigger touch_updated_at before update on public.ad_campaigns for each row execute function private.touch_updated_at();
create trigger prevent_tenant_move before update on public.ad_campaigns for each row execute function private.prevent_tenant_move();
create policy tenant_read on public.ad_campaigns for select to authenticated using (private.user_belongs_to_org(organization_id));
