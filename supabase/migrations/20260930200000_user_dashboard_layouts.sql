begin;
-- Personalização do dashboard por usuário e layout padrão por cliente.
create table if not exists public.user_dashboard_layouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope text not null check (scope ~ '^[a-z0-9_-]{1,40}$'),
  layout jsonb not null check (jsonb_typeof(layout) = 'object' and pg_column_size(layout) <= 16384),
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id, scope)
);
create index if not exists user_dashboard_layouts_org on public.user_dashboard_layouts(organization_id);
alter table public.user_dashboard_layouts enable row level security;
revoke all on public.user_dashboard_layouts from anon, authenticated;
grant all on public.user_dashboard_layouts to service_role;
grant select, insert, update, delete on public.user_dashboard_layouts to authenticated;
drop policy if exists own_layout_select on public.user_dashboard_layouts;
drop policy if exists own_layout_insert on public.user_dashboard_layouts;
drop policy if exists own_layout_update on public.user_dashboard_layouts;
drop policy if exists own_layout_delete on public.user_dashboard_layouts;
create policy own_layout_select on public.user_dashboard_layouts for select to authenticated
  using (user_id = (select auth.uid()) and private.user_belongs_to_org(organization_id));
create policy own_layout_insert on public.user_dashboard_layouts for insert to authenticated
  with check (user_id = (select auth.uid()) and private.user_belongs_to_org(organization_id));
create policy own_layout_update on public.user_dashboard_layouts for update to authenticated
  using (user_id = (select auth.uid()) and private.user_belongs_to_org(organization_id))
  with check (user_id = (select auth.uid()) and private.user_belongs_to_org(organization_id));
create policy own_layout_delete on public.user_dashboard_layouts for delete to authenticated
  using (user_id = (select auth.uid()));
drop trigger if exists touch_updated_at on public.user_dashboard_layouts;
create trigger touch_updated_at before update on public.user_dashboard_layouts
  for each row execute function private.touch_updated_at();

alter table public.dashboard_configs
  add column if not exists default_layouts jsonb not null default '{}'::jsonb
  check (jsonb_typeof(default_layouts) = 'object' and pg_column_size(default_layouts) <= 65536);
commit;
