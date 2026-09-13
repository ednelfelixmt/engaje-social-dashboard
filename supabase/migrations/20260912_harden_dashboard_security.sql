drop policy if exists temp_anon_insert_posts on public.posts;
drop policy if exists temp_anon_insert_metrics on public.post_metrics;
drop policy if exists temp_anon_insert_snapshots on public.account_snapshots;

create or replace function public.protect_user_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and old.role <> 'super_admin'::user_role then
    if new.role is distinct from old.role
       or new.client_id is distinct from old.client_id
       or new.is_active is distinct from old.is_active then
      raise exception 'Sensitive profile fields cannot be changed by the profile owner';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_profile_sensitive_fields on public.user_profiles;
create trigger trg_protect_user_profile_sensitive_fields
before update on public.user_profiles
for each row execute function public.protect_user_profile_sensitive_fields();

create or replace function public.close_stale_sync_runs(max_age interval default interval '15 minutes')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.sync_log
     set status='error',
         finished_at=now(),
         error_message=coalesce(error_message,'Sincronização encerrada automaticamente por timeout.')
   where status='running'
     and started_at < now() - max_age;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.close_stale_sync_runs(interval) from public;
grant execute on function public.close_stale_sync_runs(interval) to service_role;
