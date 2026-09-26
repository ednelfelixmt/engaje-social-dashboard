alter table public.dashboard_configs
  add column funnel_model text not null default 'custom'
    check (funnel_model in ('lead_generation','messages','ecommerce','local_business','custom')),
  add column funnel_steps jsonb not null default '[
    {"metric":"impressions","label":"Impressões"},
    {"metric":"clicks","label":"Cliques"},
    {"metric":"page_views","label":"Visitas"},
    {"metric":"leads","label":"Leads"},
    {"metric":"checkouts","label":"Checkouts"},
    {"metric":"purchases","label":"Compras"}
  ]'::jsonb
    check (jsonb_typeof(funnel_steps) = 'array' and jsonb_array_length(funnel_steps) between 2 and 8);
