# Engaje Intelligence — Especificação inicial de requisitos (SRS)
Versão 0.1 — BASELINE EM REVISÃO. Requisitos sujeitos à validação de negócio e segurança. Critérios de aceite são obrigações objetivas.

## Propósito do produto
SaaS multicliente de marketing analytics, inteligência comercial e growth. O usuário deve **navegar, analisar, compreender, interagir e agir** com dados rastreáveis sem precisão fictícia.

## Requisitos funcionais
| ID | Requisito | Critério mínimo de aceite |
|---|---|---|
| FR-001 | Convite/autenticação e recuperação de conta | Fluxo E2E seguro; não conceder acesso ao aceitar convite sem autorização separada |
| FR-002 | Empresas/agências e associação de ativos | Ativos pertencem à empresa autorizada, sem listagem indevida em outras empresas |
| FR-003 | RBAC+ABAC por operação/empresa | Testes negativos cruzados em rotas, banco, exportação e storage |
| FR-004 | OAuth e conectores | Erros, escopo, renovação, reprocessamento e limites auditáveis; não inventar sucesso |
| FR-005 | Coleta por data/campanha/conta | Upsert idempotente e tracking de execuções, sem duplicações |
| FR-006 | Contratos de qualidade | Lacunas, valor zero, null, períodos e moeda distintos |
| FR-007 | Catálogo semântico de métricas | Fórmulas versionadas com dimensões e granularidade explícitas |
| FR-008 | Análise executiva | KPIs, período, comparativo, origem, últimos dados e drill-down |
| FR-009 | Mídia por plataforma | Campanhas, público, criativos e funis, apenas dimensões realmente recebidas |
| FR-010 | Web e marketing orgânico | Dados da fonte identificada; estados vazios verificáveis |
| FR-011 | Comercial/CRM | Estágios, oportunidades e vendas; atribuição transparente |
| FR-012 | Nichos e funis configuráveis | Presets editáveis, regras e histórico de mudanças |
| FR-013 | Gráficos profissionais | Visualizações responsivas, legenda, tooltip, tabela e unidade; sem distorções |
| FR-014 | Interatividade | Filtros coerentes, contexto preservado, navegação teclado, estados de erro |
| FR-015 | Decisões e Growth | Evidência, hipótese, responsável, ação e medição posterior |
| FR-016 | Relatórios/exportações | Reprodução de filtros, data lineage e permissão de acesso |
| FR-017 | MCP/IA | Escopo de tenant e usuário herdado; escrita controlada por aprovação |
| FR-018 | Administração e auditoria | Quem fez o quê, quando, em qual empresa e qual efeito |

## Requisitos não funcionais
- NFR-SEC: controles ASVS, RLS, MFA administrativo, secrets manager, logs protegidos; pentest e testes de isolamento antes de SaaS comercial.
- NFR-DATA: qualidade por fonte, última atualização, reconciliação, integridade das moedas, tratamento de dados ausentes.
- NFR-OPS: telemetria, retries, DLQ quando apropriado, backups, restauração testada, runbook de incidentes.
- NFR-UX: WCAG 2.2 AA como meta de projeto; navegação por teclado, responsividade, tooltips acessíveis e estados vazios.
- NFR-PERF: definir SLIs/SLOs mensuráveis por operação **após baseline instrumentado**, sem prometer números arbitrários.
- NFR-DEV: módulos coesos, testes automatizados, code review, contratos tipados, migrações, CI e verificações de regressão visual.
- NFR-PRIV: LGPD, minimização, retenção, contratos controlador/operador e resposta a solicitações de titulares.

## Definição de sucesso da jornada
1. Entrar com autenticação segura.
2. Selecionar apenas empresas autorizadas.
3. Ver período, cobertura e origem dos indicadores.
4. Filtrar, comparar, abrir campanha/segmento e entender cada cálculo.
5. Identificar anomalia com evidências e hipóteses, nunca causa fabricada.
6. Criar decisão/tarefa e avaliar o resultado ao longo do tempo.
7. Exportar relatório com os mesmos dados e autorização.

## Fases e ordem aprovada
00 diagnóstico/requisitos; 01 fundação de código; 02 identidade/segurança; 03 dados; 04 conectores/API/MCP; 05 motor analítico; 06 Design System/UX; 07 biblioteca de gráficos; 08 dashboards; 09 demografia/nichos/funis; 10 growth/relatórios/homologação.

**Proibição:** concluir fase por build READY, teste isolado ou print estático. Cada fase deve produzir evidências técnicas + visuais + funcionais + segurança + dados aplicáveis.
