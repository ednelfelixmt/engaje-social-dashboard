-- Execute only in the pinned MediaHub Supabase project, with authorized fixture users.
-- Each block is isolated and rolls back, including on errors.
begin;
select set_config('request.jwt.claim.sub','079b2713-a99a-41a6-acc3-b129863ef7a6',true);
set local role authenticated;
do $guard$ declare n integer; begin
 update public.organizations set name=name where id='c4c77b35-03a4-417a-94c2-e845d48679c1';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'A viewer unexpectedly updated an organization'; end if;
end $guard$;
rollback;
begin;
select set_config('request.jwt.claim.sub','4fd21c94-e93d-4e35-923b-b1ec4622fd94',true);
set local role authenticated;
do $guard$ declare n integer; begin
 update public.organizations set name=name where id='10289f2d-23b9-4c86-a10e-0503bcc2de79';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'B viewer unexpectedly updated an organization'; end if;
end $guard$;
rollback;
