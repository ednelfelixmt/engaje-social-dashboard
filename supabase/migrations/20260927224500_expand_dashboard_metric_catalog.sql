alter table public.dashboard_configs
  drop constraint if exists dashboard_configs_enabled_metrics_check;

alter table public.dashboard_configs
  add constraint dashboard_configs_enabled_metrics_check
  check (
    cardinality(enabled_metrics) > 0
    and enabled_metrics <@ array['spend','revenue','conversion_value','profit','roas','roi','purchases','cpa','conversion_rate','cost_per_conversion','impressions','reach','frequency','cpm','clicks','link_clicks','outbound_clicks','unique_clicks','ctr','unique_ctr','cpc','page_views','cost_per_page_view','video_views','video_2s_views','video_3s_views','video_6s_views','thruplays','video_25','video_50','video_75','video_95','video_100','cost_per_thruplay','leads','registration_leads','message_leads','phone_calls','form_starts','form_completions','cpl','cost_per_registration','cost_per_message','cost_per_call','content_views','add_to_cart','cost_per_add_to_cart','checkouts','cost_per_checkout','catalog_sales','subscriptions','cost_per_subscription','interactions','engagement_rate','likes','comments','shares','saves','followers','follower_growth','profile_views','profile_visits','website_clicks','conversions','all_conversions','view_through_conversions','search_impression_share','search_top_impression_share','search_absolute_top_impression_share','quality_score','qualified_leads','mql','sql','opportunities','meetings','proposals','sales','lost_sales','close_rate']
  );
