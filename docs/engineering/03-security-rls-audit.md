# Segurança — Auditoria de políticas (Fase 00, 2026-10-22)
Status: **AUDITORIA PARCIAL; Fase 00 ABERTA**. Inspeção de catálogos em produção; não equivale a pentest ou teste E2E entre usuários reais.

## Evidências confirmadas
1. 25 tabelas em `public` tinham RLS habilitado no inventário. Três tabelas sem políticas explícitas: `agency_user_invitations`, `client_user_invitations`, `integration_ingest_keys`. Confirmar grants/serviço; a ausência de política com RLS indica bloqueio para papéis sujeitos a RLS, não ausência de proteção.
2. `public.daily_performance` possui `security_invoker=true` e concessão SELECT a authenticated; a view deve respeitar permissões do chamador.
3. `private.user_belongs_to_org`, `private.has_org_role` e `private.is_super_admin` verificam `auth.uid()`, membership ativo e organização ativa; superadmin exige agência ativa.
4. `private.delete_client_organization` e `private.disconnect_client_organization` incluem verificação interna de superadmin, apesar de SECURITY DEFINER. Ainda faltam testes de execução negativa com identidades reais.
5. `public.disconnect_integration` é SECURITY DEFINER mas sem EXECUTE concedido para authenticated/anon na consulta de privilégios.
6. Storage possui políticas segregadas por bucket e vínculo de organização; os buckets `avatars` e `thumbnails` têm leitura pública intencional aparente, cuja classificação de dados e finalidade devem ser auditadas.
7. `platform_assets.asset_read`: a segunda subcondição continha `a.asset_id = a.id` e não fazia vínculo entre o ativo consultado e o registro autorizado; **erro verificado em catálogo**. A condição era falsa nos 14 vínculos atuais consultados, mas não é uma regra válida. Migrado para `a.asset_id = platform_assets.id` mantendo a primeira alternativa, baseada na conexão. **Verificado após migração em produção:** consulta a `pg_policies` exibe a condição corrigida; 12 ativos com vínculo em estado `assigned` se relacionam à tabela de ativos; `daily_performance` preserva `security_invoker=true`. A consulta estrutural não substitui teste de acesso de usuários reais.

## Limites, testes pendentes e riscos
- Rodar testes de acesso entre dois usuários sem papel global e duas organizações. Apenas 1 membership constava da tabela no inventário; não houve dois perfis de cliente disponíveis para testes reais de isolamento.
- Simular cliente A tentando ler `platform_assets`, `client_asset_assignments`, `metrics_ads`, `creatives`, `storage.objects` de cliente B, inclusive exportações e signed URLs.
- Conferir permissões dos endpoints com service_role, OAuth callbacks, Edge Functions `verify_jwt=false`, funções SECURITY DEFINER e ferramentas MCP futuras.
- Auditar escopo e retention das informações públicas em avatars, thumbnails e login branding.
- Revisar migrations versus estado efetivo do banco, revogação e renovação de credenciais, privilégios de papel e operações destrutivas.

**Gate:** não marcar isolamento e segurança de usuários como homologados sem testes negativos executados com credenciais próprias e evidências. Fase 00 não concluída.
