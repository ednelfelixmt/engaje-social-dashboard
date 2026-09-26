alter table public.dashboard_configs
  drop constraint if exists dashboard_configs_enabled_metrics_check;

update public.dashboard_configs
set enabled_metrics = array(
  select distinct case when metric = 'engagement' then 'interactions' else metric end
  from unnest(enabled_metrics) as metric
  where metric <> 'followers'
);

alter table public.dashboard_configs
  alter column enabled_metrics set default array[
    'spend','impressions','clicks','ctr','leads','registration_leads','message_leads',
    'cpl','purchases','cpa','revenue','roas'
  ],
  add constraint dashboard_configs_enabled_metrics_check check (
    cardinality(enabled_metrics) > 0 and enabled_metrics <@ array[
      'spend','revenue','roas','roi','purchases','cpa','conversion_rate','checkouts','cost_per_checkout',
      'impressions','cpm','clicks','ctr','cpc','page_views','cost_per_page_view',
      'leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message',
      'reach','interactions','engagement_rate','likes','comments','shares','saves','video_views'
    ]::text[]
  );
