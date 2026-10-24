-- Synthetic-only rollback test. A SECURITY DEFINER RPC must reject viewer claims
-- with SQLSTATE 42501 before inspecting a file or attempting mutations.
begin;
select set_config('request.jwt.claim.sub','079b2713-a99a-41a6-acc3-b129863ef7a6',true);
set local role authenticated;
do $check$ begin
 begin
  perform public.import_spreadsheet('c4c77b35-03a4-417a-94c2-e845d48679c1'::uuid,'not-a-file','test.csv','synthetic','[{"metric_date":"2026-10-24","currency":"BRL","revenue":"10"}]'::jsonb);
  raise exception 'FAIL: viewer A authorized to import';
 exception when insufficient_privilege then null;
 end;
end $check$;
rollback;
begin;
select set_config('request.jwt.claim.sub','4fd21c94-e93d-4e35-923b-b1ec4622fd94',true);
set local role authenticated;
do $check$ begin
 begin
  perform public.import_spreadsheet('10289f2d-23b9-4c86-a10e-0503bcc2de79'::uuid,'not-a-file','test.csv','synthetic','[{"metric_date":"2026-10-24","currency":"BRL","revenue":"10"}]'::jsonb);
  raise exception 'FAIL: viewer B authorized to import';
 exception when insufficient_privilege then null;
 end;
end $check$;
rollback;
