# Referência PBIX — análise e adaptação do Marketing BI

## Leitura realizada

Arquivo PBIX fornecido pelo usuário, cerca de 4,4 MB. Inspeção local/passiva do ZIP, Report/Layout UTF-16, tema e recursos estáticos. Sem atualizar consultas, executar visuais personalizados, transmitir dados a terceiros ou importar registros do arquivo para fixtures/banco. A abertura nativa do Power BI teve autorização expirada; não há alegação de renderização do relatório completo nem de auditoria das fórmulas DAX do DataModel binário.

Foram encontrados 11 registros de páginas: 6 visíveis e 5 ocultos, incluindo variantes e uma página vazia. São 289 contêineres de visuais, incluindo formas, grupos e controles — não 289 gráficos. A área principal usa 1480 × 720; menu usa 1280 × 720.

| Página | Estrutura observada | Situação no arquivo |
| --- | --- | --- |
| Menu | capa/navegação e atualização | visível |
| Visão geral | seis KPIs por canal/consolidado, três áreas e colunas agrupadas, data/fonte/conta/indicador | visível |
| Meta Ads | funil à esquerda, custos CPM/CPC/CPL, série à direita com parâmetros, matriz campanha → conjunto → anúncio | visível |
| Google Ads | mesma composição, conversões e custos, campanha/grupo/anúncio | visível |
| Comparativo | períodos com seletores próprios, snapshots/funis e matrizes lado a lado | visível, com variante oculta |
| Ofensores | cascata por campanha/medida e matriz de variações | visível, com variante oculta |
| Criativos | dispersão CTR/investimento, tabela/imagem, identificação de anúncios e série | oculta |
| Páginas auxiliares | tooltip de criativo e página vazia | ocultas |

Identidade visual: menu lateral preto, área principal clara com cards brancos, cantos arredondados, vermelho #E50914 e cinza/preto para custos/séries. Fundo e formas do funil estão também em imagens estáticas; a largura dessas formas, isoladamente, não comprova conversão ou proporcionalidade aos valores. Tipografia do tema: Segoe UI, títulos 12 e callouts 16.

## Cuidados antes de reproduzir

1. O tema define good e bad em tons vermelhos. No Engaje, resultado favorável continua verde, desfavorável vermelho e investimento neutro. Vermelho de marca não significa resultado ruim.
2. Algumas páginas ocultas de comparativo citam medidas de Meta e Google no mesmo canvas. Isso é risco a investigar, não erro comprovado de dados. Validar filtros e DAX antes de copiar lógica.
3. Os nomes das medidas foram identificados; suas expressões DAX não foram decodificadas/homologadas. O app reutiliza seus cálculos já auditados, não presume equivalência apenas por nome. Conversões Google não são automaticamente leads.
4. Taxas de eventos não são passagem de pessoas únicas. Alcance não é aditivo. CPL/CTR não permitem somar diferenças de campanhas como se fossem volumes.
5. Não foram identificadas páginas de CRM ou demografia no layout examinado. Isso não comprova ausência dessas tabelas no modelo binário; capacidades RD e demografia do Engaje permanecem preservadas.

## Implementação deste ciclo

A Análise 360 ganha Visão BI como apresentação inicial, com páginas Visão geral/Meta/Google/Comparativo/Ofensores. A exploração anterior, funil interativo, público e RD continuam disponíveis. Nenhuma funcionalidade existente é removida.

- KPIs de investimento/leads por Meta, Google e consolidado; consolidado informa inclusão de TikTok conforme recorte, sem descartar uma fonte já suportada.
- Funil compacto, custos, gráfico com dois indicadores e eixos independentes, gaps sem zero, campanha selecionável, filtros canônicos por provedor/conta/campanha, busca/paginação e CSV local completo nos dois períodos. Formas do funil são declaradas ilustrativas, sem taxa inventada.
- Comparativo lado a lado dos períodos atualmente suportados; conta/janela de atribuição explícitas. Não são datas comparativas independentes ainda.
- Ofensores representa variação observada, sem causalidade. A cascata usa somente investimento/impressões/cliques/leads aditivos e campanhas com observações válidas nos dois períodos. Reconcilia ∑ anterior + ∑ diferenças = ∑ atual desse subconjunto, informando exclusões. Ausência não vira zero. Leads exigem atribuição comparável. Ratios não são aceitos como medida da cascata.
- TV mostra o canvas selecionado, resumo de até seis campanhas da página; totais e CSV não são truncados. Celular organiza os painéis verticalmente.

Nenhuma imagem, logo, registro, credencial ou código de visual personalizado do PBIX é incorporado ao app. O layout é refeito em React/CSS/Recharts. Provas visuais usam somente fixtures sintéticas do repositório.

## Próximos itens e dependências

P1: datas comparativas livres → atualizar contratos de query/calendário e testes de escopo antes da UI; hierarquia campanha/conjunto/anúncio → projeção validada dos fatos de origem; criativos/dispersão → fontes/autorização/imagens existentes e testes de cobertura; granularidade semana/mês → agregação auditável com cobertura; paridade de DAX → leitura/homologação do modelo original. Não considerar essas capacidades concluídas neste ciclo.

Permanecem #211 (migrações), SEC-010/011, RD Marketing/CRM reais, país na ingestão, UX autenticada, TV física, PDF e SMTP adiado. Release exige Quality Gate e Vercel no mesmo head final, depois main e produção. O último ciclo encontrou limite de builds da Vercel; não usar Preview de outro SHA como aceite.

## Validação local deste ciclo

883 testes passaram antes da regressão adicional de navegação; build, lint, arquitetura e tipos/Edge Auth aprovados. Prova visual de componentes sintéticos: comparação preservou conta/campanha Meta; duas snapshots refletiram o recorte; cascata informou cinco campanhas comparáveis; celular 390 px sem overflow; canvas TV 1032 px em viewport 1920×1080, um painel visível. Fullscreen nativo retornou indisponível no IAB; não equivale a TV física ou UX autenticada. Contagens/gates finais ficam no PR.
