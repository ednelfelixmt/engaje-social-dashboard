-- Read-only RLS regression; pinned synthetic organizations only.
-- Must be run in authorized Supabase SQL environment. No persistent mutations.
begin;
select set_config('request.jwt.claim.sub','079b2713-a99a-41a6-acc3-b129863ef7a6',true);
set local role authenticated;
do $audit$ declare own_rows bigint; foreign_rows bigint; begin
 select count(*) into own_rows from public.organizations where id='c4c77b35-03a4-417a-94c2-e845d48679c1';
 select (select count(*) from public.organizations where id='10289f2d-23b9-4c86-a10e-0503bcc2de79')+
 (select count(*) from public.organization_members where organization_id='10289f2d-23b9-4c86-a10e-0503bcc2de79')+
 (select count(*) from public.dashboard_configs where organization_id='10289f2d-23b9-4c86-a10e-0503bcc2de79')+
 (select count(*) from public.branding where organization_id='10289f2d-23b9-4c86-a10e-0503bcc2de79')+
 (select count(*) from public.client_asset_assignments where organization_id='10289f2d-23b9-4c86-a10e-0503bcc2de79')+
 (select count(*) from public.platform_connections where target_organization_id='10289f2d-23b9-4c86-a10e-0503bcc2de79')+
 (select count(*) from public.metrics_ads where organization_id='10289f2d-23b9-4c86-a10e-0503bcc2de79') into foreign_rows;
 if own_rows<>1 or foreign_rows<>0 then raise exception 'A cross-tenant RLS breach or own org inaccessible'; end if;
end $audit$;
rollback;
begin;
select set_config('request.jwt.claim.sub','4fd21c94-e93d-4e35-923b-b1ec4622fd94',true);
set local role authenticated;
do $audit$ declare own_rows bigint; foreign_rows bigint; begin
 select count(*) into own_rows from public.organizations where id='10289f2d-23b9-4c86-a10e-0503bcc2de79';
 select (select count(*) from public.organizations where id='c4c77b35-03a4-417a-94c2-e845d48679c1')+
 (select count(*) from public.organization_members where organization_id='c4c77b35-03a4-417a-94c2-e845d48679c1')+
 (select count(*) from public.dashboard_configs where organization_id='c4c77b35-03a4-417a-94c2-e845d48679c1')+
 (select count(*) from public.branding where organization_id='c4c77b35-03a4-417a-94c2-e845d48679c1')+
 (select count(*) from public.client_asset_assignments where organization_id='c4c77b35-03a4-417a-94c2-e845d48679c1')+
 (select count(*) from public.platform_connections where target_organization_id='c4c77b35-03a4-417a-94c2-e845d48679c1')+
 (select count(*) from public.metrics_ads where organization_id='c4c77b35-03a4-417a-94c2-e845d48679c1') into foreign_rows;
 if own_rows<>1 or foreign_rows<>0 then raise exception 'B cross-tenant RLS breach or own org inaccessible'; end if;
end $audit$;
rollback;
