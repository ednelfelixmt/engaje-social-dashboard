begin;
create extension if not exists pg_cron with schema pg_catalog;
create table public.integration_alerts (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 integration_id uuid references public.integrations(id) on delete set null,connection_id uuid references public.platform_connections(id) on delete set null,
 sync_job_id uuid references public.sync_jobs(id) on delete set null,alert_key text not null unique,
 code text not null check(code in ('integration_status','connection_status','stale_sync','sync_failed')),
 severity text not null check(severity in ('warning','critical')),status text not null default 'open' check(status in ('open','resolved')),
 title text not null,detail text,detected_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),resolved_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index integration_alerts_org_status on public.integration_alerts(organization_id,status,last_seen_at desc);
create index integration_alerts_integration on public.integration_alerts(integration_id);
create index integration_alerts_connection on public.integration_alerts(connection_id);
create index integration_alerts_sync_job on public.integration_alerts(sync_job_id);
alter table public.integration_alerts enable row level security;
revoke all on public.integration_alerts from anon,authenticated;
grant all on public.integration_alerts to service_role;
grant select on public.integration_alerts to authenticated;
create trigger touch_updated_at before update on public.integration_alerts for each row execute function private.touch_updated_at();
create policy integration_alert_read on public.integration_alerts for select to authenticated using(private.user_belongs_to_org(organization_id));

create function private.monitor_integration_health() returns integer language plpgsql security invoker set search_path='' as $$
declare open_count integer;
begin
 update public.sync_jobs set status='failed',completed_at=now(),error_summary='Sincronização interrompida por tempo excedido.' where status='running' and started_at<now()-interval '30 minutes';
 insert into public.integration_alerts(organization_id,integration_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
 select i.organization_id,i.id,'integration:'||i.id||':status','integration_status','critical','open',i.account_name||' exige atenção',coalesce(i.last_error,'A integração está com status '||i.status::text),now(),null from public.integrations i where i.status in ('error','expired')
 on conflict(alert_key) do update set severity=excluded.severity,status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;
 insert into public.integration_alerts(organization_id,integration_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
 select i.organization_id,i.id,'integration:'||i.id||':stale','stale_sync','warning','open',i.account_name||' está sem atualização','Última sincronização há mais de 24 horas.',now(),null from public.integrations i where i.is_enabled and i.status in ('connected','syncing') and coalesce(i.last_synced_at,i.created_at)<now()-interval '24 hours'
 on conflict(alert_key) do update set status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;
 insert into public.integration_alerts(organization_id,connection_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
 select coalesce(c.target_organization_id,c.agency_organization_id),c.id,'connection:'||c.id||':status','connection_status','critical','open',c.account_name||' perdeu a conexão',coalesce(c.last_error,'A autenticação precisa ser renovada.'),now(),null from public.platform_connections c where c.status in ('error','expired')
 on conflict(alert_key) do update set status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;
 insert into public.integration_alerts(organization_id,sync_job_id,alert_key,code,severity,status,title,detail,last_seen_at,resolved_at)
 select j.organization_id,j.id,'sync-job:'||j.id||':failed','sync_failed','critical','open','Falha na sincronização',coalesce(j.error_summary,'A tarefa não foi concluída.'),now(),null from public.sync_jobs j where j.status='failed' and j.created_at>now()-interval '7 days'
 on conflict(alert_key) do update set status='open',title=excluded.title,detail=excluded.detail,last_seen_at=now(),resolved_at=null;
 update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now() where a.status='open' and a.code='integration_status' and not exists(select 1 from public.integrations i where i.id=a.integration_id and i.status in ('error','expired'));
 update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now() where a.status='open' and a.code='stale_sync' and not exists(select 1 from public.integrations i where i.id=a.integration_id and i.is_enabled and i.status in ('connected','syncing') and coalesce(i.last_synced_at,i.created_at)<now()-interval '24 hours');
 update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now() where a.status='open' and a.code='connection_status' and not exists(select 1 from public.platform_connections c where c.id=a.connection_id and c.status in ('error','expired'));
 update public.integration_alerts a set status='resolved',resolved_at=now(),updated_at=now() where a.status='open' and a.code='sync_failed' and exists(select 1 from public.sync_jobs failed join public.sync_jobs recovered on recovered.assignment_id=failed.assignment_id and recovered.status='completed' and recovered.completed_at>failed.completed_at where failed.id=a.sync_job_id);
 select count(*) into open_count from public.integration_alerts where status='open';return open_count;
end;$$;
revoke all on function private.monitor_integration_health() from public,anon,authenticated;
grant execute on function private.monitor_integration_health() to service_role;
select private.monitor_integration_health();
select cron.unschedule(jobid) from cron.job where jobname='monitor-integration-health';
select cron.schedule('monitor-integration-health','*/15 * * * *',$$select private.monitor_integration_health();$$);
commit;
