-- Preserve each installation's revenue policy, columns, grants and tenant RLS.
-- Advertising spend is not the full financial cost basis required for ROI.
begin;
do $$
declare v_definition text; v_matches integer;
  v_legacy_pattern constant text := '(?n)^ *[(]revenue - spend[)] / NULLIF[(]spend, 0::numeric[)] [*] 100::numeric AS roi,$';
begin
  v_definition := pg_get_viewdef('public.daily_performance'::regclass,true);
  select count(*) into v_matches from regexp_matches(v_definition,v_legacy_pattern,'g');
  if v_matches=1 then
    v_definition := regexp_replace(v_definition,v_legacy_pattern,'    NULL::numeric AS roi,');
    execute 'create or replace view public.daily_performance with (security_invoker=true) as ' || v_definition;
  elsif v_matches<>0 or v_definition !~ '(?n)^ *NULL::numeric AS roi,$' then
    raise exception 'Unexpected daily_performance ROI definition; review before migrating';
  end if;
end;
$$;
alter view public.daily_performance set (security_invoker=true);
comment on column public.daily_performance.roi is 'Unavailable until an authorized complete financial cost basis is integrated. Ad spend alone is not ROI.';
notify pgrst, 'reload schema';
commit;
