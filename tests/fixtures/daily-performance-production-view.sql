-- Definition only, captured from PostgreSQL catalog on 25/10/2026. No customer records.
 WITH ads AS (
         SELECT metrics_ads.organization_id,
            metrics_ads.metric_date,
            metrics_ads.currency,
            sum(metrics_ads.spend) AS spend,
                CASE
                    WHEN count(metrics_ads.revenue) = count(*) THEN sum(metrics_ads.revenue)
                    ELSE NULL::numeric
                END AS ad_revenue,
                CASE
                    WHEN count(metrics_ads.purchases) = count(*) THEN sum(metrics_ads.purchases)
                    ELSE NULL::numeric
                END AS ad_purchases,
                CASE
                    WHEN count(metrics_ads.impressions) = count(*) THEN sum(metrics_ads.impressions)
                    ELSE NULL::numeric
                END AS impressions,
                CASE
                    WHEN count(metrics_ads.clicks) = count(*) THEN sum(metrics_ads.clicks)
                    ELSE NULL::numeric
                END AS clicks,
                CASE
                    WHEN count(metrics_ads.page_views) = count(*) THEN sum(metrics_ads.page_views)
                    ELSE NULL::numeric
                END AS page_views,
                CASE
                    WHEN count(metrics_ads.leads) = count(*) THEN sum(metrics_ads.leads)
                    ELSE NULL::numeric
                END AS ad_leads,
                CASE
                    WHEN count(metrics_ads.message_leads) = count(*) THEN sum(metrics_ads.message_leads)
                    ELSE NULL::numeric
                END AS message_leads,
                CASE
                    WHEN count(metrics_ads.checkouts) = count(*) THEN sum(metrics_ads.checkouts)
                    ELSE NULL::numeric
                END AS ad_checkouts,
            max(metrics_ads.synced_at) AS ads_synced_at
           FROM metrics_ads
          GROUP BY metrics_ads.organization_id, metrics_ads.metric_date, metrics_ads.currency
        ), actual_candidates AS (
         SELECT m.organization_id,
            m.metric_date,
            m.currency,
            m.source,
            sum(m.revenue) AS real_revenue,
                CASE
                    WHEN count(m.purchases) = count(*) THEN sum(m.purchases)
                    ELSE NULL::numeric
                END AS real_purchases,
                CASE
                    WHEN count(m.leads) = count(*) THEN sum(m.leads)
                    ELSE NULL::numeric
                END AS real_leads,
                CASE
                    WHEN count(m.checkouts) = count(*) THEN sum(m.checkouts)
                    ELSE NULL::numeric
                END AS real_checkouts,
            max(m.synced_at) AS real_synced_at,
            row_number() OVER (PARTITION BY m.organization_id, m.metric_date, m.currency ORDER BY (m.source = c.preferred_revenue_source) DESC, m.source) AS priority
           FROM metrics_crm m
             JOIN dashboard_configs c USING (organization_id)
          WHERE c.revenue_enabled
          GROUP BY m.organization_id, m.metric_date, m.currency, m.source, c.preferred_revenue_source
         HAVING bool_and(m.is_complete) AND count(m.revenue) = count(*)
        ), actual AS (
         SELECT actual_candidates.organization_id,
            actual_candidates.metric_date,
            actual_candidates.currency,
            actual_candidates.source,
            actual_candidates.real_revenue,
            actual_candidates.real_purchases,
            actual_candidates.real_leads,
            actual_candidates.real_checkouts,
            actual_candidates.real_synced_at,
            actual_candidates.priority
           FROM actual_candidates
          WHERE actual_candidates.priority = 1
        ), totals AS (
         SELECT COALESCE(a.organization_id, r.organization_id) AS organization_id,
            COALESCE(a.metric_date, r.metric_date) AS metric_date,
            COALESCE(a.currency, r.currency) AS currency,
            COALESCE(a.spend, 0::numeric) AS spend,
            a.ad_revenue,
            r.real_revenue,
            r.real_revenue AS revenue,
                CASE
                    WHEN r.organization_id IS NOT NULL THEN r.source::text
                    ELSE 'unavailable'::text
                END AS revenue_source,
                CASE
                    WHEN r.organization_id IS NOT NULL THEN r.real_purchases
                    ELSE a.ad_purchases
                END AS purchases,
            a.impressions,
            a.clicks,
            a.page_views,
            a.message_leads,
                CASE
                    WHEN r.organization_id IS NOT NULL THEN r.real_leads
                    ELSE a.ad_leads
                END AS leads,
                CASE
                    WHEN r.organization_id IS NOT NULL THEN r.real_checkouts
                    ELSE a.ad_checkouts
                END AS checkouts,
            a.ads_synced_at,
            r.real_synced_at
           FROM ads a
             FULL JOIN actual r USING (organization_id, metric_date, currency)
        )
 SELECT organization_id,
    metric_date,
    currency,
    spend,
    ad_revenue,
    real_revenue,
    revenue,
    revenue_source,
    purchases,
    impressions,
    clicks,
    page_views,
    message_leads,
    leads,
    checkouts,
    ads_synced_at,
    real_synced_at,
    revenue / NULLIF(spend, 0::numeric) AS roas,
    (revenue - spend) / NULLIF(spend, 0::numeric) * 100::numeric AS roi,
    spend / NULLIF(purchases, 0::numeric) AS cpa,
    clicks / NULLIF(impressions, 0::numeric) * 100::numeric AS ctr
   FROM totals;
