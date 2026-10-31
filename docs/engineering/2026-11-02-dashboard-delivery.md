# Entrega coordenada do dashboard — meta 02/11/2026

Data de planejamento: 31/10/2026, America/Cuiaba. Segunda-feira = 02/11/2026.
Solicitação: Codex e Claude trabalham em conjunto, preservando o projeto existente.
Status: divisão aceita pelo Claude. Seu checkpoint de insights foi concluído no commit24cabfd e enviado à branch feat/agency-kpi-sparklines-change. Codex consolida os lotes em work/engaje-monday-integration; Claude já iniciou revisão do menu em worktree separado.

## Critério de entrega
Dashboard navegável, alinhado e interativo; KPIs e gráficos reconciliados no mesmo cliente/período/plataforma/moeda; ausência distinta de zero; cliente somente leitura, sem controles administrativos; versão publicada identificável e comprovada no domínio. Nenhum P0/P1 do fluxo entregue pode ser omitido ou declarado homologado sem evidência.

## Responsáveis e limites de edição
- Claude: dono de agency-insights.ts, agency-change-breakdown.tsx, kpi-sparkline.tsx, seu teste novo, navigation.tsx e cards/fluxos visuais de clientes/integrações. Checkout informado: C:/Users/ednel/source/repos/engaje-social-dashboard. Branch local feat/saude-conexoes-meta; entrega remota feat/agency-kpi-sparklines-change. Durante a consolidação, workbench/charts/agency-studio.css ficam exclusivamente com o Codex.
- Codex: coordenação, roadmap, revisão, testes/CI/release e auditoria de dados/integrações. Worktree isolado: work/engaje-monday-delivery; base main b520d7a.
- Antes de cada lote, registrar arquivos e responsável. Nenhum rebase, reset ou cherry-pick sobre trabalho não commitado do outro.
- Rever o diff um do outro. Cliente não escreve dados/configurações. Nenhum segredo no chat, código ou fixture.

## Quadro de execução
| ID | Pri. | Responsável proposto | Tarefa e aceite | Dependências | Estado |
|---|---|---|---|---|---|
| MON-01 | P0 | Codex + Claude | Confirmar checkout, branch, arquivos e trabalho ativo; uma pessoa por arquivo; preservar diffs existentes | Resposta do Claude | Confirmado; posse por arquivo registrada |
| MON-02 | P0 | Claude | Finalizar evolução, comparativos e painel O que mudou; escala/unidade explícitas, inspeção e modo preservado; barras/eixos visíveis no Next | MON-01; PR305 e correções atuais revisadas | Branch24cabfd recebida; revisão Codex e consolidação em andamento |
| MON-03 | P0 | Claude | Alinhar KPIs, cards, rodapés e botões; menu retrátil, logos existentes e fluxos compactos de clientes/usuários/integrações | MON-01; MON-02 | PR305 revisado; menu entregue em 4aff210; revisão de integração em andamento |
| MON-04 | P0 | Codex | Conferir totais, grão, comparação, moeda, calendário e cobertura; faltantes não viram zero; nenhum número inventado | Dados autorizados; contratos atuais | Auditoria iniciada |
| MON-05 | P0 | Codex | Homologar A/B e cliente viewer: acesso próprio permitido, cruzado negado, edição/admin negados; jornadas autenticadas | Ambiente/secrets protegidos, fixtures sintéticas; SEC-010/011, UX-002 | Evidência real pendente |
| MON-06 | P0 | Codex + Claude | Publicar versão aprovada e conferir domínio/SHA; login, filtros, gráficos, retornoTV e erro/vazio | Quality Gate + Vercel no mesmo head; cota; MON-05 para liberação comercial | Produção em rollback91e0474 |
| MON-07 | P1 | Codex | Reconciliar Meta e Google/GA4 por fonte e intervalo; tratar expiração/sem conta/sem registros com estado honesto | Autorizações e ingestão reais | Meta parcial/expirada; Google não homologado |
| MON-08 | P1 | Codex + Claude | RD Station Marketing e CRM: adaptadores, autorização e ingestão auditável; funil só mostra etapas/receita efetivamente recebidas | Aplicativos/escopos/credenciais RD; documentação oficial | Catálogo foundation; integração não homologada |
| MON-09 | P1 | Codex + Claude | Relatórios/CSV/PDF, compartilhamento somente leitura e TV; mesmos filtros/totais; teclado,390px e1920x1080; TV física exige evidência própria | MON-02/04/05; acesso para teste físico | Parcial; PDF/TV física pendentes |
| MON-10 | P0 | Codex | Fechar recibo por item, registrar bloqueios com próxima ação e priorizar um release consolidado | Todos os lotes afetados e gates | Pendente |

## Sequência até segunda
- 30/10: alinhar posse dos arquivos e escopo; inventariar diferenças entre main, PRs, Claude e produção; registrar impedimentos.
- 31/10: fechar dashboard visual e correções de dados; primeira validação conjunta por cliente/filtro/estado.
- 01/11: congelar funcionalidades para o release, executar isolamento/jornadas e revisar relatórios/TV; corrigir bloqueantes.
- 02/11: revisão final, gates e conferência autenticada no domínio; encerrar cada item somente com evidência. Itens sem autorização ou coleta não recebem selo de integração funcional.

Essas datas são metas de execução, não uma afirmação de que dependências externas já foram resolvidas. RD/GA4 e homologação de segurança continuam explícitos no escopo; qualquer desvio precisa ser sinalizado antes da entrega.

## Evidência inicial e riscos
- main b520d7a inclui #303 (séries diretas no App Router) e #304 (histórico oculto). PR305 está aberto para revisão; Quality Gate577 aprovado;967 testes/build local e prova sintética registrados.
- Produção ainda aponta ao deployment aprovado91e0474. Nova produção foi recusada com402 api-deployments-free-per-day. Não contornar limite nem aumentar plano automaticamente; um release consolidado quando permitido.
- PRs302/294/292 devem ser revisados por necessidade atual, sem mesclar patches antigos cegamente;149/157 são legado/documentação ou feature inativa, sem relação automática com o aceite do dashboard.
- RD Station aparece como foundation no catálogo. Meta/Windsor possuem adaptadores no código, mas isso não prova autorização, coleta completa ou consistência em produção.
- Histórico de migrations Supabase (#211), SEC-010/011, UX-002 e validações reais continuam abertos.
- SMTP permanece adiado por decisão do usuário.

## Inventário inicial dos conectores (código; não prova produção)
| Fonte | Backend encontrado | Situação para aceite |
|---|---|---|
| Meta Ads / Facebook / Instagram | sync e OAuth em engaje-integrations | Conferir autorização, intervalo coletado e reconciliação real |
| Google via Windsor | syncWindsor; requer configuração própria | Conferir conta, autorização e cobertura; não equivale a GA4 homologado |
| RD Station Marketing e CRM | catálogo foundation e cadastro preparatório | Sem adaptador de sync observado; não classificar como integrado |
| HubSpot / TikTok | fundação/cadastro | Não classificar como integrado só por haver um card |
| CRM genérico / Stract | contratos e ingestão configurável | Exigir carga autorizada e reconciliação; readiness não equivale a dados recebidos hoje |

A função sync rejeita provedores sem adaptador, antes de registrar conclusão. Não foi confirmada a hipótese inicial de falso sucesso por fallthrough; não criar correção para esse problema inexistente. O diagnóstico de histórico versus coleta atual ainda exige revisão própria.

## Acordo confirmado e próximos checkpoints
- Claude aceitou a divisão e reservou workbench/charts/agency-studio.css ao Codex durante a consolidação. Não há edições concorrentes nesses arquivos.
- O PR305 precisa de atualização após avanço da main304: conflito real em roadmap e testes foi resolvido preservando ambos. O lote24cabfd está sendo integrado em branch isolada, sem alteração do checkout do Claude. Gates antigos não serão reutilizados para o head consolidado.
- Revisão Codex identificou que diferença absoluta de CTR precisa ser exibida em pontos percentuais, com variação relativa separada. Correção solicitada ao Claude, dono do componente novo.
- Menu retrátil já existe; o trabalho confirmado do Claude é corrigir o salto de layout no carregamento e verificar persistência/teclado/mobile, evitando reimplementar o componente.
- Aviso de autorização expirada ao cliente é informativo; reconexão é exclusiva do administrador autorizado. Uma revogação antecipada não pode ser prevista apenas por token_expires_at.
- Relato do Claude: autorização Meta invalidada afeta a cobertura de três contas; outra conexão permanece operante. Evidência relatada pelo revisor, ainda a confrontar pelo Codex; nenhum dado real foi incorporado a fixtures.

## Retomada em 31/10/2026
- Consolidação local 6c17736: 974/974 testes, tipos, lint e arquitetura sem erros. Build inicial ainda sem conclusão; não recebe status aprovado. Novas alterações exigirão novo build final.
- Claude continua ativo na revisão dos gráficos e recebeu mensagem de handoff, preservando a posse dos arquivos. Menu entregue na branch feat/menu-retratil, commit 4aff210, ainda a integrar.
- Prova sintética com React compilado do Next: inclusão das miniaturas elevou o primeiro painel TV a 1080px. Compactados espaçamento e miniaturas apenas no modo TV; nova medição 1034px em viewport 1920x1080, seis KPIs com 164px e sem overflow horizontal. Não equivale a TV física ou produção.
- main avançou a 2ede62f com correções de valores inválidos, ranking, zoom, freshness e truncamento; preservar e revalidar na consolidação.

- Revisão adicional: a nota de exclusões do painel O que mudou ficava oculta pela regra geral de TV. Aplicada exceção para manter a cobertura e o limite de oito clientes visíveis na apresentação.
- Integração do menu4aff210 concluída; 35 testes direcionados passaram. Verificação sintética390x844: sem overflow horizontal, seis cards com192px; gráfico309x260. Modo Linhas foi preservado após entrar/sair do modo TV. Testes completos/build do novo conjunto em execução.

## Checkpoint local consolidado — 31/10/2026
- 1001/1001 testes aprovados, lint e arquitetura aprovados; tipos aprovados e build Next concluído no conjunto com main2ede62f/menu4aff210. Alterações finais de documentação/nota TV exigem gate remoto no head publicado.
- Smoke HTTP local: 19 rotas aprovadas com a origem canônica de recuperação configurada. A primeira execução pressupôs callback localhost e falhou; resposta307 foi inspecionada e confirmou a origem canônica prevista no contrato. Nenhuma autorização foi contornada.
- Domínio permanece no deployment dpl_GrHuGLvbSQBbbAgHo8muf57QJb96. Não declarar o lote aplicado em produção.
- Bloqueante da revisão do lote: delta absoluto de CTR ainda usa % em vez de pontos percentuais no componente novo; ajuste/handoff solicitado ao Claude. Não integrar à main antes da correção e dos novos gates.
