-- Fase 02: non-destructive catalog gate for privileged RPCs.
-- Expected: three public RPC wrappers; their private implementations must be
-- SECURITY DEFINER and contain a superadmin check.
-- This script does not execute the functions or mutate production data.
with expected(name) as (
 values ('delete_client_organization'),('disconnect_client_organization'),('import_spreadsheet')
), inspection as (
 select e.name,
        p.oid is not null as exists_in_private,
        coalesce(p.prosecdef,false) as security_definer,
        coalesce(pg_get_functiondef(p.oid) like '%private.is_super_admin()%',false) as admin_guard,
        exists(select 1 from pg_proc w join pg_namespace wn on wn.oid=w.pronamespace
          where wn.nspname='public' and w.proname=e.name) as public_wrapper
 from expected e
 left join pg_namespace n on n.nspname='private'
 left join pg_proc p on p.pronamespace=n.oid and p.proname=e.name
)
select name,exists_in_private,security_definer,admin_guard,public_wrapper,
 (exists_in_private and security_definer and admin_guard and public_wrapper) as passed
from inspection order by name;
