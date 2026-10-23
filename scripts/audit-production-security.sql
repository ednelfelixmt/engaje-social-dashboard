-- MediaHub Phase 02 — read-only authorization inventory for the existing Supabase project.
-- No writes, grants, policy updates, role switching, or user impersonation.
-- Structural catalog inspection does NOT certify cross-tenant behavior.
with public_tables as (
 select c.oid,c.relname,c.relrowsecurity
 from pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r'
), unprotected as (
 select relname from public_tables where not relrowsecurity
), guarded_tables as (
 select t.relname,t.relrowsecurity,
        pg_catalog.has_table_privilege('anon',t.oid,'SELECT') as anon_select,
        pg_catalog.has_table_privilege('authenticated',t.oid,'SELECT') as authenticated_select,
        pg_catalog.has_table_privilege('authenticated',t.oid,'INSERT') as authenticated_insert
 from public_tables t where t.relname in
 ('agency_user_invitations','client_user_invitations','integration_ingest_keys')
), destructive_rpc as (
 select p.oid,p.prosecdef,
        pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
        pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
 from pg_catalog.pg_proc p
 join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='disconnect_integration'
   and pg_catalog.pg_get_function_identity_arguments(p.oid)='p_organization_id uuid, p_integration_id uuid'
)
select 'public_rls' as control,
       (select count(*)=0 from unprotected) as passed,
       (select count(*) from public_tables)::text as detail
union all
select 'sensitive_direct_grants',
       (select count(*)=3 and coalesce(bool_and(relrowsecurity and not anon_select and not authenticated_select and not authenticated_insert),false) from guarded_tables),
       (select count(*) from guarded_tables)::text
union all
select 'destructive_rpc_access',
       (select count(*)=1 and coalesce(bool_and(prosecdef and not anon_execute and not authenticated_execute),false) from destructive_rpc),
       (select count(*) from destructive_rpc)::text;
