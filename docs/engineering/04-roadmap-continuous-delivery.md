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
