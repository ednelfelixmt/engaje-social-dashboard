# Fase 02 — Entrega 01: validação de ativação de usuários
Data: 2026-10-22 · **Status: aguardando CI e homologação cross-tenant**.

## Defeito corrigido
Em `src/app/(agency)/admin/actions.ts`, ativar `organization_members.is_active` executava a consulta à tabela protegida `agency_user_invitations` **somente se** `SUPABASE_SERVICE_ROLE_KEY` estivesse presente. A ausência da chave desabilitava a verificação. Além disso, um erro da consulta era tratado como ausência de convite e podia permitir a ativação.

## Alteração funcional
- Novo contrato puro `canActivateMembership` com decisão explícita por status.
- Para ativação, ausência de cliente privilegiado de verificação **nega** a operação (fail-closed).
- Erros de leitura no serviço de convites **negam** a operação.
- Convites pendentes, expirados ou revogados impedem a ativação.
- Convite aceito ou usuário existente sem convite (lookup bem-sucedido) preserva fluxo existente.
- Desativação continua possível sem o serviço para facilitar contenção de acessos.
- `tests/membership-guards.test.ts` cobre casos positivos/negativos.

## Limitações e riscos ainda abertos
- Checagem da aplicação não substitui RLS e testes reais de sessão cross-tenant (#37 e #50).
- Revogação de convites pendentes no fluxo pós-`upsert` usa credenciais privilegiadas e deve ser revisada quanto a falha de rede e consistência (#38).
- MFA, sessões, rate limiting, audit trail, caminhos de Storage e Edge Functions permanecem dentro da Fase 02.
- Alteração não deve ser considerada homologação integral do login, dos convites ou das empresas.

## Critério de aceite desta entrega
1. CI: testes (incluindo os casos negativos), TypeScript, arquitetura e build aprovados.
2. Inexistência de concessão de acesso quando verificação da ativação retorna erro.
3. Testes de login com identidades reais em staging a executar antes de selo de homologação E2E.
