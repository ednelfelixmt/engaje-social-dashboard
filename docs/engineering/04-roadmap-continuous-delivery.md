# Roadmap de continuidade — 2026-10-22
Status: Fase 00 **ABERTA COM PENDÊNCIAS CONTROLADAS**; trilha Fase 01 **AUTORIZADA PARA TRABALHOS DE FUNDAÇÃO NÃO DESTRUTIVOS**. Não confundir com aprovação de segurança ou release comercial.

## Regra de não paralisação

**Diretriz reafirmada pelo responsável em 25/10/2026:** registrar bloqueios e continuar a implementação dos módulos independentes. SEC-010/011 (A/B autenticado), SEC-014 (rollout Edge) e UX-002 permanecem pendentes, com condições de desbloqueio no ciclo 02 e em `17-continuity-cycle-evidence.md`; não paralisam analytics e testes sintéticos sem dependência desses acessos.

O andamento pode ser concorrente: a equipe desenvolve infraestrutura modular, testes, contratos e UI sem expandir privilégios nem declarar produção segura. A publicação/ativação de funcionalidades novas depende de seus próprios gates. Pendências não críticas recebem data-alvo ao priorizar sprint e proprietário designado; não inventar nomes ou prazos sem capacidade confirmada.

## Backlog priorizado e destino
| Item | Severidade | Situação | Próxima verificação | Bloqueia |
|---|---|---|---|---|
| #37 Isolamento de empresas / E2E cross-tenant | P0 risco não verificado | Aberto | Testes autenticados com dois tenants e service role/Storage | Homologação de segurança, acesso comercial ampliado |
| #38 Inventário de APIs, OAuth e segredos | P0 parte sensível ainda não verificada | Aberto | Inventário e análise de callbacks/credenciais | Novos conectores expostos |
| #39 Testes UX e E2E autenticados | P1 | Aberto | Jornada login/empresa/dashboard com evidências | Homologação de UX e novos fluxos |
| #40 Dados, CI, reconciliação e rollback | P1 | Aberto | Testes e baseline do pipeline, limites de dados | Novos indicadores sem prova |
| Padronização visual de dashboards | P2 | Planejado | Specs e screenshots após Design System | Não bloqueia CI de fundação |
| Heatmap idade × sexo sem fato conjunto | P2, dependência externa | Planejado | Obter breakdown conjunto autorizado | Apenas o heatmap real |
| GA4 e CRM sem ingestão homologada | P1 dependência externa | Planejado | Contratos e testes do conector | Apenas painéis de métricas dependentes |
| Criativos com URLs transitórias | P2 | Planejado | Cache seguro e análise de licenças | Persistência de thumbnails |

## Trilha Fase 01 — Fundação técnica
1. CI: `npm ci`, testes, `tsc --noEmit`, build; publicar artefatos/status.
2. Corrigir README de versão e comandos, documentar ferramentas.
3. Adicionar lint com política incremental e verificação de arquitetura.
4. Criar contratos de métricas e testes puros antes de refatorar UI.
5. Instrumentação básica, evidência de preview e fluxo de rollback.
Critério: pipelines verdes, regressão básica reproduzível e segurança da alteração avaliada.

## Critérios de encerramento da Fase 00
- Inventário e documentação mínimos registrados.
- Riscos P0/P1 avaliados e segregados em superfícies afetadas; **riscos não verificados não ganham selo de segurança**.
- Cada pendência aceita para adiamento possui issue e teste de aceite.
- Decisão de avanço explícita: somente engenharia reversível e interna até homologação.
O gate completo de segurança, autorização e UX permanece em andamento.

## Atualização 22/10/2026 — fechamento de ciclo Fase 01
- Núcleo de qualidade passou em CI: ESLint incremental, testes, tipos, verificação de dependências e build. Evidência: PR #51 e `docs/engineering/05-phase01-homologation-evidence.md`.
- Trilha Fase 02 liberada para código de segurança e testes sem aumento de privilégios. Homologação comercial e E2E continuam bloqueadas por #37/#38/#39/#50.
- #49 permanece aberto para ESLint no lockfile e lint em todo o repositório; #47 para semântica de métricas/calendário.
- Critério de reavaliação: confirmar as pendências P1/P0 antes de habilitar novos clientes ou aumentar exposição dos dados.

## Atualização 23/10/2026 — separação explícita entre homologação e avanço

- **Fase 01:** fundação automatizada mantida; status de liberação comercial não inferido do CI.
- **Fase 02:** PRs #68–#81 integrados; verificações estruturais de RLS, funções privilegiadas, políticas do Storage e regressões de código documentadas. **Gate A/B autenticado segue aberto**: produção tem apenas uma identidade Auth e uma organização com membro ativo. Não classificar testes estáticos como prova de isolamento E2E; a execução exige duas identidades sintéticas criadas pela API oficial Auth Admin, ativos privados sintéticos e relatórios de testes de leitura, escrita, autorização e sessão.
- **Trilha Fase 03:** **INICIADA SOMENTE PARA ENGENHARIA INTERNA REVERSÍVEL**, sem habilitar conectores, compartilhar dashboards com terceiros ou ampliar exposição de dados até os gates correspondentes.

### Fase 03 — Contratos analíticos e navegação confiável (trilha paralela)

| Pacote | Escopo executável sem novas credenciais | Evidência obrigatória | Bloqueio de publicação |
|---|---|---|---|
| 03-A | Inventariar KPIs primários/secundários por objetivo; declarar grão, fonte, janela, moeda, status de ausência e denominadores | Contratos versionados, testes de fórmula e fixtures sem dados reais | Divergências P1 de dados |
| 03-B | Reconciliação de spend, impressões, cliques, leads, CPL, CTR, CPC, ROAS e variações | Testes agregação sem duplicação; denominador zero e null; confronto amostral autorizado | Ingestão não homologada |
| 03-C | UI acessível para sem dados / erro / sincronizando / indisponível, filtros e período | Testes unitários e revisão teclado/responsividade; sem dados fictícios em produção | E2E autenticado UX |
| 03-D | Contratos de integração por provedor (Meta, Google, TikTok, orgânico) e mapeamento de origem | Schemas e testes com payloads sintéticos; rastreabilidade de coleta | Gate segurança OAuth e conta do cliente |
| 03-E | Painel compartilhado e TV em modo apenas leitura, com segregação explícita de escopo | Revisão de arquitetura e testes de autorização em ambiente adequado | **Bloqueado até Fase 02 A/B + testes de acesso** |

### Condições para mover fase

1. Não fechar Fase 02 com base exclusivamente em PR verde: exigir execução A/B real e evidência auditável, inclusive escrita, arquivos, papéis, sessão e APIs.
2. Permitir PRs 03-A até 03-D com testes sintéticos/puros, sem escrita em produção e sem expor rotas ou segredos novos.
3. Abrir ativação 03-E somente depois de controles multi-tenant e autorização positivos; falha P0/P1 no fluxo impede a liberação afetada.
4. Registrar no PR de cada pacote: alteração, riscos, rollback, testes executados, itens adiados e vínculo com os gates.


---

# Plano consolidado de execução e registro de erros — atualização 24/10/2026

**Diretriz operacional:** executar correções relacionadas em ciclos coesos, com CI, build, migrações, auditoria e evidências; **não** apresentar um PR individual como se o projeto completo estivesse pronto. Quando houver bloqueio externo, registrar proprietário funcional, dependência e critério objetivo de desbloqueio no mesmo roadmap; prosseguir no código reversível que não dependa desse bloqueio. Não criar usuários Auth inserindo diretamente em `auth.users`, não usar dados de clientes reais como fixtures.

## 1. Fonte de verdade e estado efetivo

- GitHub: `ednelfelixmt/engaje-social-dashboard`, branch `main`. Produção: `mediahub.engajeperformance.com.br`; Supabase `ityidnsfhgotucgvcifq`.
- Auditoria SQL somente leitura em 24/10/2026: **5 organizações clientes**, **1 usuário em Auth**, **1 organização com membros ativos**, **11 políticas de escrita no aplicativo com exigência de superadmin** (`branding`, `dashboard_configs`, `profiles`, `user_dashboard_layouts`) e **3 políticas de escrita no Storage com exigência de superadmin**.
- O número de clientes cadastrados **não representa** o número de identidades autenticadas. A produção tem cinco cadastros de clientes; a homologação de separação entre identidades A/B **não foi realizada**.
- Gate de conclusão Fase 02: **ABERTO**. Gate de ativação comercial para novos acessos/integrações: **BLOQUEADO** até testes de isolamento, autorização real e revisão de callbacks.

## 2. Registro único de erros e correções (incidentes)

| ID | Falha ou risco detectado | Impacto | Correção/evidência | Estado | Gate complementar |
|---|---|---|---|---|---|
| SEC-001 | `branding` e `dashboard_configs` autorizavam client_admin/editor a escrever | P0, violação do cliente somente leitura | PR #91; migração aplicada; seis políticas verificadas | **Corrigido em produção** | Testes comportamentais |
| SEC-002 | `profiles` e `user_dashboard_layouts` permitiam gravação por cliente | P0 | PR #93; migração aplicada; cinco políticas verificadas | **Corrigido em produção** | Login/perfil/layout E2E |
| SEC-003 | `saveUserLayout`/`resetUserLayout` e promoção do padrão exigiam alinhamento administrativo | P1 | PR #94; primeiro CI falhou porque reset não tinha guarda; segundo commit corrigiu e CI/Vercel aprovaram | **Corrigido no código** | Testar ações autenticadas |
| SEC-004 | Botão Personalizar aparecia a perfis clientes | P1, interface enganosa | PR #95, CI/Vercel aprovados | **Corrigido no código** | UX em conta viewer |
| SEC-005 | Importação CSV aparecia para cliente | P1 | PR #96, CI/Vercel aprovados | **Corrigido no código** | UX em conta viewer |
| SEC-006 | `private.import_spreadsheet` SECURITY DEFINER aceitava client_admin/editor | P0, escrita privilegiada em métricas CRM | PR #97; guarda trocada por `private.is_super_admin()`; função verificada | **Corrigido em produção** | Negação real via RPC |
| SEC-007 | Storage branding/spreadsheets INSERT/DELETE admitia clientes | P0 | PR #97; políticas aplicadas e verificadas | **Corrigido em produção** | Negação real Storage |
| SEC-008 | Storage branding UPDATE ainda aceitava clientes | P0 | PR #99; migração aplicada; USING e WITH CHECK exigem superadmin | **Corrigido em produção** | Negação real Storage |
| SEC-009 | Funções privilegiadas de excluir/desconectar cliente e importar CSV precisam de auditoria repetível | P1 | PR #98; auditoria SQL executada: 3/3 guardas identificadas | **Auditoria estrutural aprovada** | Testes E2E negativos |
| SEC-010 | Somente 1 identidade Auth impede isolamento A/B | **P0 bloqueante** | Script read-only `scripts/verify-production-isolation.ts`; runbook em `docs/engineering/12-phase02-production-fixture-runbook.md` | **Aberto — dependência operacional** | Duas contas sintéticas Auth Admin via serviço protegido |
| SEC-011 | Falta provar escrita negada, sessão revogada, callbacks Meta e Edge Functions sob tokens inválidos | **P0 bloqueante** | Testes estáticos existentes e inventários da Fase 02 | **Aberto** | Execução autenticada, evidência assinada/sanitizada |
| SEC-012 | Security Advisor aponta `pg_net` em public e leaked password protection desativada | P1 | Avaliação catalogada, sem alteração arriscada da extensão em produção | **Aberto** | Decisão documentada e configurações revisadas |
| SEC-013 | Três tabelas internas têm RLS sem políticas explícitas | P2 informativo | Sem grants diretos para anon/auth no levantamento, comportamento deny-by-default | **Monitorar** | Revalidar grants, não criar permissões permissivas |
| UX-001 | Alterações administráveis e visualização do cliente podem divergir por componente/rota | P1 | Revisões pontuais PRs #94–#96 | **Auditoria geral pendente** | Varredura de rotas, botões, endpoints e menus |
| DATA-001 | KPI de mídia, reconciliação e disponibilidade de dados ainda sem E2E da origem à UI | P1 | Fase 03-A/B/C/D contratos e módulos, PRs #83–#89 | **Parcial** | Testes integrados por provedor e dashboard |
| OPS-001 | Roadmap anterior não consolidava as correções #91–#99 e induzia repetição de ciclos pequenos | P1 processo | Esta atualização como registro central | **Corrigido na documentação** | Manter um registro por lote fechado |

**Nota de evidência:** CI verde, Vercel verde, presença de política, validação de código e execução E2E autenticada são verificações diferentes. Nunca somar uma como se provasse outra.

## 3. Execução por macroetapas, com aceite de lote

### Lote A — Encerrar correções independentes de identidades A/B
1. Mapear TODAS as rotas e endpoints com mutação, server actions, RPCs, RLS, Storage e Edge Functions. Classificar por leitor cliente / agência admin / service role interno.
2. Corrigir em lote quaisquer controles divergentes; adicionar testes automatizados (negação por role, falha fechada, validação de tenant, nenhum dado fictício).
3. Executar `npm ci`, testes, checagem de tipos, lint e build no CI; verificar deployment de preview e rollback. Só integrar o PR quando CI **e** Vercel estiverem aprovados.
4. Executar em produção apenas migrações revisadas com verificação posterior e registro da versão. **Não alterar registros reais de clientes para testes.**

**Aceite:** nenhuma função pública de escrita depende apenas de elementos ocultados na UI; nenhuma policy de escrita concedida a perfil cliente sem exceção explicitamente aprovada.

### Lote B — Homologação A/B autenticada (bloqueio externo)
1. Em ambiente operacional protegido, usar **API oficial Supabase Auth Admin** para provisionar duas identidades sintéticas `.test`; as ferramentas conectadas neste chat não têm `auth.admin.createUser`. Não solicitar nem expor service-role/password no chat.
2. Criar duas organizações de teste separadas, memberships viewer, ativos e arquivos privados sintéticos com prefixo UUID; registrar rollback/remoção.
3. Rodar `scripts/verify-production-isolation.ts` com secret store: own-read positivo e cross-read negativo nos dois sentidos, incluindo ativos e signed URLs.
4. Acrescentar prova de tentativas **não destrutivas** de escrita negada (RPC, DML, Storage), acesso a rotas e APIs, expiração/revogação de sessão, callbacks e tokens inválidos. Executar contra **somente fixtures sintéticas**.
5. Sanitizar logs e guardar resultados; excluir fixtures controladamente após aprovação.

**Aceite:** A lê A, B lê B, A não lê/escreve B, B não lê/escreve A, nenhum cliente escreve dados/configurações/admin, administrador opera normalmente, tokens inválidos/revogados falham. Se algum caso falhar, Fase 02 permanece aberta.

### Lote C — Fase 03 produto funcional ponta a ponta
- Consolidar módulos KPI/reconciliação/estado de dados/contratos de ingestão já iniciados nas PRs #83–#89.
- Ligar contratos às rotas/consultas, integrar estados vazios/erro e filtros, confirmar fonte e moeda de cada indicador, testar com fixtures.
- Testar integrações reais por provedor em ambiente autorizado, OAuth, ingestão idempotente e consistência UI/API; não publicar funções ou dashboards compartilháveis antes do gate de segurança.
- TV e links compartilhados somente leitura, com expiração, escopo por cliente e teste de acesso cruzado; bloqueado até Lote B.

### Lote D — Aceite funcional e release
- Matriz de jornadas por perfil (agência x viewer) cobrindo cadastro, vinculação de ativos, integrações, campanhas, dashboard, filtros, CRM, arquivos, TV e relatórios.
- Evidência de test run, build/deploy, segurança, integridade de métricas, responsividade, acessibilidade e rollback.
- Release somente com gates aplicáveis aprovados; incidentes remanescentes classificados com severidade e impacto no release.

## 4. Protocolo contínuo obrigatório

- **Ciclo único de trabalho por objetivo:** implementar → testar → corrigir → validar CI + Vercel → integrar → aplicar migração segura → auditar → atualizar ESTE roadmap.
- **Sem fragmentar artificialmente a entrega em perguntas de autorização.** Pausar somente em bloqueio técnico, de credenciais, de segurança ou falha de gate. O bloqueio entra aqui com condição explícita para destravar.
- **Preservar dados:** nenhum tenant real como fixture. Sem criação manual de identidades em `auth.users`; sem segredos em docs/commits.
- **Sem falsa homologação:** status de fase só muda com evidência comportamental e aceite de todos os gates.
- **Sem execução em background:** cada rodada de trabalho encerra com as alterações feitas e bloqueios declarados; o progresso permanece no GitHub, no mesmo projeto.

### Registro de regressão — 24/10/2026, após PR #100

- **UX-002 / SEC-004 (P1, confirmado):** a rota `src/app/(tenant)/[organizationSlug]/[section]/page.tsx` calculava `canCustomizeClient = superAdmin`, mas `Filters.actions` renderizava `PersonalizeBar` apenas pela presença de blocos personalizáveis, sem testar a permissão. O PR #101 altera o predicado de renderização para `customizable && canCustomizeClient` e acrescenta teste automatizado. **Situação: correção submetida; não encerrar até CI e Vercel aprovados, merge e teste autenticado como viewer.**

- **TEST-001 (P1, 24/10/2026):** Quality Gate #105 e Vercel reprovaram PR #101 porque `tests/client-viewer-ui.test.ts` ainda esperava renderização sem a guarda administrativa; teste corrigido no mesmo PR e ressubmetido. **Encerrar somente após Quality Gate #106 e Vercel aprovados e merge.**

### Execução 24/10/2026 — provisão de tenants A/B para homologação

- **SEC-010 parcial, verificado no Supabase:** 3 usuários Auth, 2 organizações sintéticas novas `homologacao-a-20261024` e `homologacao-b-20261024` provisionadas em uma única transação, cada uma com **uma conta nova distinta** como membro ativo de papel `viewer`. O pré-check exigiu identidades existentes, sem membership anterior e sem colisão de slugs. Consulta posterior confirmou os 2 vínculos.
- Clientes reais: 5 cadastros existentes anteriores; **não utilizados para fixtures**.
- **A/B não homologado ainda:** faltam ativos atribuídos sintéticos, arquivos privados de branding, segredos de autenticação em executor protegido e testes E2E bidirecionais, REST/RPC, Storage, revogação e callbacks OAuth.
- **COMPAT-001:** contas provisionadas possuem e-mails convencionais, mas o executor `scripts/verify-production-isolation.ts` permite somente e-mails `.test`; manter a verificação negativa e adicionar mecanismo de autorização explícita, de uso único e vinculado aos IDs das organizações antes de execução real. **Não alterar ou registrar senhas no repositório.**
- **Limpeza obrigatória:** excluir somente os objetos/associações criados nesta homologação depois da evidência, preservando organizações/identidades reais; confirmar IDs antes de remover fixtures.

### 24/10/2026 — Gate A/B após PR #103

- **PR #103 integrado** (`3370eeff0a44bd06df34bb36ffdb3288688ffb95`): validação de logins das fixtures condicionada a ACK explícito, slugs exatos e IDs de usuários autorizados; Quality Gate #111 e Vercel aprovados.
- **FIXTURE-001 (P0 gate de teste, aberto):** consulta live nas organizações `homologacao-a-20261024` e `homologacao-b-20261024`: **0** ativos em `client_asset_assignments` e **0** objetos privados em `storage.objects` bucket `branding` para ambas. O executor reprovará até preparar fixtures próprias, sem reutilizar dados reais.
- **AUTH-E2E-001 (P0, aberto):** teste autenticado A/B ainda não executado: credenciais dos usuários sintéticos devem estar em secret store de runner autorizado, nunca no chat/repositório. É necessário validar own-read, deny cross-tenant, escrita negada, RPC e Storage, antes de fechar a Fase 02.

### 24/10/2026 — FIXTURE-001: ativos A/B provisionados; branding privado pendente

- PR #104 integrado após Quality Gate #113 e Vercel aprovados (commit `bec21d1cd61b2bf4ae81a6f8aec9bf2d94246157`).
- Em uma transação no Supabase, criadas **duas** conexões sintéticas `meta_ads` pendentes, sem credenciais e marcadas `fixture:true`, dois ativos fictícios inativos e um vínculo por organização `homologacao-a-20261024`/`homologacao-b-20261024` com `sync_enabled=false`. Conferência posterior: **1 ativo atribuído, sincronização desativada** para cada tenant. Nenhuma API externa foi chamada.
- **FIXTURE-001 parcialmente resolvido:** ainda faltam **dois arquivos privados de branding reais** no bucket `branding`, prefixados pelos respectivos UUIDs, criados pela API Storage com credencial administrativa em ambiente protegido. **Não** simular arquivos inserindo diretamente metadados em `storage.objects`.
- **AUTH-E2E-001 aberto:** requer credenciais em secret store e execução do script read-only e dos cenários negativos de escrita/sessão. Marcar como concluído só após provas A/B de leitura positiva e cruzada negativa.
- **Limpeza:** remover apenas as conexões/ativos/vínculos com marcadores `mediahub-phase02-`/`mediahub-fixture-` e organizações de homologação depois do teste, nunca ativos reais.

### 24/10/2026 — Prova RLS transacional A/B (parcial) e PR #106

- PR #106: Quality Gate #117 e Vercel aprovados; integrado à main como `cbb3c305ff8d62c4ade1c2344908265b83b4fd03`. Upload de objetos privados **não executado**, pois credencial de Storage protegida não está disponível via ferramenta conectada.
- **RLS-AB-001 (aprovado para escopo limitado):** executadas transações `BEGIN; set_config('request.jwt.claim.sub', <synthetic-user-uuid>, true); SET LOCAL ROLE authenticated; SELECT ...; ROLLBACK;` independentemente para os dois membros `viewer`. Resultado: usuário A vê organização A=1, B=0, assets=1; usuário B vê organização A=0, B=1, assets=1. Consulta sem JWT autenticado vê zero organizações. **Nenhuma escrita realizada.**
- **AUTH-E2E-001 continua aberto:** teste RLS SQL com identidade simulada não substitui sessão JWT real, client SDK, URLs assinadas, API, OAuth, revogação, escrita negada nem regressão de frontend.
- **FIXTURE-001 continua parcial:** falta upload dos dois arquivos privados por Storage API, com paths `c4c77b35-03a4-417a-94c2-e845d48679c1/phase02-isolation-fixture.svg` e `10289f2d-23b9-4c86-a10e-0503bcc2de79/phase02-isolation-fixture.svg`, executado exclusivamente por runner com segredo protegido.

### 24/10/2026 — tentativa de atualização negada no contexto RLS simulado

- **RLS-WRITE-001 (escopo SQL):** foram executadas transações com `SET LOCAL ROLE authenticated` e claim `sub` de cada identidade sintética; tentativas de `UPDATE` na própria organização, com guarda `ROW_COUNT=0` e `ROLLBACK`, sem persistência. Ambas concluíram sem violação detectada. SQL reproduzível: `scripts/verify-phase02-viewer-denied-updates.sql`.
- **Não confundir com E2E:** não houve login via JWT, chamada REST/RPC nem criação de arquivo privado. Testes negativos por autenticação real, Storage, OAuth e sessões continuam bloqueando Fase 02.

### 24/10/2026 — Gate RPC de importação como viewer

- PR #108 aprovado pelo Quality Gate #121 e Vercel, integrado à main como `74542a080b2753248f3a8bb22689f63de60c1bb2`.
- **RPC-001 (prova transacional SQL):** cada um dos dois viewers sintéticos, com `SET LOCAL ROLE authenticated` e claim `sub` correspondente, chamou `public.import_spreadsheet` na própria organização. A função recusou a tentativa com `insufficient_privilege` (SQLSTATE 42501) conforme verificação de exceção e `ROLLBACK`; nenhum dado persistido. Script: `scripts/verify-phase02-viewer-rpc-denial.sql`.
- **AUTH-E2E-001 permanece aberto:** simulação de contexto SQL não demonstra autenticação JWT real; arquivos privados, sessões reais, API e OAuth seguem pendentes.

### 24/10/2026 — painel administrativo de clientes e níveis de acesso

- **ADMIN-001:** cadastro dedicado de clientes em `/admin/organizations` usando action `createOrganization` protegida por `requireAdmin`, validação de nome, slug, nicho e modelo comercial.
- **ADMIN-002:** `/admin/users` exibe matriz administrativa; configuração de vínculo em `/admin/users/[userId]` disponibiliza apenas `viewer` e ativação/suspensão. A action `saveMember` também aceita exclusivamente `viewer`, além de validar a organização e preservar superadministradores. `super_admin` pertence somente à agência; clientes apenas consultam dashboards, gráficos, relatórios e filtros.
- **PENDENTE DE HOMOLOGAÇÃO:** funcionamento com login real e testes de isolamento e de alteração negada; observar eventuais roles legados (`editor`/`client_admin`) e regularizá-los de maneira controlada. Integrações e dados dos cinco clientes reais não foram alterados neste PR.

### 24/10/2026 — Gestão de contas já cadastradas no Auth

- **ADMIN-003 (implementado para validação):** `/admin/users` lista contas Auth existentes em consulta server-side protegida por `requireAdmin` e credencial server-only, incluindo usuários sem convites ou memberships. Cada conta não privilegiada oferece link para `/admin/users/[userId]`; superadministradores aparecem como protegidos. Falhas de consulta são explicitadas sem abrir permissões.
- Limitação conhecida: diretório inicial exibe até 200 contas; paginação e busca no Auth Admin ficam para escala maior. Nenhuma conta Auth, membership nem cliente real foi alterado por essa funcionalidade.

### 24/10/2026 — matriz de leitura A/B por sete superfícies

- **RLS-AB-002 (aprovado no escopo SQL):** para cada viewer sintético com `SET LOCAL ROLE authenticated` e claim `sub`, sua organização é visível (1); organização, membros, configuração de dashboard, branding, ativos atribuídos, conexões e métricas da outra organização retornam zero. As nove tabelas relevantes examinadas estão com `relrowsecurity=true`. Consultas executadas em transações revertidas; script repetível `scripts/verify-phase02-cross-tenant-read-matrix.sql`.
- **Limites:** algumas tabelas dos fixtures podem estar vazias; zero registros não prova isoladamente todas as regras de leitura. A homologação final ainda requer sessões JWT reais, dados A/B com canários em cada superfície e Storage privado. Não confundir com conclusão de Fase 02.

### 24/10/2026 — Gate único protegido para fechamento da Fase 02

- PR #112 passou Quality Gate #129 e Vercel, integrado em `695da8ec8024ee9ae8c4d062fcacd6e3fa900d25`.
- Workflow manual `.github/workflows/phase02-final-auth.yml` criado para executar upload Storage oficial das duas fixtures sintéticas e o teste real de login A/B na mesma execução, em `environment: phase02-homologation` com aprovações e Secrets. Sem execução agendada e sem valores de senha no código.
- Configurar segredos do ambiente: `PHASE02_SERVICE_ROLE_KEY`, `PHASE02_PUBLISHABLE_KEY`, `PHASE02_A_EMAIL`, `PHASE02_A_PASSWORD`, `PHASE02_B_EMAIL`, `PHASE02_B_PASSWORD`. As contas e UUIDs são fixados no teste; conferir escopo antes da execução. O provisionamento inicial falhará se um arquivo de fixture já existir (`upsert:false`), por segurança: neste caso reexecutar com input `provision_private_fixtures=false` após conferir ambos os objetos.
- **BLOCKER FINAL (operacional):** execução com segredos protegidos e autenticação real ainda não ocorreu. O gate read-only não prova interface, revogação, OAuth e escrita REST; registrar essas pendências separadamente. Não declarar Fase 02 homologada sem evidência do workflow e aceite definido.

### 24/10/2026 — Retentativa segura do gate privado

- **FIXTURE-RETRY-001:** upload da fixture privada passa a tolerar reexecuções parciais: se objeto existir, comparar bytes com a imagem sintética esperada e prosseguir; se não existir (404), criar sem sobrescrever; se houver erro de rede/permissão ou diferença de conteúdo, falhar fechado. Somente os UUIDs sintéticos A/B continuam permitidos. Não prova que os secrets do ambiente foram instalados ou que o fluxo de autenticação foi executado.

### 24/10/2026 — Correção de incompatibilidade MIME do gate final

- **FIXTURE-MIME-001 (identificado):** bucket Storage privado `branding` aceita apenas `image/png`, `image/jpeg`, `image/webp` e tipos de ícones, mas o script final tentava enviar `image/svg+xml`. O upload teria falhado. Corrigidos script e workflow para fixture PNG de 1×1 px em paths fixos `phase02-isolation-fixture.png`. Não executar artefatos anteriores com `.svg`.
- **Fase 02 permanece pendente** da execução real do workflow com segredos protegidos; nenhum objeto foi inserido por esta alteração.

## Atualização 25/10/2026 — Fase 03 e pendências sem bloquear construção

- **SEC-010/011 — P0, aberto:** teste E2E autenticado A/B, arquivos privados e testes de escrita/sessão/OAuth ainda requerem segredos no ambiente protegido `phase02-homologation` e execução manual do workflow. Não declarar homologação; não bloquear desenvolvimento reversível independente.
- **ANA-001 — corrigido e integrado:** PR #119, aviso de desatualização de métricas por fuso horário; CI e Vercel aprovados.
- **ANA-002 — corrigido e integrado:** PR #120, somatórios incompletos não são apresentados como completos, razão inválida não produz NaN/Infinity; testes e deploy aprovados.
- **ANA-003 — corrigido e integrado:** PR #121, impede soma monetária entre moedas distintas e ratios de custo/retorno incoerentes; testes e deploy aprovados.
- **ANA-004 — aberto:** melhorar transparência quando métricas de mídia paga forem parciais e quando score ponderado não tiver peso válido; teste funcional de relatórios por plataforma e revisão de UX ainda necessários.
- **UX-002 — aberto:** jornada visual autenticada de `viewer` com filtros, ausência de dados, teclado e navegação por seções; depende de contas sintéticas e prova de segregação real.
- **Regra de execução:** mudanças independentes podem ser implementadas e submetidas continuamente; somente merge com Quality Gate e Vercel aprovados. Erros registrados aqui antes de eventual adiamento.

- **ANA-005 — correção em validação (PR #123, 25/10/2026):** moeda de origem ausente deve invalidar totais monetários e custos derivados. Primeira execução do Quality Gate falhou porque fixture antiga de `paid-summary-completeness.test.ts` não declarava moeda; fixture sintética ajustada para `BRL` (sem relaxar a proteção de produção). Nova execução do CI/Vercel obrigatória antes do merge.

- **ANA-005 — corrigido (PRs #123 e #124, 25/10/2026):** moeda desconhecida bloqueia indicadores monetários; UI informa o cliente; Quality Gate e Vercel aprovados, merges realizados.
- **ANA-006 — em validação:** média ponderada das métricas do provedor pode exceder o limite numérico em pesos extremos; proteção contra overflow e regressões sintéticas adicionadas. Não há alteração dos dados reais.

- **ANA-004 — implementação em validação (PR #125):** dashboard passa a discriminar valores ausentes por indicador (leads, cliques e impressões), preservando a diferença entre NULL e zero; exige revisão visual autenticada posterior.

- **ANA-006 — concluído (PR #125):** proteção de overflow e transparência de valores incompletos; testes e publicação validados por CI/Vercel.
- **ANA-007 — em validação:** exibir cobertura por indicador nos dashboards, distinguindo valor zero registrado de ausência de dado. Testes sintéticos, sem dependência de login real para build; revisão visual autenticada segue em UX-002.

- **ANA-008 — em validação:** ROI e lucro não podem ser derivados apenas de receita e gasto com anúncios: faltam custos de produto, operação e tributos. Proteção para retornar indisponível até integração de dados financeiros autorizados; ROAS permanece calculável sem deduplicação interplataformas. Teste adicionado.

## Cronograma de entrega — definido em 25/10/2026

**Deadline de entrega do escopo previsto: sexta-feira, 18/12/2026 (America/Cuiaba).** Meta de planejamento, sujeita a validação de capacidade, acessos externos, testes de segurança e homologação; nunca interpretar como autorização para ignorar gates.

| Marco | Prazo máximo | Critério de aceite |
|---|---|---|
| M1 — Fase 03 analytics e dashboards | 06/11/2026 | Indicadores consistentes, painéis por cliente/plataforma, filtros e testes automatizados verdes |
| M2 — Integrações pagas e orgânicas | 20/11/2026 | Fluxos de conexão/seleção de ativos, coleta e contratos de dados, testes de autorização; dependências OAuth registradas |
| M3 — Relatórios, compartilhamento seguro e TV | 04/12/2026 | Relatórios e navegação completos, modo TV e compartilhamento autorizados somente após gate de segurança |
| M4 — Estabilização e testes de ponta a ponta | 11/12/2026 | Build, CI, Vercel, isolamento multi-tenant, acessibilidade básica, regressão e falhas P0/P1 eliminadas ou funcionalidade afetada não publicada |
| M5 — Homologação e entrega | **18/12/2026** | Aceite funcional e de segurança, evidências E2E reais, documentação operacional e rollback, release aprovado |

**Política de atraso e escalonamento:** registrar risco com responsável funcional, impacto, dependência e plano de recuperação no mesmo roadmap assim que identificado. Itens P0/P1 e credenciais externas não fornecidas não são considerados concluídos; entregar apenas o subconjunto efetivamente homologado se a condição não for atendida. Revisar avanço contra os marcos semanalmente e priorizar módulos fechados em vez de PRs isolados.

**Bloqueio conhecido:** SEC-010/011 — homologação A/B com segredos protegidos e ações autorizadas no GitHub; não presumir que a automação horária resolve acesso indisponível.


### 25/10/2026 — ANA-009: comparação percentual numericamente segura (em validação)

- **ANA-009 (P2, engenharia interna reversível):** duas funções de variação de períodos (computeDelta e percentChange) podiam produzir Infinity/-Infinity para entradas finitas extremas. A primeira também podia estourar na subtração antes da divisão, embora a variação matemática fosse representável. Ajustadas para retornar null quando a variação não cabe em number e preservar a variação representável via fallback numérico; adicionados testes sintéticos de overflow, sinais opostos e igualdade.
- **Critério de aceite:** CI Quality Gate e Vercel aprovados, merge seguro e revisão visual autenticada posterior; esta alteração não executa OAuth, migrações, writes em clientes ou homologação A/B. **SEC-010/011 e UX-002 permanecem abertos.**


### 25/10/2026 — ANA-010: integridade de agregação por tenant/moeda (em validação)

- **Falha identificada (P1, código):** `campaigns()` agrupava fatos pelo identificador da plataforma/conta/campanha, sem incluir `organization_id` ou `currency`; a busca de receita CRM também não validava organização e moeda. A origem das consultas atuais aplica filtros, mas o contrato de agregação não era defensivo contra conjuntos mistos. Além disso, `campaigns()` e `query.totals()` inferiam ROI de receita menos mídia, sem custos operacionais.
- **Correção proposta:** chave de campanha com tenant e moeda, vínculo CRM com tenant e moeda, soma numérica finita sem coerção de strings, rejeição de spend agregado inválido, razão finita e ROI `null` na ausência de custos totais. Extrair agregação pura para testes, mantendo reexportação de `query`.
- **Evidência planejada:** testes sintéticos `tests/aggregation-contract.test.ts` e `tests/campaign-isolation-contract.test.ts`; Quality Gate, Vercel e merge condicionais. **Não foi executado E2E com JWT, nem escrita em produção.**
- **Risco e rollback:** se houver regressão em dados de campanha, reverter o PR; revisar a apresentação de campanhas históricas com mais de uma moeda. Não alterar dados de clientes, RLS, OAuth, credenciais ou migrações.
- **Pendências externas inalteradas:** SEC-010/011 (homologação A/B real), UX-002 (viewer autenticado) e integrações com provedores. Deadline 18/12/2026 permanece como meta, não como homologação.


### Ciclo 03 — ANA-004: cobertura e linhagem de métricas ponderadas (código integrado; homologação pendente)

- **Avanço funcional:** cards de desempenho e plataforma mostram cobertura completa/parcial/indisponível, contagem de registros válidos, ausência de valor/peso e método da estimativa. Comparações desses indicadores são omitidas quando algum período não tem cobertura completa.
- **Correção de cálculo:** scores/parcelas deixam de ser somados entre datas. Estatísticas suficientes preservam pesos dos registros de origem e exclusões até o consolidado; dias sem score não emprestam impressões a outros dias. Overflow permanece indisponível, inclusive após reagregação.
- **Validação local:** 189 testes, 135 verificações SQL, lint, tipos, arquitetura e build aprovados; 17 regressões novas de fórmula, origem → campanha → resumo e renderização. Primeiro build falhou por EPERM no diretório temporário do Windows; segunda execução concluiu. **Aceite remoto:** Quality Gate e Vercel no mesmo SHA antes de integrar. Evidências e limites em [18-weighted-metrics-coverage.md](18-weighted-metrics-coverage.md).
- **Integração comprovada:** [PR #142](https://github.com/ednelfelixmt/engaje-social-dashboard/pull/142), head `b322fa8`, Quality Gate #203 e Vercel aprovados; merge na main em `c0a6455`. Preview `dpl_7S1GKrFWA7pcicPJoBPtDJr8fDcp` READY no mesmo head. A homologação visual e de fonte real permanece aberta.
- **Segurança:** cálculo e leitura da interface, sem banco, OAuth, credenciais ou dados reais como fixtures. Não fecha SEC-010/011, SEC-014 ou UX-002. A estimativa ponderada não substitui o consolidado oficial do provedor; normalização de unidade e reconciliação real continuam no contrato de ingestão.
- **Rollback:** reverter somente este ciclo e validar testes/build; os controles de agência e isolamento permanecem obrigatórios. Meta de analytics: 06/11/2026; entrega: 18/12/2026.

## Continuidade 25/10/2026 — auditoria e execução por dependências

Auditoria atual: [15-continuity-audit-2026-10-25.md](15-continuity-audit-2026-10-25.md). Baseline main 010011e: 128 testes, 74 verificações SQL, tipos, arquitetura e build aprovados; lint falha após npm ci sem instalação adicional. Foram consultados últimos commits, PRs/ issues, inventário Edge e Advisor.

**Correção factual:** leitura atual de produção encontrou 3 identidades Auth e 2 organizações sintéticas, além de 5 clientes não sintéticos. Os registros anteriores de somente 1 usuário são históricos. Isso **não fecha** SEC-010/011: falta provar login JWT A/B, negações REST/RPC/Storage, revogação e OAuth.

| Ordem | Item | Dependência / aceite | Meta de planejamento |
|---|---|---|---|
| 1 | DEP-001/002: pacotes críticos/altos; DEV-001 / #49: lint no lockfile | Atualização compatível, npm ci, testes, schema, lint, tipos, arquitetura, build, audit e preview do mesmo SHA | Ciclo atual, antes de novas funcionalidades |
| 2 | SEC-014/015/016: Edge admite papéis legados, settings expõem controles e teste local usa regras antigas | Admin da agência como único escritor; testes negativos de viewer/editor/client_admin e positivos de superadmin; runtime Edge requer rollout próprio | Próximo ciclo de segurança |
| 3 | SEC-010/011, #37/#38/#57/#59 | Segredos protegidos e staging próprio; evidência autenticada e OAuth real | Antes de ampliar acessos/conectores |
| 4 | #54/#65 e ANA-011 (ROI ainda em outros agregadores) | Transações atômicas e contrato financeiro único, sem custos inventados | Antes de homologar gestão e analytics |
| 5 | Analytics #47/#40, ANA-004/007/008 e UX-002 | Reconciliar fontes, calendário e agregabilidade; revisão funcional | 06/11/2026 |
| 6 | Conectores pagos/orgânicos, GA4/CRM #44 | Gates de OAuth, fontes e credenciais oficiais | 20/11/2026 |
| 7 | Relatórios, compartilhamento e TV; #42/#43 | Isolamento real, linhagem, mídia e dimensões autorizadas | 04/12/2026 |
| 8 | Testes e estabilização #39/#50 | Desktop/mobile, teclado, filtros, dados e regressões autenticadas | 11/12/2026 |
| 9 | Homologação e entrega | Aceite dos gates aplicáveis, rollback/restauração e operação | 18/12/2026 |

Durante esta execução foram integrados #128 (cronograma), #89 (datas impossíveis) e #129 (variações finitas, ANA-009). Esta branch foi atualizada com esses merges. PR #13 sobre PostCSS foi superado tecnicamente pela versão 8.5.31 deste lote, mas seu fechamento não é presumido. ANA-007 e proteção ROI de ANA-008 em paidSummary já foram integradas por #126/#127; UX autenticada e contrato financeiro completo continuam pendentes.

### Ciclo 02 — administração exclusiva da agência (código integrado; runtime pendente)

Evidência: [16-agency-admin-boundaries.md](16-agency-admin-boundaries.md).

- **SEC-015:** cinco rotas administrativas de tenant exigem agencyTenant antes de carregar configuração; navegação não exibe controles administrativos ao cliente. Sessão só aceita confirmação booleana explícita de superadmin. Gates/testes de fonte e renderização real preservam leitura e navegação dos dashboards.
- **SEC-014:** POST e callback do Edge usam guards comportamentais testados, exigindo administrador ativo da agência, sem fallback de editor/client_admin. **Runtime ainda pendente**: inspeção v41 confirmou a regra antiga e drift da correção de escopos #59. Publicar/reverter Edge exige revisão do bundle e testes próprios; Vercel não atualiza funções Supabase.
- **SEC-016:** createTestDatabase reproduz as quatro migrações de autorização existentes; verify:schema passou de 74 checks legados para 135 verificações, negando escrita/RPC/Storage a viewer/editor/client_admin e confirmando operações da agência. README corrige o caminho de instalação nova; não executar bootstrap sobre produção.
- **Resultado local:** 159 testes, 135 verificações SQL, lint ampliado, tipos, arquitetura e build aprovados; tipagem específica do helper Edge integrada ao gate. **CI remoto:** 161 testes e 135 verificações SQL, Quality Gate #191 aprovado; Vercel aprovado no head 9a9fcc0. PR #137 integrado como 99008d6.
- **Contenção live:** catálogo mostra 1 superadmin e 2 viewers ativos; zero papéis editor/client_admin. Não há mutação produtiva neste lote. SEC-010/011 e UX-002 seguem abertos; doubles e contexto RLS SQL não equivalem a Auth/Storage HTTP.
- **Ciclo 01 integrado:** PR #131, SHA c5a547c, após Quality Gate #181 e Vercel aprovados no head 2c14e9b. DEP-001/002 e DEV-001 corrigidos no escopo do lote; três alertas moderados seguem na #130.

**Atualização de base:** #133 já integrou agencyTenant e páginas/navegação; o ciclo 02 reaproveita esse gate e acrescenta testes comportamentais, confirmação booleana estrita, Edge e replay SQL. #134 (exportação CSV) foi preservado.

### Ciclo 01 — dependências e Quality Gate reproduzível (integrado, PR #131)

- DEP-001: Next 16.3.7 → 16.4.3, após verificar avisos oficiais e compatibilidade React 18/Node 22.
- DEP-002: PostCSS 8.5.31, Zod 4.6.7 e resolução de transitivas compatíveis; sem audit fix --force. Auditoria inicial: 7 pacotes sinalizados (1 crítico/3 altos/3 moderados). Resultado final será registrado após os gates.
- DEV-001 / #49: ESLint 9.39.1 e typescript-eslint 8.46.0 (mesmas versões do CI anterior) agora no package.json/lockfile; workflow deixa de instalar ferramentas fora do lock. Lint continua incremental.
- Rollback: reverter o commit deste lote e validar dependências/build; não há migração ou mutação em clientes. Reverter dependências reintroduz vulnerabilidades e exige contenção antes de exposição.
- Segurança comercial, UX e Edge não foram homologadas por este lote.

### Ciclo 01 — resultado local

- Instalação limpa por npm ci, lint incremental, 128 testes, 74 verificações SQL, TypeScript, arquitetura e build Next 16.4.3 aprovados. A integração SQL ainda testa bootstrap legado; SEC-016 permanece aberto.
- npm audit: **0 críticos, 0 altos, 3 moderados** (cadeia Tailwind/postcss-nested/postcss-selector-parser). Diferimento rastreado na [issue #130](https://github.com/ednelfelixmt/engaje-social-dashboard/issues/130), meta 11/12/2026, com aceite visual e técnico; não executar compilação de CSS não confiável.
- Nenhuma alteração de esquema, Edge runtime, credencial ou dado de cliente. Quality Gate #181 e Vercel aprovaram o head 2c14e9b; PR #131 foi integrado como c5a547c. Deprecações de React 18, Recharts 2 e ESLint 9 ficam registradas para migração planejada; não foram removidas funcionalidades.

Atualização antes do merge: PR #132 (08a26a3) integrou agregações e isolamento de tenant/moeda, incluindo parte do achado ROI em campaigns/query (ANA-010 da trilha existente). Revalidar esses pontos no novo baseline; a view SQL e a homologação seguem independentes. Não duplicar ANA-010 com novos incidentes.

### 25/10/2026 — SEC-015: configurações exclusivas da agência (em validação)

- **Achado:** URLs diretas de branding, dashboard e integrações renderizavam formulários administrativos para perfis clientes, apesar das Server Actions negarem a gravação. A navegação ainda oferecia links de configurações a viewers. Compartilhamento também aceitava papéis legados client_admin/editor.
- **Correção proposta:** agencyTenant() aplica bloqueio server-side para não-superadmin antes de carregar dados administrativos; branding, dashboard, integrações, diagnóstico de dados e compartilhamento usam esse guard. Navegação omite o grupo inteiro de Configurações para clientes; links e ações de relatórios continuam disponíveis. Testes estáticos verificam todas as rotas e a política de navegação.
- **Segurança e rollback:** não há migração, credencial, OAuth, alteração de permissões no banco ou escrita em registros reais. Reverter somente este PR se a interface administrativa regredir; não afrouxar a guarda de Server Actions. Os testes de negação JWT e jornada visual de viewer permanecem pendentes em SEC-010/011 e UX-002.
- **Gate:** CI Quality Gate + Vercel aprovados no SHA e merge seguro antes de considerar concluída a correção de código. **Não constitui homologação A/B.**

### 25/10/2026 — EXP-001: proteção de CSV contra fórmulas de planilha (em validação)

- **Achado P1:** exportações CSV de campanhas em `platform-analytics-v3` e `business-analytics-workbench` apenas escapavam aspas. Nomes de campanhas/plataformas vindos de fontes externas que começam com `=`, `+`, `-` ou `@` (inclusive após espaços) poderiam ser interpretados como fórmulas ao abrir o arquivo em planilhas.
- **Correção:** serializador compartilhado que mantém BOM, delimitador `;`, aspas e quebras de linha, mas prefixa com apóstrofo células **textuais** que se assemelham a fórmulas; números tipados, inclusive negativos, permanecem numéricos. `NaN` e infinito são exportados como campo vazio, não como métricas fabricadas.
- **Regressões:** `tests/csv-export.test.ts` cobre injeção de fórmulas, whitespace, valores numéricos, aspas, delimitadores, Unicode e ausência de dados. **Gate:** Quality Gate e Vercel do mesmo SHA obrigatórios antes do merge. Revisão de abertura do CSV em aplicativos desktop permanece pendente e não constitui homologação visual.
- **Escopo/rollback:** sem banco, OAuth, Storage, RLS, permissões, segredos ou dados de clientes. Reverter apenas o PR se houver incompatibilidade de importação; nunca remover a proteção de fórmulas sem substituto. SEC-010/011, SEC-014/016 e UX-002 continuam abertos.


### 25/10/2026 — ANA-012: reconciliação CRM por identificador de conta normalizado (integrado)

- **Achado P2:** o agrupamento de campanhas publicitárias já normalizava o prefixo `act_` em IDs de conta, mas a busca de receita CRM comparava identificadores brutos. Para a mesma conta Meta representada como `act_123` na mídia e `123` no CRM (ou vice-versa), a receita real do CRM era ignorada e substituída pela receita da plataforma.
- **Correção integrada:** usar a mesma normalização de identificador na chave CRM e na busca diária, mantendo `organization_id`, plataforma/canal, campanha, data e moeda como dimensões obrigatórias de segregação. Não altera IDs armazenados nem os dados de origem.
- **Regressões:** `tests/campaign-isolation-contract.test.ts` verifica reconciliação em ambos os sentidos e negação para conta, tenant, canal ou moeda diferentes.
- **Aceite de código:** PR #135 aprovado no Quality Gate e Vercel, integrado à main em `792cd0f6cb1403d860fcbd4f71bff5e952b4ab7e`. Homologação com fontes reais e JWT continua pendente em SEC-010/011 e UX-002. Sem acesso a segredos, banco, migrações, OAuth ou dados de clientes.

### 25/10/2026 — ANA-013: cobertura estrita no Engaje Intelligence (PR em validação)

- **Achado P1:** o resumo `business-analytics-workbench` considerava total de leads, cliques ou impressões conhecido se *alguma* campanha tivesse o indicador, substituindo `null` das demais por zero. Isso apresentava somas parciais como completas, além de CPL/CTR potencialmente enganosos. Comparações também podiam produzir `Infinity` em bases extremas.
- **Correção proposta:** extrair agregador puro que exige cobertura completa por indicador; preservar zero explícito, sinalizar ausência de dados como `null`, rejeitar totais não finitos e bloquear razões dependentes. Comparação usa `computeDelta` finito com base positiva. A UI do relatório consome o contrato estrito; não altera fonte, tenant, moeda, RLS, JWT ou permissões.
- **Regressão:** `tests/business-workbench-summary.test.ts` cobre cobertura integral/parcial, zero conhecido, recorte vazio, overflow e variações finitas. Aceite condicionado ao Quality Gate e Vercel do mesmo SHA antes do merge; revisão visual autenticada segue UX-002.
- **Rollback e risco:** reverter apenas este PR se houver incompatibilidade de renderização; preservar a distinção entre métrica ausente e zero. **SEC-010/011, SEC-014 runtime e UX-002 seguem abertos.** Nenhuma homologação autenticada executada por este pacote.

### 25/10/2026 — ANA-014: rankings com escopo único e somatórios completos (integrado, PR #140)

- **Achado P1 (código):** o agregador de rankings somava valores conhecidos de um detalhamento com valores ausentes de outro, convertendo `null` em zero; não verificava se campanhas, anúncios, detalhamentos e metadados de criativos pertenciam ao mesmo tenant ou moeda. Valores de gasto extremos também podiam produzir `Infinity`.
- **Correção proposta:** exigir escopo único de organização e moeda conhecida em toda a entrada; preservar `null` quando qualquer componente do indicador estiver ausente; impedir gasto negativo, não finito ou overflow; usar chaves estáveis com tenant/moeda e conta quando necessário. O agrupamento demográfico entre contas da mesma organização/moeda permanece permitido. Campanhas apenas de catálogo podem manter moeda vazia porque não possuem fatos monetários.
- **Interface:** ordenações por resultados/eficiência/CTR excluem linhas sem o indicador exigido, evitando exibir ausências como zeros nos rankings; a ordenação por investimento continua mostrando linhas com resultado desconhecido como `—`.
- **Testes sintéticos:** `tests/rankings-scope.test.ts` cobre escopo misto (incluindo criativos), moeda ausente/mista, completude, zero conhecido, criativos por conta, overflow e chave de campanha.
- **Aceite:** testes, lint, tipos, build, Quality Gate e Vercel no mesmo head SHA, seguidos de merge seguro; revisão visual autenticada de ranking permanece em UX-002. **Não equivale a teste de isolamento com JWT nem a homologação SEC-010/011.**
- **Rollback:** reverter somente o PR em caso de regressão; manter escopo único e completude como requisitos para alternativa. Sem migrações, alterações de permissões, credenciais, OAuth ou escrita em dados reais.
- **Evidência de integração:** PR #140, head `48e9f72630e41844c1bc8392edcf82614c784f49`, Quality Gate #40229193164 aprovado (testes, SQL, lint, tipos, arquitetura e build); Vercel `success` no mesmo SHA; squash merge na `main` em `945871496863e8ba59d73fdaf2cda3a2ea1bad24`. Homologação autenticada/visual não realizada.

### 25/10/2026 — ANA-015: agregações monetárias não podem converter overflow em zero (em validação)

- **Falha P1 confirmada no código:** `paidTotals` usava `sumKnown(... ) ?? 0` para investimento. Soma vazia, gasto negativo, entrada inválida e overflow podiam se transformar em `0` conhecido; em `reconcilePaidFacts` a validação `Number.isFinite(totals.spend)` aceitava esse falso zero. Overflow de impressões/cliques/leads completos também podia aparecer como dado ausente.
- **Correção no pacote:** gasto consolidado passa a ser `number | null`, mantendo zero real; razões dependentes de gasto inválido ficam indisponíveis. Reconciliação rejeita overflow monetário e de colunas completas, mas preserva ausência legítima em fonte parcial. Dashboards de plataforma/executivo aceitam gasto desconhecido e não mostram participação falsa. Nenhum dado real, banco, RLS, OAuth, Edge ou segredo foi alterado.
- **Testes sintéticos:** regressões de overflow, gasto negativo, zero observado, período vazio e cobertura parcial em `tests/paid-metrics.test.ts` e `tests/reconciliation.test.ts`. **Aceite condicionado** a Quality Gate e Vercel aprovados no mesmo SHA, seguidos de merge; validação autenticada de UI e origem real continua pendente.
- **Risco/rollback:** a UI pode passar a exibir `—` onde anteriormente exibia falso zero; reverter somente este pacote em caso de incompatibilidade técnica, sem restaurar falsa integridade de métricas. **Bloqueios externos permanecem:** SEC-010/011, SEC-014 runtime, UX-002, OAuth e ingestão real.

### 25/10/2026 — ANA-016: cobertura de campanha exige contagens válidas (código integrado; homologação pendente)

- **Falha P2 confirmada no código:** `paidCompleteness` e `paidCoverage` consideravam `NaN`, `Infinity`, `-Infinity` e contagens negativas como valores informados, porque verificavam apenas `null`. Isso podia apresentar cobertura de 100% mesmo com indicadores inválidos.
- **Correção proposta:** somente contagens finitas e não negativas entram como observadas; `0` explícito continua válido, assim como valores fracionários não negativos reportados por modelos de atribuição. A cobertura permanece `null` quando não há campanhas. Os avisos de qualidade passam a contar valores inválidos como ausentes.
- **Regressões sintéticas:** testes de completude e percentual cobrem `NaN`, infinitos, negativos, `null`, zero e frações. Sem alteração de ingestão, fonte, banco, RLS, OAuth, segredos, Edge, papéis ou dados reais.
- **Aceite de código comprovado:** [PR #146](https://github.com/ednelfelixmt/engaje-social-dashboard/pull/146), head `e3cbb9f8c3e6140a62cacd20ad836f687aa1e45b`, Quality Gate #211 (`40238605738`) aprovado (testes, SQL, lint, tipos, arquitetura e build), Vercel `success` no mesmo head; squash merge na `main` em `0e2c4b1e3c0f9a81457f609886581651eb00df86`. A validação visual autenticada e a reconciliação com o provedor continuam pendentes (SEC-010/011, SEC-014 runtime e UX-002).
- **Risco/rollback:** campanhas com contagens inválidas podem passar a mostrar cobertura menor e aviso de qualidade, em vez de um falso indicador de integridade. Em caso de regressão, reverter apenas o pacote; não relaxar o isolamento de tenant nem os controles administrativos. PR #145 permanece independente e exige migração validada antes de qualquer merge.
