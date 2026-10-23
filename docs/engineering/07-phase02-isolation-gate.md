# Fase 02 — Gate automatizado de isolamento multicliente (22/10/2026)
Status: **teste automatizado local habilitado no CI; não homologado em ambiente de autenticação real.**

## Evidências e escopo
- Inventário somente-leitura do Supabase: 25 tabelas públicas com RLS ativo; regras tenant por função `private.user_belongs_to_org`. A view `daily_performance` já foi verificada como `security_invoker=true`.
- Encontrada divergência: `supabase/schema.sql`, usado para iniciar novos bancos, mantinha a condição `a.asset_id=id` na política `platform_assets.asset_read`, enquanto o banco de produção já havia sido corrigido pelo PR #41. O arquivo bootstrap foi alinhado para `a.asset_id=platform_assets.id`; não foi executada migração em produção nesta entrega.
- `scripts/verify-schema.ts` já exercitava RLS, viewer/editor/admin, dados de anúncios, CRM, Storage e isolamento com PostgreSQL WASM descartável. Agora o CI exige `npm run verify:schema` e inclui dois ativos/duas conexões/duas atribuições de empresas distintas, verificando ausência de enumeração de dados de terceiros.
- Os testes usam `@electric-sql/pglite` com stubs de Auth/Storage, e não uma sessão Supabase HTTP real. Eles não provam proteção de Edge Functions, signed URLs, cache, SSR, APIs ou OAuth.

## Pendências bloqueantes para selo completo
- Contas de teste reais em staging, com duas organizações, papéis distintos e testes E2E autenticados (#37, #50).
- Revalidação de políticas Storage via API, RPC SECURITY DEFINER, conexões e service_role (#38).
- Auditoria de revogação/ativação atômica e observabilidade de alterações de permissão (#54).
- Avaliar operações e leitura por superadmin em conexão desvinculada, endpoints de integração e exportação.

## Critério de avanço controlado
É permitido desenvolver testes, hardening e controles internos; não declarar isolamento SaaS integral aprovado até execução com identidades de teste reais e evidências independentes.
