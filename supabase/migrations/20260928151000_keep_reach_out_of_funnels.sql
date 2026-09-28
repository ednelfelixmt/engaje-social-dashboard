-- Reach is a delivery KPI, not a sequential conversion event. Keep it in
-- dashboards, but remove it from every saved funnel configuration.
with cleaned as (
  select
    organization_id,
    coalesce(jsonb_agg(step order by position) filter (where step->>'metric' <> 'reach'), '[]'::jsonb) as steps
  from public.dashboard_configs
  cross join lateral jsonb_array_elements(funnel_steps) with ordinality as item(step, position)
  group by organization_id
)
update public.dashboard_configs as config
set funnel_steps = case
      when jsonb_array_length(cleaned.steps) between 2 and 12 then cleaned.steps
      else '[{"metric":"impressions","label":"Impressões"},{"metric":"clicks","label":"Cliques"},{"metric":"page_views","label":"Visitas"},{"metric":"leads","label":"Leads"}]'::jsonb
    end,
    enabled_metrics = case
      when 'reach' = any(config.enabled_metrics) then config.enabled_metrics
      else array_append(config.enabled_metrics, 'reach')
    end
from cleaned
where cleaned.organization_id = config.organization_id;

alter table public.dashboard_configs
  alter column enabled_metrics set default array[
    'spend','impressions','reach','frequency','clicks','ctr','cpc','leads','registration_leads','message_leads',
    'cpl','purchases','cpa','revenue','roas'
  ];

comment on column public.dashboard_configs.funnel_steps is
  'Ordered conversion events. Delivery KPIs such as reach are intentionally excluded.';
