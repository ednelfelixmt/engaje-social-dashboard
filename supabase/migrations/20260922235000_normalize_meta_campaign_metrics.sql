-- Meta uses the account ID with `act_` in account endpoints and without it in
-- Insights rows. Store one canonical form so catalog and performance records
-- describe the same campaign.
update public.ad_campaigns
set account_id = regexp_replace(account_id, '^act_', '')
where platform = 'meta_ads'
  and account_id like 'act\_%' escape '\';

update public.creatives
set account_id = regexp_replace(account_id, '^act_', '')
where platform = 'meta_ads'
  and account_id like 'act\_%' escape '\';

-- The Insights API omits the actions array when every requested action is
-- zero. Legacy native-Meta rows stored that omission as NULL, causing a single
-- zero-action ad to erase the aggregate for its entire campaign.
update public.metrics_ads as metric
set page_views = coalesce(metric.page_views, 0),
    leads = coalesce(metric.leads, 0),
    message_leads = coalesce(metric.message_leads, 0),
    checkouts = coalesce(metric.checkouts, 0),
    purchases = coalesce(metric.purchases, 0)
from public.integrations as integration
where integration.id = metric.integration_id
  and integration.provider = 'meta_ads'
  and metric.platform = 'meta_ads'
  and (
    metric.page_views is null
    or metric.leads is null
    or metric.message_leads is null
    or metric.checkouts is null
    or metric.purchases is null
  );
