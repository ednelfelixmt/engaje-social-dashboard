-- Invites are administrative records. Never expose invitations via anon/authenticated data API.
create table if not exists public.client_user_invitations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 email text not null,
 role text not null check (role in ('viewer','editor','client_admin')),
 status text not null default 'pending' check(status in ('pending','accepted','revoked','expired')),
 invited_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '7 days'),
 accepted_at timestamptz,
 unique (organization_id,user_id)
);
alter table public.client_user_invitations enable row level security;
revoke all on public.client_user_invitations from anon,authenticated;
create index if not exists idx_client_user_invitations_user_status on public.client_user_invitations(user_id,status);
