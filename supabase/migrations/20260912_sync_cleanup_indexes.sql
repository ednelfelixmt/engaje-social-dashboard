create or replace function public.cleanup_stale_sync_before_insert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.close_stale_sync_runs(interval '15 minutes');
  return new;
end;
$$;

drop trigger if exists trg_cleanup_stale_sync_before_insert on public.sync_log;
create trigger trg_cleanup_stale_sync_before_insert
before insert on public.sync_log
for each statement execute function public.cleanup_stale_sync_before_insert();

create index if not exists idx_posts_client_platform_published on public.posts(client_id,platform,published_at desc);
create index if not exists idx_post_metrics_post_synced on public.post_metrics(post_id,synced_at desc);
create index if not exists idx_account_snapshots_client_date on public.account_snapshots(client_id,snapshot_date desc);
create index if not exists idx_meta_ad_metrics_client_date on public.meta_ad_metrics(client_id,date_start desc);
create index if not exists idx_meta_assets_client_type on public.meta_assets(client_id,asset_type);
