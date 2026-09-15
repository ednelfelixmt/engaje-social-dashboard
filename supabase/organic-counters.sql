alter table public.creatives add column lifetime_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(lifetime_metrics)='object');
comment on column public.creatives.lifetime_metrics is 'Latest cumulative post counters, never additive daily facts.';
