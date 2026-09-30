-- Nicho e modelo de vendas informados no cadastro do cliente (definem o funil inicial).
alter table public.organizations
  add column if not exists niche text check (niche is null or niche ~ '^[a-z_]{2,40}$'),
  add column if not exists sales_model text check (sales_model is null or sales_model ~ '^[a-z_]{2,40}$');
