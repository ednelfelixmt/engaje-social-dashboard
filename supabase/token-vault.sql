begin;
create function private.store_integration_token(p_id uuid,p_token text) returns void language plpgsql security definer set search_path='' as $$
declare secret_id uuid;
begin
 select credential_secret_id into secret_id from public.integrations where id=p_id for update;
 if not found then raise exception 'Integração inexistente';end if;
 if secret_id is null then select vault.create_secret(p_token) into secret_id;update public.integrations set credential_secret_id=secret_id where id=p_id;
 else perform vault.update_secret(secret_id,p_token);end if;
end;$$;
create function private.integration_token(p_id uuid) returns text language sql security definer set search_path='' as $$select s.decrypted_secret from vault.decrypted_secrets s join public.integrations i on i.credential_secret_id=s.id where i.id=p_id;$$;
revoke all on function private.store_integration_token(uuid,text),private.integration_token(uuid) from public,anon,authenticated;
grant execute on function private.store_integration_token(uuid,text),private.integration_token(uuid) to service_role;
create function public.store_integration_token(p_id uuid,p_token text) returns void language sql security invoker set search_path='' as $$select private.store_integration_token(p_id,p_token);$$;
create function public.integration_token(p_id uuid) returns text language sql security invoker set search_path='' as $$select private.integration_token(p_id);$$;
revoke all on function public.store_integration_token(uuid,text),public.integration_token(uuid) from public,anon,authenticated;
grant execute on function public.store_integration_token(uuid,text),public.integration_token(uuid) to service_role;
commit;
