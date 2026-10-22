# Engaje Intelligence — Fase 00: diagnóstico e baseline
Status: **EM EXECUÇÃO — NÃO HOMOLOGADA**. Data do inventário: 2026-10-21.
Origem: leitura do repositório principal e inventário somente-leitura de tabelas/funções do Supabase. Não houve testes E2E autenticados, carga, pentest ou testes de restauração.

## Arquitetura observada
- Aplicação Next.js App Router / React / TypeScript, Tailwind, Recharts, Supabase SSR/Auth/PostgreSQL/Storage e Supabase Edge Functions.
- Rotas tenant em `src/app/(tenant)/[organizationSlug]`; rotas administrativas em `src/app/(agency)/admin`. Sessão e escopos em `src/lib/auth/session.ts`.
- Domínio de métricas em `src/lib/metrics`; renderização das páginas de dashboard em `src/components/dashboard`; integrações também em funções remotas do Supabase.
- Build executa testes e typecheck via `prebuild`. O README afirma “Next.js 14”, enquanto package.json declara Next 16.3.7; documentação desatualizada.
- Não foi encontrado `.github/workflows/ci.yml` no caminho testado: **não equivale a confirmar ausência de todo o CI**.

## Inventário do banco (dados de síntese, sem informações pessoais)
Foram identificadas **25 tabelas no schema public**, todas com RLS habilitado. RLS habilitado não comprova isolamento: políticas e rotas de serviço devem ser auditadas.

| Tabela/grupo | Registros aproximados |
|---|---:|
| organizations | 6 |
| organization_members | 1 |
| integrations | 22 |
| metrics_ads | 950 |
| metrics_ads_breakdowns | 2107 |
| metrics_organic | 107 |
| metrics_organic_accounts | 173 |
| creatives | 237 |
| ad_campaigns | 30 |
| metrics_crm | 0 |
| agency_user_invitations | 0 |
| sync_jobs | 12 |

Na consulta de `metrics_ads` todos os 950 registros têm plataforma `meta_ads`, cobrem quatro organizações e último dia de registro em 2026-10-20. Isso **não comprova ausência de dados em serviços externos**, mas comprova ausência de outras plataformas nessa tabela, na data auditada. `creatives`: 237 registros; 0 registros com `storage_path` preenchido.

Edge Functions inventariadas incluem `engaje-integrations`, `meta-auth`, `meta-sync`, `windsor-sync`, `windsor-connect`, `windsor-accounts` e `windsor-paid-sync`. Algumas funções têm `verify_jwt=false`: revisar defesa real de callback e autorização no código antes de classificar como falha de segurança.

## Riscos e não conformidades preliminares
- **P0/R01 — Governança de dados:** pouca cobertura de outras plataformas em `metrics_ads`; não publicar conclusões multicanal sem reconciliação.
- **P0/R02 — Limites entre organizações:** RLS e escopo de tenant devem passar por testes cross-tenant sistemáticos.
- **P1/R03 — Freshness:** períodos e lacunas de coleta devem ser expostos ao usuário, diferenciando zero de não coletado.
- **P1/R04 — Criativos:** mídia referenciada externamente, sem cópia persistente; implementar cache seguro de objetos conforme direitos e políticas da fonte.
- **P1/R05 — Financeiro/comercial:** `metrics_crm` vazio; não apresentar CAC/ROI comercial como resultado confirmado.
- **P1/R06 — UI analítica:** múltiplos componentes dedicados e cálculos em componentes; padronizar contrato de gráficos e separar modelos analíticos.
- **P1/R07 — Qualidade de release:** build/typecheck não substitui avaliação visual autenticada, fluxo real, segurança e reconciliação.
- **P2/R08 — Documentação:** corrigir README inconsistente, registrar integrações reais, suportadas e em desenvolvimento.

## Limites e evidências ainda necessárias para encerrar a Fase 00
- [x] Identificação da stack e caminhos centrais.
- [x] Contagem e agrupamento de tabelas, fonte principal e cobertura inicial.
- [x] Inventário inicial de Edge Functions.
- [ ] Inspeção completa das políticas RLS, grants e operações com service role.
- [ ] Mapa completo das rotas e API endpoints por descoberta do repositório.
- [ ] Diagrama C4 validado contra todos os componentes e integrações.
- [ ] Inventário de segredos sem ler/expor valores, ambiente por ambiente.
- [ ] Auditoria de API/OAuth, rate limits, refresh e credenciais por conector.
- [ ] Execução E2E real de cadastro, login, permissões, cliente e dashboard.
- [ ] Baseline visual e acessibilidade em desktop/mobile autenticados.
- [ ] Baseline de testes, lint, cobertura e pipeline CI independente.
- [ ] Revisão de riscos com dono, prazo e critérios de mitigação.

**Gate:** Fase 00 permanece ABERTA até comprovar todos os itens obrigatórios. Não avançar automaticamente à Fase 01 nem publicar mudanças de produto só com esta documentação.
