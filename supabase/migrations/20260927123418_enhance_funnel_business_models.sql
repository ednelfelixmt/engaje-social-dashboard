alter table public.dashboard_configs
  drop constraint if exists dashboard_configs_funnel_model_check;

alter table public.dashboard_configs
  add constraint dashboard_configs_funnel_model_check
  check (funnel_model in ('lead_generation','messages','ecommerce','local_business','inside_sales','appointments','custom'));
