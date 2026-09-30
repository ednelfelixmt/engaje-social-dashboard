-- Novos modelos de funil por tipo de negócio (imobiliária, clínica, escola, delivery, infoprodutos).
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.dashboard_configs'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%funnel_model%';
  if c is not null then execute format('alter table public.dashboard_configs drop constraint %I', c); end if;
end $$;
alter table public.dashboard_configs add constraint dashboard_configs_funnel_model_check
  check (funnel_model in ('lead_generation','messages','ecommerce','local_business','inside_sales','appointments','real_estate','clinic','education','delivery','infoproduct','custom'));
