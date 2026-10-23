# MediaHub — Fase 02: evidências de produção, somente leitura

Data: 2026-10-22 (America/Cuiaba). Escopo: projeto Supabase existente `engaje-social` (`ityidnsfhgotucgvcifq`).

## Verificações realizadas

| Controle | Evidência | Estado |
| --- | --- | --- |
| RLS em tabelas públicas | Consulta `pg_class` identificou 25 de 25 tabelas públicas com RLS habilitado | Estrutura verificada |
| Convites de agência | RLS ativo; `anon` e `authenticated` sem SELECT; `authenticated` sem INSERT | Privilégios diretos verificados |
| Convites de cliente | Mesmas condições acima | Privilégios diretos verificados |
| Chaves de ingestão | Mesmas condições acima | Privilégios diretos verificados |
| Funções `SECURITY DEFINER` | Inventário de `pg_proc`: 18 funções em esquemas `public`/`private` com `search_path` fixado | Inventário verificado, autorização funcional não homologada |
| `private.delete_client_organization` | Código contém validação `auth.uid()` + `private.is_super_admin()` antes de operações | Inspeção estática verificada |
| `private.disconnect_client_organization` | Mesma validação interna de superadmin | Inspeção estática verificada |
| `private.import_spreadsheet` | Código exige identidade e `private.has_org_role(...,client_admin/editor)` | Inspeção estática verificada |
| `public.disconnect_integration` | `SECURITY DEFINER` sem verificação de identidade interna; `anon` e `authenticated` não têm `EXECUTE` na consulta atual | Restrição de grants verificada, risco de regressão se permissões mudarem |

**Atenção:** a ausência de permissão direta e a existência de RLS não demonstram que a autorização funciona para identidades reais. Nenhuma função destrutiva foi executada.

## Advisor de segurança

- INFO: RLS sem políticas explícitas em `agency_user_invitations`, `client_user_invitations` e `integration_ingest_keys`. Os grants diretos consultados negam acesso aos papéis públicos, mas o desenho service-role precisa permanecer documentado.
- WARN: `pg_net` no schema `public`; alteração exige análise de dependências e rollback.
- WARN: proteção de senhas vazadas desativada; habilitar no painel Auth após avaliação de compatibilidade e plano de comunicação.

## Gate para homologação integral

1. Duas identidades não privilegiadas, ligadas a organizações diferentes, devem comprovar **nos dois sentidos** negação de leituras, escritas, downloads de Storage e RPC indevidas.
2. Sessões e papel dos usuários devem ser revalidados após revogação e alteração de membership.
3. Devem ser exercitados login, logout, dashboard, filtros, responsividade e fluxos de API, com evidências de execução e registros sem credenciais.
4. Inspecionar todas as Edge Functions com credenciais service-role e callbacks OAuth; autorização explícita em cada operação sensível.
5. Registrar risco, rollback, responsável e aceite para avisos restantes; não declarar homologação apenas por CI.
6. No ambiente único de produção, os testes devem usar somente identidades/organizações sintéticas identificadas, sem interferir em clientes reais. Não criar nem alterar contas ou configurações antes de validar impacto.

**Estado da Fase 02: ABERTA — segurança estrutural parcialmente verificada; testes autenticados e homologação funcional pendentes.**

## Links de referência

- Supabase Security Advisor: https://supabase.com/dashboard/project/ityidnsfhgotucgvcifq/advisors/security
- Database linter: https://supabase.com/docs/guides/database/database-linter
- Password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
