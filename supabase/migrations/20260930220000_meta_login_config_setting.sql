-- ID da configuração de Login do Facebook para Empresas, lido pelas Edge Functions via service_role.
-- Para desativar e voltar ao login por permissões: delete from vault.secrets where name = 'meta_login_config_id';
create or replace function private.meta_login_config_id() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'meta_login_config_id' limit 1;
$$;
revoke all on function private.meta_login_config_id() from public, anon, authenticated;
grant execute on function private.meta_login_config_id() to service_role;

create or replace function public.meta_login_config_id() returns text
language sql stable security invoker set search_path = '' as $$ select private.meta_login_config_id(); $$;
revoke all on function public.meta_login_config_id() from public, anon, authenticated;
grant execute on function public.meta_login_config_id() to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'meta_login_config_id') then
    perform vault.create_secret('1087189234278533', 'meta_login_config_id', 'ID da configuração de Login do Facebook para Empresas (app Engaje DASHBOARD)');
  end if;
end $$;
