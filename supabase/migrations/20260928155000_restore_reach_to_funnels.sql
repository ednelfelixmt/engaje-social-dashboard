-- Reach is a valid delivery stage and must remain selectable in every funnel.
-- Restore it immediately after impressions in saved campaign funnels.
with rebuilt as (
  select
    config.organization_id,
    jsonb_agg(expanded.step order by expanded.position, expanded.sub_position) as steps
  from public.dashboard_configs as config
  cross join lateral jsonb_array_elements(config.funnel_steps) with ordinality as item(step, position)
  cross join lateral (
    select item.step, 1 as sub_position
    union all
    select '{"metric":"reach","label":"Alcance"}'::jsonb, 2
    where item.step->>'metric' = 'impressions'
      and not exists (
        select 1
        from jsonb_array_elements(config.funnel_steps) as existing(step)
        where existing.step->>'metric' = 'reach'
      )
  ) as expanded
  group by config.organization_id
)
update public.dashboard_configs as config
set funnel_steps = rebuilt.steps
from rebuilt
where rebuilt.organization_id = config.organization_id;

comment on column public.dashboard_configs.funnel_steps is
  'Ordered campaign and conversion stages, including delivery metrics such as impressions and reach.';
