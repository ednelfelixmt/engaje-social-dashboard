# CRM-001 — Receita externa por fonte e conciliação diária

Data: 26/10/2026. Rota privada: /[organizationSlug]/reports/revenue.

## Produto e escopo

A análise complementa a tela existente de registros/importação, preservada em /external. Oferece quatro indicadores (receita líquida informada, compras, leads e checkouts), comparação por período anterior ou ano anterior e tabela de todos os dias solicitados com conciliação declarada, quantidade de registros, IDs de origem e última sincronização recebida.

A fonte é um filtro de leitura: CRM ou planilha, inicialmente a preferência já configurada pela agência. Mudar o filtro não altera a configuração. As fontes nunca são somadas nem substituídas automaticamente. Os filtros de cliente, período, moeda e comparação preservam a escolha explícita da fonte. Clientes consultam somente sua organização; importações e configurações permanecem exclusivas da agência autorizada.

## Contrato de dados e fórmulas

- Reutilizar dashboardData e sua paginação de 1.000 registros, com ordem por ID e predicados organization_id, currency, metric_date. Consultar comparação somente quando selecionada.
- Autenticar tenant e conferir external em enabled_pages antes de consultar fatos. Fonte inválida é recusada antes das leituras. Erros de autenticação permanecem fora do tratamento de falhas de dados.
- Validar o lote inteiro antes de filtrar a fonte, inclusive linhas da fonte não selecionada: organização, moeda, datas, fonte, canal e grão natural. Rejeitar IDs ou grãos duplicados; normalizar act_ exclusivamente em canal Meta. Campanha vazia é receita não atribuída conforme schema, nunca cópia de total diário.
- Para cada dia, exigir ao menos um registro da fonte e todos os registros recebidos com is_complete === true. Sem isso, os quatro indicadores do dia são indisponíveis. Essa flag é uma declaração do integrador/operador; não comprova auditoria financeira independente ou coleta completa fora do contrato recebido.
- Somar cada indicador com o módulo canônico sum: receita pode ser assinada por estornos; contagens negativas, null, NaN, infinito ou overflow deixam o indicador indisponível. Ausência de um indicador não apaga outro que esteja válido no mesmo dia conciliado.
- Exigir um valor válido em TODOS os dias do calendário solicitado para apresentar o total do indicador no período. Sem um dia, não publicar soma parcial como total. Mostrar dias com valor válido e dias com conciliação declarada separadamente. Zero só existe como observação explícita.
- Comparação usa comparisonPeriod (datas inclusivas, ajuste de 29/02); variação usa computeDelta, sem valor quando a base é zero/ausente ou o resultado não é finito. Não calcular ROI, lucro, ROAS ou causalidade de campanha. Leads e eventos não são pessoas deduplicadas.
- IDs ordenados garantem rastreabilidade determinística. A última sincronização é o maior timestamp entre as linhas recebidas do dia; se algum timestamp for inválido, não exibir data parcial como se representasse o lote. Datas diárias seguem a origem sem conversão; horário de sincronização usa o fuso cadastral.

## Segurança e validação

Rota SSR dinâmica e componentes de apresentação no servidor; nenhum cliente privilegiado, segredo, ação de escrita, link público, RPC nova, migração ou dependência adicionada. IDs de origem são escapados por React. Falha de consulta ou consolidação retorna aviso seguro sem totais parciais, identificadores ou diagnóstico interno. O upload existente não foi reimplementado.

Baseline de main 428975a369456f0ee5e2cae85d6bc59500689be4: 406 testes. Dezessete regressões novas cobrem domínio, página real com serviços simulados, apresentação e navegação. Incluir dez sondas GET anônimas, relatório de receita protegido e cache no-store. Resultado local: 423 testes sem falhas; lint sem erros/warnings, tipos app/Edge, arquitetura, 140 verificações SQL, build e dez sondas GET locais aprovados.

Proposta (60 segundos) e diff (90 segundos) consultados ao Claude Code local sem ferramentas/segredos, sem resposta nos prazos; revisão independente indisponível. Codex revisou o código e responde pela verificação. Revisão por outro agente e testes sintéticos não homologam JWT A/B, Storage HTTP, dados financeiros reais, integradores ou UX autenticada.

Documentação oficial consultada: [filtros](https://supabase.com/docs/reference/javascript/using-filters), [paginação range](https://supabase.com/docs/reference/javascript/range), [changelog](https://supabase.com/changelog). Alterações recentes de grants para tabelas novas não modificam as tabelas existentes; este pacote não cria tabela, extensão ou configuração TLS. A revisão de plataforma completa continua operacional, sem inferir homologação deste módulo.

## Aceite, dependências e rollback

Exigir Quality Gate completo e Vercel success/READY no mesmo head, diff inspecionado e PR mergeável para integrar. Não contornar limites de build. Em regressão comprovada, reverter somente CRM-001, preservando importações, dados e políticas.

SMTP adiado pelo responsável. SEC-010/011, SEC-014 runtime e UX-002 permanecem abertos; não ampliar acesso comercial nem declarar o app homologado por estes testes. Relatórios/TV até 04/12/2026 e entrega geral 18/12/2026 continuam metas de planejamento.


## CRM-002 — CSV privado de receita externa (26/10/2026; submetido para validação)

- **Escopo:** exportar apenas o relatório CRM-001 já autorizado em `/[organizationSlug]/reports/revenue`, mediante clique. O CSV é serializado no servidor a partir do `RevenueReport` calculado depois de `tenant()`, `dashboardConfig()` e dos filtros de organização/moeda/período. Nenhuma consulta ou chave é enviada pelo exportador cliente.
- **Contrato:** UTF-8 BOM, delimitador ponto-e-vírgula, versão e campos explícitos de organização, fonte CRM/planilha, moeda, fuso cadastral, modo de comparação, janela, cobertura (dias com valor válido e conciliação declarada), total por período e registro por dia. Os níveis total e dia são **sobrepostos**, não somáveis; zeros conhecidos permanecem zero, receita negativa (estorno) permanece assinada, dados ausentes permanecem células vazias. Sem IDs individuais de registros no arquivo (a rastreabilidade permanece exclusivamente na tela privada).
- **Segurança:** sanitização dos campos de texto contra fórmulas de planilha com `serializeCsv`; nome de arquivo limitado e sem path traversal; erro local sem mensagens internas; botão desabilitado quando ambos os períodos estão sem registros. CSV de uma única fonte por vez, sem somar receitas de fontes distintas, moedas ou períodos. Não ativar download sem clique; não adicionar endpoint, permissão ou escrita.
- **Regressões sintéticas:** `tests/revenue-report-export.test.ts` verifica parser real do arquivo, totais canônicos e dias, fonte explícita, ausência/zero, estornos, IDs omitidos, neutralização de fórmulas, nome seguro, download por clique e erro. Testes de apresentação e página verificam botão habilitado/desabilitado, autenticação simulada e ausência de exportação nos estados de falha. ESLint incremental inclui as novas unidades. A execução real pertence ao Quality Gate remoto; nenhum teste autenticado A/B ou UX real foi efetuado nesta implementação.
- **Aceite:** Quality Gate completo (testes, SQL/schema, lint, tipos, arquitetura, build, HTTP), status Vercel `success`/preview `READY` no mesmo SHA, PR mergeável e revisão do diff antes de integração. A falha `build-rate-limit` impede merge, sem bypass. Rollback: reverter exclusivamente CRM-002 em regressão; preservar dados reais, RLS, Auth, Storage, Edge, perfis e funções já existentes. SEC-010/011, SEC-014 runtime e UX-002 continuam pendentes.
