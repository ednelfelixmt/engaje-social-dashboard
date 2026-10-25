# ANA-004 — Cobertura e linhagem de indicadores ponderados

Data: 25/10/2026. Engenharia interna, sem homologação de origem real ou UX autenticada.

## Comportamento entregue

Os indicadores de parcela de impressões, parcela no topo, parcela no topo absoluto e qualidade não são aditivos. A agregação anterior somava os valores diários e depois ponderava os totais de campanhas. Agora, cada fato usa valor × impressões apenas quando ambos são finitos e o peso é positivo. Valor zero observado permanece válido. Ausência de valor e peso inválido recebem contadores separados; um registro com ambos ausentes é contado como valor ausente, evitando dupla contagem.

Cada campanha carrega contagem de fatos, peso utilizado e numerador ponderado. O consolidado soma essas estatísticas suficientes, preservando exclusões. Exemplo sintético: score 8 com 100 impressões, um dia sem score com 900 e outra campanha com score 4 e 100 resultam em estimativa 6, com 2 de 3 registros válidos. As 900 impressões excluídas não passam a pesar o score 8. Catálogo sem fatos continua sem indicador. Chamadores legados sem estatísticas recebem cobertura de uma observação agregada por campanha, sem afirmar granularidade diária inexistente.

Os cards de desempenho e os recortes por plataforma exibem cobertura completa, parcial ou indisponível, contagens e a metodologia. Comparação de indicadores ponderados exige cobertura completa nos dois períodos. Valores indisponíveis e overflow não são transformados em zero ou infinito. Médias ponderadas são identificadas como estimativas e podem divergir do consolidado do provedor.

## Contrato e limites

- A cobertura conta registros recebidos no intervalo filtrado; não comprova ingestão de todos os dias, campanhas ou contas do provedor. Não mede percentual de impressões cobertas, pois pesos ausentes impedem conhecer esse denominador.
- A unidade armazenada dos indicadores é preservada. Normalização do payload e confronto com o provedor continuam no contrato de ingestão. A definição oficial de parcela usa impressões elegíveis estimadas, denominador que não está disponível para um consolidado exato: [Google Ads — métricas](https://developers.google.com/google-ads/api/fields/v26/metrics#metrics.search_impression_share).
- Não há alteração de permissões, consultas de autorização, RLS, schema, OAuth, segredos ou registros reais. Grupos de campanhas continuam separados por organização, plataforma, conta, campanha e moeda.
- Overflow é propagado como indisponível em toda a árvore de agregação; não aproveitar apenas o subconjunto que ainda cabe em number.
- Revisão dos componentes: renderização no servidor, texto acessível e visível, sem novo JavaScript de cliente, hooks ou controles de edição. A revisão visual autenticada desktop/mobile permanece UX-002.

## Validação

17 novas regressões: fórmula, zeros, ausência, pesos inválidos, overflow, reaproveitamento das estatísticas entre campanhas, diferenças de cobertura por indicador, compatibilidade e renderização dos componentes reais com doubles explícitos para dependências de layout.

Primeira execução: 186/186 testes aprovados. Tipagem detectou inferência obrigatória do novo campo em campanhas sem fatos; corrigida com o tipo público CampaignPerformance, cujo campo de proveniência é opcional. Nova validação completa obrigatória antes de integrar.

O primeiro build local compilou e validou tipos, mas o Windows recusou mkdir em .next/server/app/_not-found.segments/_not-found (EPERM) durante prerender. A criação direta do diretório funcionou e a segunda execução completou o build com sucesso, incluindo prerender das 9 páginas estáticas. A primeira falha permanece registrada como incidente local de ambiente.

Validação local final: 189/189 testes, 135 verificações SQL, lint ampliado, tipos (incluindo helper Edge), arquitetura e build aprovados. Quality Gate e Vercel devem aprovar o mesmo SHA antes do merge; status e SHA ficam no PR deste ciclo. Rollback: reverter o ciclo e repetir os gates. SEC-010/011 (JWT A/B), SEC-014 (publicação Edge) e UX-002 continuam abertos; não bloqueiam este cálculo puro e sua apresentação.
