# MediaHub — Fase 02: consolidação e decisão de homologação

Data de referência: 2026-10-22 (America/Cuiaba). Ambiente único: Supabase `engaje-social`, projeto `ityidnsfhgotucgvcifq`.

## Evidências concluídas

- PRs #68 a #75 integrados à `main`; último merge #75: `542f51d17db297e6702d428375d0010f4375a627` (Quality Gate #51 e Vercel aprovados).
- Auditoria SQL reproduzível `scripts/audit-production-security.sql` executada no Supabase atual: **5/5 controles estruturais aprovados** (25/25 tabelas `public` com RLS; 3 tabelas restritas sem grants diretos indevidos; função destrutiva sem EXECUTE para anon/authenticated; 3 buckets privados e 5 políticas relevantes de Storage presentes).
- Inspeção adicional em catálogo: **zero** funções `SECURITY DEFINER` em `public` executáveis por `anon` e **zero** por `authenticated`.
- Revisão estática e testes de regressão para segurança da função `disconnect_integration` e callback OAuth Meta (assinatura/expiração, nonce, revalidação de membership), com aprovação de pipeline. Testes estáticos não demonstram segurança comportamental.

## Bloqueios verificados para a aprovação total

- Contagem live: **1 usuário** em `auth.users`, **1 organização com membership ativo**. Não há duas identidades independentes para executar teste E2E A/B. A aprovação do isolamento seria fictícia.
- Testes comportamentais negativos de RPC/REST/Storage para dois tenants, sessão revogada, acesso cruzado, callback Meta, integração externa e autorização por perfil **não foram executados**.
- `meta-auth` e `engaje-ingest` usam `verify_jwt=false`: exige homologar autenticação própria, inclusive tentativas negativas.
- Avisos do Security Advisor previamente identificados: `pg_net` em schema `public` e proteção de senhas vazadas desabilitada. Revisar antes de aceitar risco em produção.

## Procedimento de desbloqueio

1. Provisionar **dois usuários sintéticos via Supabase Auth Admin API** e organizações próprias de homologação, com identificação clara, duração definida e nenhuma associação a clientes reais. Proibir inserção SQL direta em `auth.users`.
2. Associar um papel limitado por organização; criar somente fixtures sintéticas necessárias, com rollback ou limpeza controlada.
3. Executar os testes de negação **nos dois sentidos** e verificar que cada usuário consegue ler seus próprios dados e arquivos autorizados.
4. Executar casos de revogação, login/logout, dashboard e API, sem valores de credenciais ou tokens em logs.
5. Corrigir falhas, repetir os testes, anexar evidências e só então aprovar a Fase 02.

## Decisão

**Fase 02 NÃO HOMOLOGADA integralmente.** Controles estruturais acima aprovados; falta evidência E2E real. Não realizar mutações em dados de clientes ou desabilitar proteções para contornar o bloqueio. Continuar engenharia e correções independentes do gate autenticado.
