create table if not exists public.integration_providers (
  id text primary key,
  name text not null,
  provider_type text not null check (provider_type in ('direct','aggregator')),
  status text not null default 'available',
  capabilities jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.integration_providers(id,name,provider_type,status,capabilities) values
('meta_direct','Meta Direct','direct','available','{"platforms":["facebook_organic","instagram","meta_ads"],"domains":["organic","paid"]}'::jsonb),
('google_direct','Google Direct','direct','setup_required','{"platforms":["google_ads","ga4","youtube"],"domains":["paid","analytics","organic"]}'::jsonb),
('tiktok_direct','TikTok Direct','direct','setup_required','{"platforms":["tiktok","tiktok_ads"],"domains":["organic","paid"]}'::jsonb),
('linkedin_direct','LinkedIn Direct','direct','setup_required','{"platforms":["linkedin","linkedin_ads"],"domains":["organic","paid"]}'::jsonb),
('microsoft_direct','Microsoft Ads Direct','direct','setup_required','{"platforms":["microsoft_ads"],"domains":["paid"]}'::jsonb),
('windsor','Windsor.ai','aggregator','available','{"platforms":["facebook_organic","instagram","meta_ads","google_ads","ga4","tiktok_ads","linkedin_ads","microsoft_ads"],"domains":["organic","paid","analytics"]}'::jsonb),
('stract','Stract','aggregator','bridge_required','{"platforms":["meta_ads","google_ads","tiktok_ads","linkedin_ads","microsoft_ads"],"domains":["paid"]}'::jsonb)
on conflict (id) do update set name=excluded.name,provider_type=excluded.provider_type,status=excluded.status,capabilities=excluded.capabilities,updated_at=now();

create table if not exists public.data_source_routes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null,
  data_domain text not null check (data_domain in ('organic','paid','analytics')),
  provider_id text not null references public.integration_providers(id),
  source_asset_id text,
  enabled boolean not null default true,
  priority integer not null default 100,
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, platform, data_domain)
);

alter table public.data_source_routes enable row level security;
drop policy if exists data_source_routes_read on public.data_source_routes;
create policy data_source_routes_read on public.data_source_routes for select to authenticated using (client_id = auth_client_id() or auth_user_role() = 'super_admin'::user_role);
drop policy if exists data_source_routes_write on public.data_source_routes;
create policy data_source_routes_write on public.data_source_routes for all to authenticated using (auth_user_role() in ('super_admin'::user_role,'admin'::user_role)) with check (auth_user_role() in ('super_admin'::user_role,'admin'::user_role));

alter table public.integration_providers enable row level security;
drop policy if exists integration_providers_read on public.integration_providers;
create policy integration_providers_read on public.integration_providers for select to authenticated using (true);

alter table public.posts add column if not exists source_provider text;
alter table public.post_metrics add column if not exists source_provider text;
alter table public.account_snapshots add column if not exists source_provider text;
alter table public.stories add column if not exists source_provider text;
alter table public.meta_ad_metrics add column if not exists source_provider text;

update public.posts set source_provider='windsor' where source_provider is null and platform='facebook_organic';
update public.post_metrics pm set source_provider=coalesce(pm.source_provider,p.source_provider,'windsor') from public.posts p where pm.post_id=p.id and pm.source_provider is null;
update public.meta_ad_metrics set source_provider='meta_direct' where source_provider is null;

create index if not exists idx_data_source_routes_client on public.data_source_routes(client_id,platform,data_domain);
create index if not exists idx_posts_source_provider on public.posts(client_id,platform,source_provider,published_at);
create index if not exists idx_meta_ad_metrics_source_provider on public.meta_ad_metrics(client_id,source_provider,date_start);
