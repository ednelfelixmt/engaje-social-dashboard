# Auditoria de continuidade — MediaHub Engaje

Data: 25/10/2026, America/Cuiaba. Referência inicial: main em 010011e5843e69f737794965dbb37a14799f30de (#127). Escopo: repositório existente, catálogos/Advisor Supabase somente leitura e histórico GitHub. Não representa homologação comercial, pentest ou teste autenticado A/B.

## Arquitetura e superfícies examinadas

O núcleo é um monólito modular Next.js App Router, React, TypeScript, Tailwind e Recharts. PostgreSQL, Auth, RLS, Storage e Edge Functions ficam no Supabase; Vercel publica a aplicação. Nenhum serviço foi recriado.

| Camada | Caminhos / comportamento | Estado observado |
|---|---|---|
| Identidade | lib/auth/session, lib/supabase, proxy, login, auth/invite e auth/signout | Claims verificadas; superadmin consultado por RPC; convite não concede membership automaticamente. Jornada real e revogação pendentes. |
| Administração | /admin, organizations, users, users/[userId], integrations | requireAdmin nas ações; somente viewer no cadastro de vínculos. Escritas compostas não atômicas: issues #54 e #65. |
| Tenant e navegação | /[organizationSlug]/layout, [section], intelligence | tenant obrigatório e RLS; seleção de organizações restrita. Cliente não personaliza/importa CSV pela UI principal. |
| Configurações | settings/branding, dashboard, integrations, data-quality e sharing | Actions de branding/dashboard negam escrita; algumas páginas ainda renderizam controles a clientes por URL direta. Compartilhamento usa links de login, não tokens públicos. |
| Analytics | lib/metrics, types/domain, components/dashboard | Contratos, calendário, reconciliação, cobertura e freshness implementados. Partes da UI calculam agregados próprios; alcance/usuários não aditivos, períodos e atribuição precisam consolidação (#47). |
| Relatórios | reports/[report], single-screen-reports, display-mode-controller | Público/dispositivos, telas e TV existem; GA4 mostra indisponível. Falta homologação visual/autenticada e exportação com lineage. |
| Integrações | lib/integrations, componentes de seleção, Edge engaje-integrations/meta-auth/engaje-ingest | Meta e Windsor têm adaptadores; catálogo operacional não comprova homologação. TikTok/CRM/Stract contêm fundações/contratos; não anunciar conexão concluída. |
| Dados | schema.sql, services.sql, token-vault.sql, 40 arquivos em migrations | RLS, FKs compostas, segredo no Vault e importação transacional. Bootstrap e teste PGlite ainda reproduzem permissões antigas. Não executar bootstrap sobre produção. |
| Qualidade | tests, scripts, workflows quality/staging-security/phase02-final-auth | CI cobre testes, schema descartável, tipos, arquitetura, build e lint incremental. E2E protegido depende de secrets; ESLint instalado fora do lockfile no workflow. |

Rotas do build inspecionadas: /, /login, /login/[organizationSlug], /auth/invite, /auth/signout, /admin e suas quatro telas específicas, /[organizationSlug]/[section], intelligence, reports/[report], quatro settings, sharing e estados globais de erro/loading/not-found. Não foram encontradas rotas app/api; BFF ocorre via Server Actions e Edge Functions. Service role foi identificado em convites/diretório server-side e Edge; não foi copiado para fixtures ou frontend.

## Evidências da auditoria inicial

- npm ci: instalação concluída; Recharts 2 em manutenção encerrada (dívida de migração, não migrar UI sem testes).
- npm run build: 128 testes passaram, typecheck passou e build Next 16.3.7 passou.
- npm run verify:schema: 74 verificações passaram em PostgreSQL WASM descartável; o teste confirma regras antigas que permitem editor gravar branding/Storage e viewer gravar layout. Portanto não certifica a política atual de cliente somente leitura.
- npm run check:architecture: aprovado.
- npm run lint após npm ci: falhou porque eslint não está nas devDependencies. O CI contorna isso instalando eslint@9.39.1 e typescript-eslint@8.46.0 fora do lockfile (#49).
- npm audit inicial: 7 pacotes sinalizados, 1 crítico, 3 altos e 3 moderados. next 16.3.7 tem avisos críticos; postcss 8.5.6, source-map-js e zod 3.24.2 têm avisos altos. Cadeia Tailwind/PostCSS selector parser tem avisos moderados. Contagem é por pacote, não prova de exploração do aplicativo.
- GitHub: main #127 com Quality Gate aprovado; PRs #119–#127 integraram freshness, completude, moeda, overflow, cobertura e proteção ROI no paidSummary. PR #128 (cronograma) aberto; #89 (datas de ingestão) e #13 (PostCSS) também abertos. Evitar duplicar funcionalidades dessas branches; atualização ampla de PostCSS pode substituir a versão proposta por #13.
- Supabase atual: 25/25 tabelas public com RLS, 3 identidades Auth, 5 organizações clientes não sintéticas e 2 organizações de homologação. A informação histórica de apenas 1 identidade foi superada; presença das identidades não prova login A/B.
- Advisor: pg_net em public e proteção de senhas vazadas desativada; três tabelas internas sem políticas (negação padrão), sem inferir necessidade de abrir grants.
- Edge ativas: windsor-sync v10, meta-auth v24 (verify_jwt=false), meta-sync v4, windsor-connect v3, windsor-accounts v3, windsor-paid-sync v3, engaje-integrations v41, engaje-ingest v6 (verify_jwt=false). Meta-auth e engaje-integrations compartilham hash no runtime. Há funções legadas não versionadas integralmente aqui; deploy do frontend não atualiza Edge.

## Achados novos / persistentes

| ID | Prioridade | Evidência e efeito | Dependência e aceite |
|---|---|---|---|
| DEP-001 | P0 pacote crítico | Next vulnerável no lockfile. Avisos GHSA-2464-fhr4-w9xw e GHSA-673q-mjm6-r5xr. Não foi realizada exploração. | Atualizar Next compatível, testar, Quality Gate e preview Vercel do mesmo SHA antes do merge. |
| DEP-002 | P1 | PostCSS/source-map-js/Zod sinalizados; Zod exige avaliar migração major. | Versões corrigidas, testes de validação e build; registrar residual sem esconder audit. |
| DEV-001 | P1 reprodutibilidade | Lint indisponível em instalação limpa; CI altera árvore fora do lock. | ESLint versionado e instalado por npm ci; lint, arquitetura, testes e build verdes. |
| SEC-014 | P0 autorização em código | allowed() no Edge aceita client_admin/editor; callback também aceita permissão legada. | Exigir administrador ativo da agência em início/ações/callback; regressão negativa e comparação/deploy controlado do runtime (#38/#59). |
| SEC-015 | P1 UI | Branding/dashboard/integrations mostram forms por URL direta; esconder menu não é autorização. | Bloqueio server-side anterior às queries/renderização; viewer/editor/client_admin recebem negação, admin mantém fluxo. |
| SEC-016 | P1 testes/bootstrap | Banco local contradiz as quatro migrações admin-only recentes. | Fixture limpa e upgrade migrações com testes positivos de admin e negativos de três papéis clientes, RPC e Storage. |
| ANA-011 | P1 semântica | ROI ainda aparece em campaigns(), query.totals() e view SQL, apesar da correção em paidSummary. | Contrato financeiro único; indisponível sem custos completos; regressões em todos os consumidores. |
| ANA-010 | P1 integridade | Datas impossíveis normalizadas no contrato de ingestão; PR #89 aberto. | Reaproveitar solução revisada e testes, sem duplicar branch. |

## Backlog por dependência e marco

Responsável funcional de engenharia: executor deste ciclo; dono de secrets/contas/aceite de negócio: administrador da agência, a confirmar no acompanhamento operacional. Metas são planejamento, sem certificação automática.

| Ordem | Trabalho | Depende de | Meta / critério |
|---|---|---|---|
| 1 P0/P1 | DEP-001/002 e DEV-001; SEC-014/015/016 | baseline e versões oficiais | Primeiro ciclo; nenhum merge sem gates. |
| 2 P0 | SEC-010/011, #37/#38/#57: JWT real A/B, negação REST/RPC/Storage, OAuth/replay e revogação | secrets protegidos, fixtures isoladas, rollback; não usar Agriclassify | Antes de novos acessos e ativação de conectores. |
| 3 P1 | #54/#65: memberships/convites e cliente/funil atômicos | banco descartável representativo e staging Engaje | Antes de homologar gestão administrativa. |
| 4 P1 | ANA-004/007/008/009, #47/#40: agregações, alcance, períodos, custos e cobertura em todas as telas | contratos e fontes reconciliadas | Dashboards e inteligência: 06/11/2026. |
| 5 P1 | #59 e contratos por provedor; ingestão e testes reais Meta/Google/TikTok/orgânico; GA4/CRM #44 | segurança OAuth, credenciais oficiais e reconciliação | Integrações: 20/11/2026. Fonte indisponível continua sem números. |
| 6 P1/P2 | #42/#43, relatórios/exportação, compartilhamento e TV | isolamento real, métricas rastreáveis, mídia autorizada | 04/12/2026; sem links públicos antes do gate. |
| 7 P1 | #39/#50 e UX-002: desktop/mobile, teclado, filtros, erros, login/logout | contas sintéticas protegidas e preview adequado | Testes e estabilização: 11/12/2026. |
| 8 P1 | backups/restauração/rollback, observabilidade, aceite dos fluxos | gates anteriores e revisão da agência | Homologação e entrega: 18/12/2026. |

Risco do cronograma: staging próprio, credenciais por provedor e evidência autenticada ainda não disponíveis nesta execução. Continuar trabalho independente; não trocar a falta de evidência por selo de homologação.

## Fontes e reprodução

Arquivos de referência: 00-project-baseline, 01-product-requirements, 02-architecture-and-gates, 03-security-rls-audit, 04-roadmap-continuous-delivery, inventários/evidências 05–14 e workflows atuais. Histórico/PRs consultados pela API GitHub. Consultas Supabase retornaram apenas contagens e catálogos; nenhum dado pessoal foi utilizado como fixture.

Avisos oficiais: https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw ; https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr ; https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 . Migração Zod: https://zod.dev/v4/changelog . Audit é um retrato do registry em 25/10/2026, não um pentest.

## Ciclo 01 — atualização do baseline

Next 16.4.3, Zod 4.6.7, PostCSS 8.5.31, source-map-js 1.2.2 e lint fixado no lockfile. npm ci + lint + 128 testes + 74 verificações SQL + tipos + arquitetura + build aprovados localmente. npm audit: 0 críticos/altos, 3 moderados, diferidos na issue #130 com critério de aceite e meta 11/12. Os testes existentes de validação passaram após a migração Zod; isso não substitui o E2E autenticado. A verificação SQL antiga não foi usada para afirmar que a autorização atual está homologada.

Atualização durante a execução: main avançou para 02f8e1c com #128, #89 e #129. A branch foi rebaseada e preserva esses trabalhos. ANA-009 foi usado por #129; o achado de ROI fica em ANA-011. ANA-010 (datas impossíveis) foi resolvido pelo merge #89 e será revalidado na suíte atual.
