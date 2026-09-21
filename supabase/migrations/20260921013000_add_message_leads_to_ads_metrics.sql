alter table public.metrics_ads
  add column if not exists message_leads bigint check (message_leads >= 0);

drop view if exists public.daily_performance;

create view public.daily_performance with (security_invoker=true) as
with ads as (
  select organization_id,metric_date,currency,sum(spend) as spend,
    case when count(revenue)=count(*) then sum(revenue) end as ad_revenue,
    case when count(purchases)=count(*) then sum(purchases) end as ad_purchases,
    case when count(impressions)=count(*) then sum(impressions) end as impressions,
    case when count(clicks)=count(*) then sum(clicks) end as clicks,
    case when count(page_views)=count(*) then sum(page_views) end as page_views,
    case when count(leads)=count(*) then sum(leads) end as ad_leads,
    case when count(message_leads)=count(*) then sum(message_leads) end as message_leads,
    case when count(checkouts)=count(*) then sum(checkouts) end as ad_checkouts,
    max(synced_at) as ads_synced_at
  from public.metrics_ads group by organization_id,metric_date,currency
), actual_candidates as (
  select m.organization_id,m.metric_date,m.currency,m.source,
    sum(m.revenue) as real_revenue,
    case when count(m.purchases)=count(*) then sum(m.purchases) end as real_purchases,
    case when count(m.leads)=count(*) then sum(m.leads) end as real_leads,
    case when count(m.checkouts)=count(*) then sum(m.checkouts) end as real_checkouts,
    max(m.synced_at) as real_synced_at,
    row_number() over (partition by m.organization_id,m.metric_date,m.currency order by
      (m.source=coalesce(c.preferred_revenue_source,'crm'::public.revenue_source)) desc,m.source) as priority
  from public.metrics_crm m left join public.dashboard_configs c using (organization_id)
  group by m.organization_id,m.metric_date,m.currency,m.source,c.preferred_revenue_source
  having bool_and(m.is_complete) and count(m.revenue)=count(*)
), actual as (select * from actual_candidates where priority=1), totals as (
  select coalesce(a.organization_id,r.organization_id) as organization_id,
    coalesce(a.metric_date,r.metric_date) as metric_date,coalesce(a.currency,r.currency) as currency,
    coalesce(a.spend,0::numeric) as spend,a.ad_revenue,r.real_revenue,
    coalesce(r.real_revenue,a.ad_revenue) as revenue,
    case when r.organization_id is not null then r.source::text when a.ad_revenue is not null then 'ads' else 'unavailable' end as revenue_source,
    case when r.organization_id is not null then r.real_purchases else a.ad_purchases end as purchases,
    a.impressions,a.clicks,a.page_views,a.message_leads,
    case when r.organization_id is not null then r.real_leads else a.ad_leads end as leads,
    case when r.organization_id is not null then r.real_checkouts else a.ad_checkouts end as checkouts,
    a.ads_synced_at,r.real_synced_at
  from ads a full outer join actual r using (organization_id,metric_date,currency)
)
select *, revenue/nullif(spend,0) as roas,
  (revenue-spend)/nullif(spend,0)*100 as roi,
  spend/nullif(purchases,0) as cpa,
  clicks::numeric/nullif(impressions,0)*100 as ctr
from totals;

revoke all on public.daily_performance from public,anon,authenticated;
grant select on public.daily_performance to authenticated,service_role;
