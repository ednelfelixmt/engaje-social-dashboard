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
commit;
