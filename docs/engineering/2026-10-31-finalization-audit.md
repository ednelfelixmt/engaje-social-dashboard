# Finalização do Engaje Mídia Hub — estado verificável

Inspeção:31/10/2026, America/Cuiaba. Base de trabalho:b6977e6. Meta do dashboard:02/11/2026; entrega global planejada:18/12/2026. Metas não equivalem a homologação.

## O que está comprovado

- Projeto existente preservado: Next.js App Router, TypeScript, Recharts e Supabase; domínio analítico separado e testes sintéticos.
- PR305 integrado em18ef4f1 após Quality Gate600/run41199072992 e Vercel success no head1684c6d. KPIs alinhados, modo do gráfico persistente, menu sem salto e CTR absoluto em pontos percentuais.
- Suíte do lote anterior:1005 testes; build/tipos/lint/arquitetura e19 sondas HTTP anônimas aprovados. Isso não prova login, ingestão ou isolamento HTTP autenticado.
- Produção atualizada em31/10 pelo fluxo oficial de promoção do build já existente target=production b6977e6, deployment dpl_AqJWhhAFnZtvMb1Y4NDvyo9Fa8tj. Quality Gate pós-merge41209216663 e status Vercel aprovados, alias/SHA conferidos e19 sondas HTTP externas aprovadas. A sessão administrativa existente abriu a visão da agência;6KPIs de192px,60barras, sem alertas/overflow. Menu recolhido80px persistiu após reload e a preferência foi restaurada.
- A cota API para novas criações permanece registrada (402/retryAfter86400); não foi criado novo deployment nem promovida uma prévia. Plano, proteção e credenciais permaneceram inalterados. A biblioteca deste novo lote ainda não está nessa produção.
- Consulta GitHub de execuções manuais (event=workflow_dispatch):zero execuções retornadas. Não há evidência atual de homologação protegida A/B encerrada.
-18 issues abertas inspecionadas. Issue aberta não significa automaticamente código ausente: várias correções existem e aguardam rollout/homologação.

## Divisão de trabalho

Claude entregou a branch fix/biblioteca-graficos-overflow até f642409, com correções de soma/participação, Pareto, tooltip, zeros, empilhado e histograma. Codex revisou os diffs e executou seus testes. Duas falhas adicionais (moeda do eixo e ponto histórico isolado) foram reproduzidas pelo Codex, corrigidas pelo Claude e entregues em diff textual; os dois arquivos ficaram congelados no checkout dele e o Codex aplicou/testou na integração isolada. O arquivo de coordenação sugerido não existia; nenhuma comunicação automática entre processos foi presumida.

Codex conduz src/components/dashboard/analytics-charts.tsx, agency-intelligence-charts.tsx, testes correspondentes, auditoria de escopo/qualidade, roadmap e integração. Nenhuma edição simultânea nos arquivos do Claude. As branches e checkouts existentes são preservados.

## Fila de conclusão por dependência

| Ordem | Frente | Estado comprovado | Próximo aceite | Responsável / dependência |
|---|---|---|---|---|
|1|Gráficos e leitura dos dados|PR305 publicado; biblioteca16modelos integrada somente no checkout de revisão e testes locais aprovados|Revisão do commit final Claude, unidades corretas, zero/ausência/overflow, datas, teclado e390px/TV; gates no SHA final|Claude implementa biblioteca; Codex revisa e integra|
|2|Correções antigas de gráficos|PR302 e294 ainda abertas; defeitos de histórico oculto e dispersão inválida reproduzidos nesta inspeção|Aplicar apenas patches necessários sobre main atual, mantendo controles/estilos e regressões; não mesclar branches antigas cegamente|Codex; revisão Claude|
|3|Clientes, usuários e integrações|Administração e guardas existentes; diretório já validado anteriormente; nenhuma nova jornada autenticada neste lote|Busca/edição compacta, botões alinhados, erros úteis, viewer sem controles de gestão; confirmação no navegador com contas sintéticas|Claude UI; Codex autorização e jornada|
|4|SEC-010/011, UX-002 (#37/#38/#39/#50/#57)|Contas/fixtures e runners constam do código/runbook; sem execução manual retornada pelo GitHub|A/B: acesso próprio permitido, cruzado negado, escrita/RPC/Storage negados, revogação e UI viewer; evidência sanitizada no ambiente protegido|Codex; pré-requisitos protegidos precisam estar confirmados|
|5|Histórico Supabase (#211)|95 versões remotas/42 locais na triagem histórica; não reconciliadas, backup não comprovado|Plano revisado, backup/rollback e ensaio descartável antes de qualquer reparo; Supabase Preview aprovado|Operação + revisão; nenhuma alteração SQL automática|
|6|Meta e Google|Adaptadores existem; três contas Meta com autorização invalidada segundo relato anterior; Google/GA4 não homologados|Reconexão exclusiva da agência, carga autorizada, cobertura por intervalo e reconciliação fonte→banco→UI|Agência autoriza; Codex verifica; sem tokens no chat|
|7|RD Station Marketing e CRM (#44)|Catálogo foundation; não há sync real homologado|Conexões por produto/tenant, consentimento e tokens privados, paginação/idempotência/refresh, pipeline e cobertura; teste real nos dois produtos|Codex + Claude; depende de#211 e aplicativos/escopos/plano RD|
|8|Relatórios e TV|CSV/print/compartilhamento privados implementados; TV sintética medida|Salvar e revisar PDFs reais, paginação/avisos, navegação e filtros iguais; sessão viewer e TV física separadamente|Codex; revisão visual Claude|
|9|Publicação (#278)|Build produção b6977e6 promovido e conferido; biblioteca nova ainda pendente de gates/publicação|Produção READY do commit aprovado, testes do build de produção, promoção oficial e conferência de alias/SHA|Operação Vercel; sem contornar cota|
|10|SMTP e demais P2|SMTP adiado pelo usuário; mídia privada e sexo×idade têm issues próprias|Configuração/consentimento e evidência quando retomados; manter indisponibilidade honesta até lá|Dependências externas; não bloquear código independente|

## Defeitos e riscos deste lote

- HIST-EMPTY-001: AnalyticsTrend contava histórico oculto como medição atual. Teste sintético reproduziu falha antes do patch e passou depois, mantendo zero observado e recusando valores inválidos.
- SCATTER-FINITE-001: coordenadas negativas/NaN/Infinity e tamanho infinito entravam na dispersão. Duas regressões reproduziram o defeito; patch usa paidMetric e CPL calculado dos fatos, sem mutar seleção. 26 testes direcionados passaram após o patch; gate remoto do conjunto ainda exigido.
- CHART-KIT-OVERFLOW-001: revisão anterior confirmou groupSlices com duas fatias finitas1e308 retornando total0/shares0 e median retornandoInfinity. Corrigido na branch do Claude e revalidado pelos testes de modelos.
- Dependências: npm audit completo retornou11 entradas moderadas ligadas à cadeia minimatch/ESLint/TypeScript-ESLint; nenhuma alta/crítica. npm audit --omit=dev retornouzero. São entradas de dependências, não11 vulnerabilidades independentes. Não executar audit fix --force: a sugestão automática inclui downgrade incompatível do ESLint. Atualização exige lote e regressões próprios. Avisos de depreciação Recharts2/ESLint9 são dívida técnica, não prova de falha explorável no runtime.

## Condição para chamar o software de finalizado

Código implementado, testes e revisão aprovados, produção no SHA certo, papéis/isolamento autenticados, fontes reais conciliadas e jornadas de relatórios verificadas. Não fechar as issues só por haver componentes, catálogo ou testes unitários. Dashboard em02/11 permanece meta com risco explícito nas dependências de produção, segurança e integrações. Não há evidência para prometer entrega comercial completa nessa data.

## Evidência do lote consolidado

-1047/1047 testes completos,23 testes direcionados da revisão/modelos, tipos, lint e arquitetura aprovados. Build compilou e passou TypeScript, mas falhou uma vez por EPERM em pasta temporária .next no Windows; nova tentativa concluiu.19 sondas HTTP do novo build local aprovadas.
- Navegador com React compilado do Next: eixo USD correto; comparativo isolado visível em linha/área/degraus; clique de plataforma atualiza seleção; viewport390x844 real, gráficos313x300 e sem overflow horizontal. Provas usam exclusivamente dados sintéticos.
- A revisão final pelo Claude cobre o diff real de histórico oculto, dispersão inválida e resolução de conflito geográfico; parecer recebido: dispersão, histórico oculto e ajuste do seletor considerados corretos no diff; hipóteses explicitamente separadas. A hipótese de previousDate foi reproduzida por teste e corrigida ao desligar comparação. Zero observado já estava coberto; clique ausente ganhou regressão própria.
- Conflito da biblioteca com main foi resolvido preservando a escala proporcional/zero real de PR314 e o espaçamento do seletor do Claude.
- Nenhum resultado deste lote substitui Auth A/B, revogação, OAuth/ingestão reais, PDF salvo ou TV física.

## Retorno da revisão conjunta

O Claude revisou o diff real de integração, sem comandos/edições. Atribuição histórica versus dispersão corrente permaneceu hipótese: o gráfico descreve medidas atuais observadas, não compara os dois períodos nem mede pessoas únicas; compatibilidade histórica continua exigida nos deltas. Não mudar fatos atuais só por não haver base histórica comparável. A leitura cruzada entre contas/janelas ainda integra a reconciliação real pendente.

A hipótese do eixo foi confirmada: currentDate nulo com previousDate preenchido ainda virava rótulo histórico em comparing=false. Teste falhou com02/09 antes do patch; projeção agora remove também previousDate quando o histórico está desligado. Nenhuma observação de origem é alterada.
