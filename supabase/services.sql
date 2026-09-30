begin;
create function private.import_spreadsheet(p_organization_id uuid,p_file_path text,p_file_name text,p_sha256 text,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare upload_id uuid; n integer;
begin
 if auth.uid() is null or not private.has_org_role(p_organization_id,array['client_admin','editor']::public.member_role[]) then raise exception 'Sem permissão' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 10000 then raise exception 'Lote inválido';end if;
 if not exists(select 1 from storage.objects where bucket_id='spreadsheets' and name=p_file_path and name like p_organization_id::text||'/%') then raise exception 'Arquivo inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,0));
 if exists(select 1 from public.spreadsheet_uploads where organization_id=p_organization_id and sha256=p_sha256) then raise exception 'Arquivo já importado'; end if;
 n=jsonb_array_length(p_rows);
 insert into public.spreadsheet_uploads(organization_id,uploaded_by,file_path,file_name,sha256,status,rows_received) values(p_organization_id,auth.uid(),p_file_path,p_file_name,p_sha256,'processing',n) returning id into upload_id;
 -- Retira o lote diário anterior por completo, dentro da mesma transação.
 delete from public.metrics_crm m where m.organization_id=p_organization_id and m.source='spreadsheet' and exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'metric_date')::date=m.metric_date and r->>'currency'=m.currency);
 insert into public.metrics_crm(organization_id,spreadsheet_upload_id,source,metric_date,currency,channel,account_id,campaign_id,revenue,purchases,leads,checkouts,is_complete)
 select p_organization_id,upload_id,'spreadsheet',(r->>'metric_date')::date,r->>'currency',coalesce(nullif(r->>'channel',''),'unattributed'),coalesce(r->>'account_id',''),coalesce(r->>'campaign_id',''),(r->>'revenue')::numeric,nullif(r->>'purchases','')::bigint,nullif(r->>'leads','')::bigint,nullif(r->>'checkouts','')::bigint,true from jsonb_array_elements(p_rows) r;
 if exists(select 1 from public.metrics_crm where spreadsheet_upload_id=upload_id and revenue is null) then raise exception 'Receita obrigatória';end if;
 update public.spreadsheet_uploads set status='completed',rows_imported=n,processed_at=now() where id=upload_id;
 return jsonb_build_object('id',upload_id,'rows',n);
end $$;
revoke all on function private.import_spreadsheet(uuid,text,text,text,jsonb) from public,anon;
grant execute on function private.import_spreadsheet(uuid,text,text,text,jsonb) to authenticated;
create function public.import_spreadsheet(p_organization_id uuid,p_file_path text,p_file_name text,p_sha256 text,p_rows jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.import_spreadsheet(p_organization_id,p_file_path,p_file_name,p_sha256,p_rows);$$;
revoke all on function public.import_spreadsheet(uuid,text,text,text,jsonb) from public,anon;
grant execute on function public.import_spreadsheet(uuid,text,text,text,jsonb) to authenticated;
-- Somente projeção pública do branding; não retorna usuários, métricas ou integração.
create function private.login_branding(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',b.platform_name,'logo',b.logo_path,'favicon',b.favicon_path,'background',b.login_background_path,'color',b.login_background_color,'primary',b.primary_color)
 from public.branding b join public.organizations o on o.id=b.organization_id where o.slug=p_slug and o.status='active';
$$;
revoke all on function private.login_branding(text) from public;
grant usage on schema private to anon;
grant execute on function private.login_branding(text) to anon,authenticated;
create function public.login_branding(p_slug text) returns jsonb language sql stable security invoker set search_path='' as $$select private.login_branding(p_slug);$$;
revoke all on function public.login_branding(text) from public;
grant execute on function public.login_branding(text) to anon,authenticated;
create function private.is_login_asset(p_path text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.branding b join public.organizations o on o.id=b.organization_id where o.status='active' and p_path in (b.logo_path,b.favicon_path,b.login_background_path));$$;
revoke all on function private.is_login_asset(text) from public;
grant execute on function private.is_login_asset(text) to anon,authenticated;
create policy engaje_login_assets on storage.objects for select to anon,authenticated using(bucket_id='branding' and private.is_login_asset(name));
-- Hash da chave de ingestão fora de integrations.config (legível pelos usuários do cliente).
create table if not exists public.integration_ingest_keys (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  rotated_at timestamptz not null default now()
);
alter table public.integration_ingest_keys enable row level security;
revoke all on public.integration_ingest_keys from anon, authenticated;
grant all on public.integration_ingest_keys to service_role;
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
