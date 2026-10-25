-- Atomic agency administration. Additive: no customer records are changed by migration.
begin;

create table private.agency_admin_audit (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid not null,
  organization_id uuid not null,
  subject_user_id uuid,
  event text not null check(event in ('client_created','client_updated','client_funnel_updated','membership_changed','invitation_revoked')),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb
);
alter table private.agency_admin_audit enable row level security;
revoke all on private.agency_admin_audit from public,anon,authenticated,service_role;
create index agency_admin_audit_org_period on private.agency_admin_audit(organization_id,occurred_at desc,id);

create function private.validate_client_funnel(p_model text, p_steps jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_model is null or p_model !~ '^[a-z_]{2,40}$' or p_steps is null
     or jsonb_typeof(p_steps) <> 'array' then
    raise exception 'Invalid funnel' using errcode = '22023';
  end if;
  if jsonb_array_length(p_steps) not between 2 and 12 or pg_column_size(p_steps) > 16384 then
    raise exception 'Invalid funnel size' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_steps) step
    where jsonb_typeof(step) <> 'object' or jsonb_typeof(step->'metric') is distinct from 'string'
      or coalesce(step->>'metric','') !~ '^[a-z_]{2,40}$'
      or jsonb_typeof(step->'label') is distinct from 'string'
      or length(trim(step->>'label')) not between 1 and 160)
    or (select count(distinct step->>'metric') from jsonb_array_elements(p_steps) step) <> jsonb_array_length(p_steps) then
    raise exception 'Invalid funnel steps' using errcode = '22023';
  end if;
end;
$$;

create function private.create_client_organization(
  p_name text, p_slug text, p_niche text, p_sales_model text, p_funnel_model text, p_funnel_steps jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'Agency administrator required' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 160
     or p_slug is null or p_slug in ('admin','login','api','auth','_next')
     or nullif(p_niche,'') is null or nullif(p_sales_model,'') is null then
    raise exception 'Invalid client settings' using errcode = '22023';
  end if;
  perform private.validate_client_funnel(p_funnel_model,p_funnel_steps);
  insert into public.organizations(name,slug,niche,sales_model)
    values(trim(p_name),p_slug,p_niche,p_sales_model) returning id into v_id;
  -- Existing initialization trigger creates branding/config; missing config must abort creation.
  update public.dashboard_configs set funnel_model=p_funnel_model,funnel_steps=p_funnel_steps
    where organization_id=v_id;
  if not found then raise exception 'Client configuration missing' using errcode = 'P0002'; end if;
  return jsonb_build_object('id',v_id,'slug',p_slug);
end;
$$;

create function private.update_client_organization(
  p_id uuid, p_name text, p_status public.organization_status, p_niche text, p_sales_model text,
  p_timezone text, p_currency text, p_apply_funnel boolean, p_funnel_model text, p_funnel_steps jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_slug text;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'Agency administrator required' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 160 or p_apply_funnel is null
     or p_status is null or p_timezone is null
     or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
    raise exception 'Invalid client settings' using errcode = '22023';
  end if;
  if p_apply_funnel then
    if nullif(p_niche,'') is null or nullif(p_sales_model,'') is null then
      raise exception 'Funnel requires niche and sales model' using errcode = '22023';
    end if;
    perform private.validate_client_funnel(p_funnel_model,p_funnel_steps);
  end if;
  update public.organizations set name=trim(p_name),status=p_status,niche=nullif(p_niche,''),
    sales_model=nullif(p_sales_model,''),timezone=p_timezone,currency=p_currency
    where id=p_id and not is_agency returning slug into v_slug;
  if not found then raise exception 'Client not found' using errcode = 'P0002'; end if;
  if p_apply_funnel then
    update public.dashboard_configs set funnel_model=p_funnel_model,funnel_steps=p_funnel_steps
      where organization_id=p_id;
    if not found then raise exception 'Client configuration missing' using errcode = 'P0002'; end if;
  end if;
  return jsonb_build_object('id',p_id,'slug',v_slug);
end;
$$;

-- Only this operation needs definer rights: invitations and auth.users are intentionally private.
create function private.save_client_membership(p_organization_id uuid,p_user_id uuid,p_is_active boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role public.member_role; v_confirmed timestamptz; v_invitation_status text; v_revoked integer;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'Agency administrator required' using errcode = '42501';
  end if;
  if p_is_active is null then raise exception 'Active state required' using errcode = '22023'; end if;
  -- Lock order: client, target Auth identity, invitation, membership. No HTTP calls in transaction.
  perform 1 from public.organizations where id=p_organization_id and not is_agency for update;
  if not found then raise exception 'Client not found' using errcode = 'P0002'; end if;
  select email_confirmed_at into v_confirmed from auth.users where id=p_user_id for update;
  if not found then raise exception 'Auth identity not found' using errcode = '23503'; end if;
  select status into v_invitation_status from public.agency_user_invitations where user_id=p_user_id for update;
  select role into v_role from public.organization_members
    where organization_id=p_organization_id and user_id=p_user_id for update;
  if v_role='super_admin' then
    raise exception 'Protected administrator membership' using errcode = '42501';
  end if;
  if p_is_active and (v_confirmed is null or (v_invitation_status is not null and v_invitation_status <> 'accepted')) then
    raise exception 'Registration not completed' using errcode = '22023';
  end if;
  insert into public.organization_members(organization_id,user_id,role,is_active)
    values(p_organization_id,p_user_id,'viewer',p_is_active)
    on conflict(organization_id,user_id) do update set role='viewer',is_active=excluded.is_active;
  update public.client_user_invitations set status='revoked'
    where organization_id=p_organization_id and user_id=p_user_id and status='pending';
  get diagnostics v_revoked = row_count;
  return jsonb_build_object('organization_id',p_organization_id,'user_id',p_user_id,'is_active',p_is_active,'revoked_invitations',v_revoked);
end;
$$;

-- Trigger-only writer: no user can forge actor IDs or insert arbitrary audit rows.
create function private.record_client_admin_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_user uuid; v_event text; v_before jsonb; v_after jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then return new; end if;
  if tg_table_name='organizations' then
    if new.is_agency then return new; end if;
    v_org=new.id;
    v_event=case when tg_op='INSERT' then 'client_created' else 'client_updated' end;
    -- Only field names are logged for settings: no customer names, payloads or secrets.
    v_before='{}'::jsonb;
    v_after=jsonb_build_object('changed_fields',coalesce((select jsonb_agg(k.key order by k.key)
      from jsonb_each(to_jsonb(new)-'updated_at'-'created_at') k
      where tg_op='INSERT' or k.value is distinct from to_jsonb(old)->k.key),'[]'::jsonb));
    if v_after->'changed_fields'='[]'::jsonb then return new; end if;
  elsif tg_table_name='dashboard_configs' then
    v_org=new.organization_id; v_event='client_funnel_updated'; v_before='{}'::jsonb;
    v_after=jsonb_build_object('changed_fields',(select jsonb_agg(key order by key) from unnest(array['funnel_model','funnel_steps']) key where to_jsonb(new)->key is distinct from to_jsonb(old)->key));
    if v_after->'changed_fields'='null'::jsonb then return new; end if;
  elsif tg_table_name='organization_members' then
    v_org=new.organization_id; v_user=new.user_id; v_event='membership_changed';
    v_before=case when tg_op='INSERT' then '{}'::jsonb else jsonb_build_object('role',old.role,'is_active',old.is_active) end;
    v_after=jsonb_build_object('role',new.role,'is_active',new.is_active);
    if v_before=v_after then return new; end if;
  elsif tg_table_name='client_user_invitations' then
    if old.status <> 'pending' or new.status <> 'revoked' then return new; end if;
    v_org=new.organization_id; v_user=new.user_id; v_event='invitation_revoked';
    v_before=jsonb_build_object('status',old.status); v_after=jsonb_build_object('status',new.status);
  else raise exception 'Unexpected audit trigger'; end if;
  if not exists(select 1 from public.organizations where id=v_org and not is_agency) then return new; end if;
  insert into private.agency_admin_audit(actor_id,organization_id,subject_user_id,event,before_state,after_state)
    values(auth.uid(),v_org,v_user,v_event,v_before,v_after);
  return new;
end;
$$;
revoke all on function private.record_client_admin_audit() from public,anon,authenticated,service_role;
create trigger audit_client_organization after insert or update on public.organizations for each row execute function private.record_client_admin_audit();
create trigger audit_client_funnel after update on public.dashboard_configs for each row execute function private.record_client_admin_audit();
create trigger audit_client_membership after insert or update on public.organization_members for each row execute function private.record_client_admin_audit();
create trigger audit_client_invitation after update on public.client_user_invitations for each row execute function private.record_client_admin_audit();

create function private.client_admin_audit(p_organization_id uuid,p_limit integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'Agency administrator required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.organizations where id=p_organization_id and not is_agency) then
    raise exception 'Client not found' using errcode = 'P0002';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(events) order by events.occurred_at desc,events.id)
    from (select id,occurred_at,actor_id,subject_user_id,event,before_state,after_state
      from private.agency_admin_audit where organization_id=p_organization_id
      order by occurred_at desc,id limit greatest(1,least(coalesce(p_limit,50),100))) events),'[]'::jsonb);
end;
$$;
create function public.client_admin_audit(p_organization_id uuid,p_limit integer) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.client_admin_audit(p_organization_id,p_limit);
$$;
revoke all on function private.client_admin_audit(uuid,integer),public.client_admin_audit(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.client_admin_audit(uuid,integer),public.client_admin_audit(uuid,integer) to authenticated;

create function public.create_client_organization(p_name text,p_slug text,p_niche text,p_sales_model text,p_funnel_model text,p_funnel_steps jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.create_client_organization(p_name,p_slug,p_niche,p_sales_model,p_funnel_model,p_funnel_steps);
$$;
create function public.update_client_organization(p_id uuid,p_name text,p_status public.organization_status,p_niche text,p_sales_model text,p_timezone text,p_currency text,p_apply_funnel boolean,p_funnel_model text,p_funnel_steps jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.update_client_organization(p_id,p_name,p_status,p_niche,p_sales_model,p_timezone,p_currency,p_apply_funnel,p_funnel_model,p_funnel_steps);
$$;
create function public.save_client_membership(p_organization_id uuid,p_user_id uuid,p_is_active boolean)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_client_membership(p_organization_id,p_user_id,p_is_active);
$$;

revoke all on function private.validate_client_funnel(text,jsonb),private.create_client_organization(text,text,text,text,text,jsonb),private.update_client_organization(uuid,text,public.organization_status,text,text,text,text,boolean,text,jsonb),private.save_client_membership(uuid,uuid,boolean),public.create_client_organization(text,text,text,text,text,jsonb),public.update_client_organization(uuid,text,public.organization_status,text,text,text,text,boolean,text,jsonb),public.save_client_membership(uuid,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function private.validate_client_funnel(text,jsonb),private.create_client_organization(text,text,text,text,text,jsonb),private.update_client_organization(uuid,text,public.organization_status,text,text,text,text,boolean,text,jsonb),private.save_client_membership(uuid,uuid,boolean),public.create_client_organization(text,text,text,text,text,jsonb),public.update_client_organization(uuid,text,public.organization_status,text,text,text,text,boolean,text,jsonb),public.save_client_membership(uuid,uuid,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
