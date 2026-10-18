-- Keep the dashboard focused on paid media and expose the complete video
-- metric set already supported by the ingestion schema.
alter table public.dashboard_configs
  alter column enabled_pages set default array['overview','paid','funnel','creatives','external'],
  alter column enabled_metrics set default array[
    'spend','impressions','reach','clicks','ctr','leads','registration_leads',
    'message_leads','cpl','purchases','cpa','revenue','roas','video_views',
    'video_2s_views','video_3s_views','video_6s_views','thruplays','video_25',
    'video_50','video_75','video_95','video_100','cost_per_thruplay'
  ];

update public.dashboard_configs
set
  enabled_pages = array(
    select page
    from unnest(enabled_pages) as page
    where page not in (
      'organic', 'facebook_organic', 'instagram_organic',
      'tiktok_organic', 'youtube', 'google_business'
    )
  ),
  enabled_metrics = array(
    select metric
    from unnest(
      enabled_metrics || array[
        'video_views', 'video_2s_views', 'video_3s_views', 'video_6s_views',
        'thruplays', 'video_25', 'video_50', 'video_75', 'video_95',
        'video_100', 'cost_per_thruplay'
      ]::text[]
    ) with ordinality as selected(metric, position)
    where metric not in (
      'interactions', 'engagement_rate', 'likes', 'comments', 'shares',
      'saves', 'followers', 'follower_growth', 'profile_views',
      'profile_visits', 'website_clicks'
    )
    group by metric
    order by min(position)
  ),
  updated_at = now();
