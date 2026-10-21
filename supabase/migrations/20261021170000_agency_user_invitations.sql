-- Invitations are global to the agency; tenant permissions are configured separately.
create table if not exists public.agency_user_invitations(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 email text not null,
 status text not null default 'pending' check(status in ('pending','accepted','revoked','expired')),
 invited_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '7 days'),
 accepted_at timestamptz
);
alter table public.agency_user_invitations enable row level security;
revoke all on public.agency_user_invitations from anon,authenticated;
create index if not exists agency_user_invitations_status_idx on public.agency_user_invitations(status,invited_at desc);
