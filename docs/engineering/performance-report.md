# EXEC-001 — Relatório executivo privado de mídia paga

Data: 26/10/2026. Rota: /[organizationSlug]/reports/performance.

## Entrega e contrato

Relatório de leitura com investimento, impressões, cliques, leads atribuídos, CTR, CPC, CPM e CPL; comparação por período anterior ou ano anterior; tabelas por plataforma e campanha; impressão local pelo navegador com opção de salvar PDF. A navegação e a rota exigem a página paid habilitada. Nenhuma mutação, credencial adicional, migração ou serviço de e-mail é necessário.

A página autentica tenant e verifica configuração antes das consultas. Clientes recebem apenas sua organização no seletor; somente superadministradores autorizados da agência consultam o catálogo. dashboardData reutiliza paginação e predicados organization_id, currency e datas para cada período. Erros de autenticação não são capturados como falha de fonte. Falhas de leitura ou consolidação não retornam métricas parciais, detalhes internos nem controle de impressão.

buildPerformanceReport valida todas as linhas dos dois períodos, organização, moeda, plataforma e data; rejeita IDs repetidos e grãos duplicados plataforma/conta/campanha/anúncio/dia/moeda. Normaliza exclusivamente o prefixo act_ das contas Meta. Anúncios distintos da mesma campanha/dia continuam fatos independentes. Agrupamentos usam índices em memória; não fazem uma nova varredura de todo o lote para cada campanha. Nomes de campanha seguem o fato mais recente, com desempate pelo ID.

paidTotals preserva zero observado, retorna null para ausência, valores inválidos ou overflow, e calcula razões dos totais. Não há média de taxas. Cobertura representa observações válidas entre registros recebidos; não comprova completude da ingestão. Fonte, períodos exatos, moeda, fuso cadastral, geração e janelas reportadas aparecem no documento. Datas de origem não são convertidas para outro dia.

Leads são atribuições das plataformas, sem deduplicação entre pessoas/canais e sem equiparação a vendas. Variação de leads/CPL só existe com uma janela conhecida por conta e as mesmas contas/plataformas/janelas nos dois períodos. Não calcular receita, ROI, alcance único ou indicadores GA4 a partir destes fatos.

## Impressão

O componente cliente recebe apenas disabled, sem dados de anúncios ou cliente Supabase. window.print é chamado somente pelo clique; não declara que um arquivo foi salvo. Uma classe do documento é adicionada durante a montagem e removida ao sair da rota. CSS de impressão restrito a essa classe remove navegação/filtros, ajusta contraste, largura e quebra das tabelas. Tabelas são HTML, sem dependência de rasterização de gráficos.

Referências primárias: [Window.print](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) e [CSS para impressão](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing). A escolha da impressora ou destino PDF continua sob controle do usuário no navegador.

## Evidência e limites

Baseline: 385 testes. Primeiro pacote: 401 testes aprovados, tipos app/Edge e build aprovados; 140 verificações SQL, arquitetura e nove sondas GET locais aprovados. Um erro de lint no parâmetro não usado de um teste foi corrigido. Validação final: 402 testes sem falhas, lint sem erros/warnings, tipos app/Edge, arquitetura e build aprovados. Nova regressão de navegação e otimização do agrupamento incluídas; gates remotos registrados no PR.

Testes de domínio usam apenas fatos sintéticos. A página real é executada com serviços simulados para testar predicados, sequência de autorização, comparação, ausência e erros. Controles de impressão têm testes de clique, estado desabilitado, erro e limpeza da classe. Esses testes não homologam login real, coleta de provedores, PDF visual ou UX em dispositivo autenticado.

Consulta de proposta (60 s) e revisão independente do diff (90 s) ao Claude Code local terminaram sem resposta, com ferramentas desabilitadas e sem credenciais. Revisão externa indisponível; não presumir revisão conjunta. Codex responde pela revisão e verificações desta entrega.

SMTP permanece adiado por decisão do responsável. SEC-010/011, SEC-014 runtime e UX-002 continuam pendentes. Link público e compartilhamento externo não fazem parte desta entrega. Meta de relatórios/TV: 04/12/2026; entrega geral: 18/12/2026, ambas metas de planejamento.

## Aceite e rollback

Exigir Quality Gate completo e Vercel success/READY do mesmo SHA, diff inspecionado e PR mergeável antes de main. Uma cota Vercel falha mantém o PR aberto; não contornar limite nem integrar usando aprovação de outro commit. Em regressão comprovada, reverter somente este pacote; não modificar fatos, permissões ou recursos existentes.

## EXEC-002 — CSV privado do relatório executivo (26/10/2026)

O relatório executivo oferece `Exportar CSV` ao lado da opção de impressão; ambos exigem o mesmo relatório previamente autorizado pelo servidor. O CSV é calculado do objeto `PerformanceReport` **já consolidado e validado** — sem nova API, consulta, ação de gravação, serviço de terceiros, permissão ou token. Não há link público. O cliente recebe apenas os campos necessários do documento já visível em sua rota privada; identificadores individuais de fatos de origem (`sourceIds`) não são exportados.

Contrato: separador ponto e vírgula, BOM UTF-8, aspas e neutralização de fórmulas de planilha pelo serializador compartilhado; uma linha por resumo/plataforma/campanha e por período atual/comparativo. Cada linha indica datas, fonte, moeda, fuso, modo de comparação, cobertura e contagem de fatos recebidos, janela de atribuição reportada e métricas calculadas. Valores nulos continuam vazios; zeros observados permanecem zero; não somar linhas de resumo/plataforma/campanha entre si. O arquivo é criado localmente apenas após clique, usando `downloadCsv`, e a URL temporária é revogada.

Sem qualquer fato em ambos os períodos, impressão e exportação ficam desabilitadas. Erros de consulta ou escopo continuam sem exibir o relatório e sem exportação. Regiões, clientes e identidades de origem permanecem sujeitos ao mesmo `tenant()`, configuração e RLS existentes.

Aceite: testar serialização/CSV injection, comparação, nulidade, ausência, nome seguro, clique/erro de download, UX SSR e rota autenticada com mocks; submeter Quality Gate e Vercel para o **mesmo SHA**. Limite: testes com mocks não homologam login JWT, PDF visual, ACL real ou medição externa. Rollback: revert isolado do pacote EXEC-002.


Consolidação REL-001 na base posterior a CRM-001: preservar a análise de receita e executar novos gates de todo o pacote. O aviso junto ao download reforça que resumo, plataformas e campanhas representam níveis sobrepostos e não devem ser somados entre si. Testes com parser conferem paridade com os totais canônicos e proteção de campos com aspas, ponto e vírgula, quebra de linha e fórmula.
