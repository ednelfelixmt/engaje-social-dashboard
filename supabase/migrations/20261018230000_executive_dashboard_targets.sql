alter table public.dashboard_configs
  add column if not exists target_spend numeric check (target_spend is null or target_spend >= 0),
  add column if not exists target_leads numeric check (target_leads is null or target_leads >= 0),
  add column if not exists target_cpl numeric check (target_cpl is null or target_cpl >= 0),
  add column if not exists target_ctr numeric check (target_ctr is null or target_ctr >= 0),
  add column if not exists target_frequency numeric check (target_frequency is null or target_frequency >= 0);

comment on column public.dashboard_configs.target_spend is 'Meta de investimento para o período usada no pacing executivo.';
comment on column public.dashboard_configs.target_leads is 'Meta de leads para o período.';
comment on column public.dashboard_configs.target_cpl is 'CPL máximo desejado.';
comment on column public.dashboard_configs.target_ctr is 'CTR mínimo desejado em percentual.';
comment on column public.dashboard_configs.target_frequency is 'Frequência máxima desejada.';
