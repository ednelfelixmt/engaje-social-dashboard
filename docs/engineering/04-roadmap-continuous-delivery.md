# Roadmap de continuidade — 2026-10-22
Status: Fase 00 **ABERTA COM PENDÊNCIAS CONTROLADAS**; trilha Fase 01 **AUTORIZADA PARA TRABALHOS DE FUNDAÇÃO NÃO DESTRUTIVOS**. Não confundir com aprovação de segurança ou release comercial.

## Regra de não paralisação
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
