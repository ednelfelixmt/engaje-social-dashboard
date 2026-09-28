-- Store the primitive metrics returned by ad and organic platforms. Derived
-- indicators (CTR, CPC, CPA, frequency, rates) are calculated at query time so
-- they remain correct for any selected period.
alter table public.metrics_ads
  add column if not exists reach numeric,
  add column if not exists link_clicks numeric,
  add column if not exists outbound_clicks numeric,
  add column if not exists unique_clicks numeric,
  add column if not exists video_views numeric,
  add column if not exists video_2s_views numeric,
  add column if not exists video_3s_views numeric,
  add column if not exists video_6s_views numeric,
  add column if not exists thruplays numeric,
  add column if not exists video_25 numeric,
  add column if not exists video_50 numeric,
  add column if not exists video_75 numeric,
  add column if not exists video_95 numeric,
  add column if not exists video_100 numeric,
  add column if not exists registration_leads numeric,
  add column if not exists phone_calls numeric,
  add column if not exists form_starts numeric,
  add column if not exists form_completions numeric,
  add column if not exists content_views numeric,
  add column if not exists add_to_cart numeric,
  add column if not exists catalog_sales numeric,
  add column if not exists subscriptions numeric,
  add column if not exists conversions numeric,
  add column if not exists all_conversions numeric,
  add column if not exists view_through_conversions numeric,
  add column if not exists conversion_value numeric,
  add column if not exists search_impression_share numeric,
  add column if not exists search_top_impression_share numeric,
  add column if not exists search_absolute_top_impression_share numeric,
  add column if not exists quality_score numeric;

alter table public.metrics_organic
  add column if not exists interactions numeric,
  add column if not exists link_clicks numeric,
  add column if not exists video_2s_views numeric,
  add column if not exists video_3s_views numeric,
  add column if not exists video_6s_views numeric,
  add column if not exists video_25 numeric,
  add column if not exists video_50 numeric,
  add column if not exists video_75 numeric,
  add column if not exists video_95 numeric,
  add column if not exists video_100 numeric;

comment on column public.metrics_ads.reach is 'Unique accounts reached, when supplied by the source platform.';
comment on column public.metrics_ads.registration_leads is 'Form and website registrations, excluding messaging conversations.';
comment on column public.metrics_ads.conversion_value is 'Platform-attributed conversion value before CRM reconciliation.';
comment on column public.metrics_organic.impressions is 'Content views/media views. Meta renamed impressions to media views in Graph API v24+.';
comment on column public.metrics_organic.reach is 'Unique media viewers/accounts reached when supplied by the platform.';
