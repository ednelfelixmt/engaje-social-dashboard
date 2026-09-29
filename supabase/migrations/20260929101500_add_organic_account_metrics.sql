create table public.metrics_organic_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null,
  metric_date date not null,
  platform public.integration_provider not null
    check (platform in ('facebook_organic','instagram_organic','tiktok_organic','youtube','google_business')),
  account_id text not null,
  impressions bigint check (impressions >= 0),
  reach bigint check (reach >= 0),
  interactions bigint check (interactions >= 0),
  followers bigint check (followers >= 0),
  follows bigint check (follows >= 0),
  unfollows bigint check (unfollows >= 0),
  profile_views bigint check (profile_views >= 0),
  profile_visits bigint check (profile_visits >= 0),
  website_clicks bigint check (website_clicks >= 0),
  source_period text not null default 'day',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,integration_id)
    references public.integrations(organization_id,id) on delete cascade,
  unique (organization_id,platform,account_id,metric_date)
);

alter table public.creatives
  add column if not exists name text,
  add column if not exists description text;

comment on column public.creatives.name is 'Platform ad name or organic content title.';
comment on column public.creatives.description is 'Primary text/description supplied by the source platform.';

comment on table public.metrics_organic_accounts is
  'Daily account/profile facts and follower snapshots. Kept separate from publication metrics to prevent double counting.';
comment on column public.metrics_organic_accounts.followers is
  'End-of-day follower snapshot. Use the latest value in a period; never sum it.';
comment on column public.metrics_organic_accounts.reach is
  'Account-level reach reported by the source for source_period; do not combine with publication reach.';

create index metrics_organic_accounts_period
  on public.metrics_organic_accounts(organization_id,metric_date,platform);
create index metrics_organic_accounts_integration
  on public.metrics_organic_accounts(organization_id,integration_id);

alter table public.metrics_organic_accounts enable row level security;
revoke all on public.metrics_organic_accounts from public, anon, authenticated;
grant all on public.metrics_organic_accounts to service_role;
grant select on public.metrics_organic_accounts to authenticated;

create policy tenant_read on public.metrics_organic_accounts
  for select to authenticated
  using (private.user_belongs_to_org(organization_id));

create trigger touch_updated_at
  before update on public.metrics_organic_accounts
  for each row execute function private.touch_updated_at();
create trigger prevent_tenant_move
  before update on public.metrics_organic_accounts
  for each row execute function private.prevent_tenant_move();
