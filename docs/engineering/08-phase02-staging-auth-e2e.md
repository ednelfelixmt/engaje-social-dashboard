# Fase 02 — Homologação autenticada em staging (22/10/2026)
Status: **HARNESS PREPARADO, HOMOLOGAÇÃO REAL BLOQUEADA PELA AUSÊNCIA DE UM PROJETO STAGING ENGAJE E FIXTURES DE TESTE.**

## Inventário verificado
- Vercel `engaje-social-dashboard`, projeto `prj_KiulbtC4t1CD9d9zleKDvFI69xAA`: implantação atual READY em produção e prévias automáticas das branches; proteção SSO habilitada nas URLs padrão de preview, exceto domínios personalizados. Isso não comprova um ambiente de dados segregado.
- Supabase acessível nesta conexão: `engaje-social` (produção), `agriclassify`, `agriclassify-staging`. **Não há um projeto `engaje-staging` identificado.** Não usar projetos de outros produtos como substitutos sem validação do proprietário.
- Banco em produção Engaje: **não foram criados usuários ou alterados dados** para testes.

## Implementado
- `scripts/verify-staging-isolation.ts` valida duas contas reais sem superadmin de duas organizações distintas em um projeto Supabase **não produção**.
- Requer fixtures existentes de ativos atribuídos e de arquivos privados de branding por empresa. Sem fixture, o teste falha (evita falso positivo com tabelas vazias).
- Verifica para A e B: conta autenticada, membership ativo, visibilidade da própria empresa, negação do SELECT sobre dados de 12 tabelas da outra empresa, negação de assets e platform_connections estrangeiros e geração negada de URL assinada de arquivo alheio; em contrapartida, arquivo próprio acessível.
- `requireStagingUrl` recusa explicitamente o ID `ityidnsfhgotucgvcifq` de produção, endpoints com HTTP, credenciais embutidas e hosts alheios a Supabase.
- Testes unitários locais validam a proteção contra uso acidental do projeto de produção; `npm test` os executa no CI normal.
- Workflow manual `.github/workflows/staging-security.yml` usa environment `staging`, secrets e vars exclusivos, sem imprimir senhas/tokens.
- **Nenhuma credencial de staging foi criada ou armazenada pelo agente.** O workflow só executará com ambiente preparado e valores configurados.

## Preparação de staging — tarefa operacional
1. Provisionar um Supabase **novo, dedicado ao Engaje**, isolado do banco produtivo; aplicar schema/migrations testadas com `npm run verify:schema`, sem importar clientes ou dados reais.
2. Criar empresas fictícias A e B, duas contas de teste sem superadmin, memberships ativos, conexões/ativos atribuídos e arquivos privados `branding/<organization_id>/...` por empresa. Usar e-mails de teste sob domínio de propriedade da organização; nunca senhas de clientes.
3. Configurar GitHub Environment `staging` com secrets `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_USER_A_EMAIL`, `STAGING_USER_A_PASSWORD`, `STAGING_USER_B_EMAIL`, `STAGING_USER_B_PASSWORD`, e vars `STAGING_ORG_A_SLUG`, `STAGING_ORG_B_SLUG`, `STAGING_PRIVATE_FILE_A`, `STAGING_PRIVATE_FILE_B`.
4. Executar manualmente o workflow "Staging Auth Isolation" na branch main, reter link da execução, logs sem segredos e resultados negativos.
5. Vincular deploy preview a variáveis Supabase staging, revisar OAuth callbacks, testar login/logout/dashboard HTTP/Storage e obter evidência de dispositivo móvel/desktop; endpoints com SSO exigem configuração legítima de acesso à preview.
6. Somente após passes reais em ambos sentidos, atualizar #37/#50 como homologação de isolamento. A cobertura do harness é **parcial**: não cobre sozinho todos os endpoints service-role/Edge Functions, web UI, cache e integração OAuth (#38).

## Política de segurança
Nunca armazenar senhas no Git, registrar tokens em CI, usar service_role nos testes de usuário ou reutilizar o banco de produção. Falha de autenticação, fixture ausente ou tentativa de usar produção devem terminar o teste com erro. Sem sucesso do workflow autenticado, não afirmar homologação.
