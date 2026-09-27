alter table public.dashboard_configs
  drop constraint if exists dashboard_configs_funnel_steps_check;

alter table public.dashboard_configs
  add constraint dashboard_configs_funnel_steps_check
  check (jsonb_typeof(funnel_steps) = 'array' and jsonb_array_length(funnel_steps) between 2 and 12);
