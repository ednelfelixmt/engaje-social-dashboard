# Studio de relatórios — UX-STUDIO-001

## Entrega

Análise 360, central de relatórios e relatório de funil recebem superfície clara por padrão: branco/cinza azulado, violeta, teal e cores próprias dos indicadores. Aparência noturna azul opcional, salva apenas como preferência de navegador; falha de localStorage não interrompe a consulta. O wrapper se limita às três rotas. Branding salvo, demais áreas, Auth e permissões não são alterados. O fundo de branding não é usado nessas superfícies para preservar contraste; permanece cadastrado e nas demais áreas.

KPIs clicáveis mudam o indicador da série principal. Minisséries usam somente os pontos diários já validados; escala independente por indicador, lacunas interrompem a linha, zero observado continua visível. O gráfico alterna área/colunas e janela visual de 7, 14 ou todos os dias. A janela altera a visualização, sem mudar totais, CSV ou filtros de período. Quando reduzida, o contexto permanece visível inclusive em TV.

Funil visual compartilhado entre Análise 360 e relatório: escala log1p explícita por padrão ou linear, relativa ao maior valor dos dois períodos. As formas mostram indicadores independentes, inclusive quando uma etapa posterior cresce; não fabricam coortes, taxa de passagem, perdas ou vendas financeiras. Zero e ausência têm representações distintas. Seleção de etapa abre resultado/custo/cobertura/referência no detalhe. Períodos não provam janelas equivalentes. O relatório mantém cards, origem, CSV e impressão existentes; o explorador é excluído da impressão.

Central: busca por título/descrição, categorias e contador de relatórios habilitados por configuração. Disponibilidade não é conexão. Módulos desabilitados não ganham links pela busca. GA4 continua em preparação. Sem novos endpoints, queries, dados ou tokens.

## Acessibilidade e desempenho

Elementos interativos usam botões/selects, nomes e estado aria-pressed, foco visível, mensagens de resultado e detalhe aria-live. Verde/vermelho continuam semânticos com setas/texto. Respeitar movimento reduzido; as séries principais não animam os valores. SVGs locais com IDs de gradiente únicos, sem novos pacotes ou assets externos. Entradas se adaptam a celular; tabelas mantêm scroll próprio. TV herda o tema e conserva seus controles.

## Evidências deste ciclo

871 testes locais aprovados, incluindo seleção do KPI, janela visual/colunas, escala/detalhe do funil, lacunas/zero, aparência sem storage e busca sem ampliar autorização. Tipos/Edge Auth, lint e arquitetura aprovados. Build aprovado na repetição após EPERM na pasta de prerender do workspace Windows; nenhuma proteção do sistema foi alterada. CI e Vercel finais serão registrados no PR.

Fixture visual isolada de componentes reais, com dados sintéticos identificados: KPI → gráfico, sete colunas após janela de sete dias, detalhe de leads/CPL, alternância clara/noturna, filtros corrigidos de baixo contraste, busca Meta e categoria Conteúdo; largura 390 px sem overflow da página. Sete painéis TV couberam na viewport de teste. Essas provas não equivalem a UX autenticada completa ou televisão física. Build local: 28 verificações HTTP autenticadas A/B e 19 anônimas passaram; produção será validada separadamente no release.

## Consulta ao Claude e revisão

A pedido do usuário, Claude CLI foi consultado antes de implementar, com proposta de design e contexto técnico mínimo, sem credenciais. Respondeu 401: OAuth access token has expired. Revisão independente indisponível; Codex implementou e revisou conforme AGENTS.md, sem alegar colaboração ou aprovação do Claude.

RD Marketing/CRM reais, país, #211 e homologações SEC-010/011, UX autenticada, PDF visual e TV física permanecem no roadmap. SMTP continua adiado.
