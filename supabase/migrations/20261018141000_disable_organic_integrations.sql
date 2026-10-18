-- Organic dashboards were removed from the product. Stop their scheduled jobs
-- while keeping the historical rows available for audit and rollback.
update public.integrations
set
  is_enabled = false,
  status = 'disconnected',
  last_error = null,
  updated_at = now()
where provider in (
  'facebook_organic', 'instagram_organic', 'tiktok_organic',
  'youtube', 'google_business'
);
