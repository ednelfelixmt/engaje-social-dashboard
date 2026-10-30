# Central de inteligência da agência

A rota administrativa /admin passa a consultar fatos atuais e comparativos após requireAdmin, com paginação das fontes e validação das datas antes das leituras. Clientes pausados e organizações da agência ficam fora das projeções. Não há mudança de schema, RLS, Auth ou credenciais.

## Modelo e cálculos

Cada cliente ativo é validado separadamente por UUID, moeda, origem, identidade de campanha/anúncio, calendário e grão por buildAnalyticsWorkspace. Uma fonte inválida impede o painel analítico parcial; metadados e acessos existentes continuam disponíveis. O modelo agregado tem limite de 3 MB, com orientação para reduzir o período em vez de truncar totais.

- Valores desconhecidos permanecem null; zero observado permanece zero. Nenhum alcance é somado entre clientes/dias e não há ROI financeiro presumido.
- CTR, CPC, CPM e CPL usam numeradores/denominadores agregados, sem média de taxas. Moedas são selecionadas e nunca somadas entre si.
- Comparação alinha posições de calendário. Semanas são blocos de sete dias desde o início de cada período. Meses seguem separadamente os meses de cada período e são alinhados pela posição; datas e cobertura de cada lado ficam na auditoria.
- Leads e CPL históricos/deltas só aparecem com atribuição comprovadamente equivalente em todos os clientes observados selecionados. Cliente sem fatos em ambos os períodos não invalida os demais. Orçamento tem variação neutra; custos menores são favoráveis.
- Séries mensais/semanais somam observações recebidas. A quantidade de dias/clientes observados fica explícita e não comprova cobertura completa.

## Interações

Busca/status de cliente, seleção de cliente, plataforma e moeda atualizam KPIs, evolução, ranking, dispersão, funil e campanhas. Selecionar cliente ajusta a moeda para a moeda desse cadastro; mudar para outra moeda limpa uma seleção de cliente incompatível.

A evolução tem área/linhas/colunas, segundo eixo opcional, legenda do comparativo e Brush visual. Zoom não altera totais nem exportação. O ranking e as bolhas selecionam o cliente por ID original do datum, nunca pelo valor numérico composto pelo gráfico. Nomes clicáveis oferecem alternativa ao uso do mouse. O mix mantém todos os canais da seleção de clientes/moeda como referência e filtra os demais gráficos ao clicar em uma fonte; o comportamento é indicado no próprio painel.

O funil representa eventos agregados em escala visual log1p, sem afirmar coorte ou pessoas únicas. Clicar na etapa escolhe a métrica da evolução. Tabela atual permite busca por cliente/campanha, ordenação, dez linhas por página e link privado ao detalhe já existente por cliente/plataforma/conta/campanha. CSV exporta todo o resultado atual da busca com período, moeda e identidade de origem; não exporta apenas a página e neutraliza fórmulas em textos externos.

Administração, integrações e acessos aos dashboards antigos permanecem. A gestão detalhada dos clientes fica em seção expansível. Modo TV reaproveita o controlador existente e separa panorama, distribuição/eficiência/funil e campanhas; o resumo de campanhas em TV é limitado a seis linhas, sem truncar totais/CSV.

## Validação e limites

Testes cobrem autorização antes das consultas, fontes atuais/anteriores, pausados, falha fechada, moeda, grão duplicado, lacunas, zeros, taxas ponderadas, atribuição, buckets de calendário, seleção cruzada e CSV integral. Provas visuais usam somente fixtures sintéticas locais, fora do app publicado e do banco de produção. Nenhuma organização de homologação foi reativada.

Leitura SQL somente agregada do período de referência confirmou registros Meta/BRL e nenhum erro nas condições de escopo/identidade verificadas; não é homologação de todos os campos nem substitui a validação do modelo. Origens sem registros reais continuam indisponíveis. Não há dado fictício de Google/TikTok para preencher gráficos.

A consulta de proposta ao Claude expirou em 60 segundos; a revisão do diff pela entrada padrão expirou em 90 segundos. Revisão independente não confirmada. Aprovação exige Quality Gate e Vercel no mesmo head, depois main e domínio canônico. UX autenticada real e TV física só podem ser consideradas homologadas após prova específica. RD Station, DAX original, SMTP adiado e demais itens do roadmap permanecem.
