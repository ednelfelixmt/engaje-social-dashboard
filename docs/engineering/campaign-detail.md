# CAMP-001 — Detalhamento privado de campanha

Data: 26/10/2026. Rota: /[organizationSlug]/reports/campaign, habilitada por paid.

O relatório executivo oferece acesso ao detalhe de cada campanha, identificado por plataforma, conta e campanha, preservando datas, moeda e comparação. Identificadores são strings opacas; somente o prefixo inicial act_ da Meta é normalizado. Seletores incompletos, plataformas desconhecidas, controles, identificadores excessivos e aliases Meta ambíguos são recusados. Não criar link para identidade que não pode ser selecionada sem ambiguidade.

## Leitura e segurança

Autenticar tenant antes da configuração; conferir organization_id da configuração e paid antes de ler fatos. A consulta de anúncios preserva organização, moeda, datas, plataforma, campanha e conta em cada página e nos dois períodos. Meta usa in(account_id,[id,act_id]) do SDK; os demais provedores usam igualdade literal. Nunca montar expressão SQL/or com IDs externos. O seletor não pode acompanhar leituras de CRM, orgânico, breakdowns ou catálogo de campanhas.

O domínio verifica todas as linhas recebidas, recusando outro tenant, moeda, data, plataforma, conta ou campanha. Reutiliza a validação existente de fatos duplicados por anúncio/dia/moeda, incluindo alias Meta. Em falha de origem ou escopo, a página oculta valores e impressão e exibe erro sem diagnóstico interno. Apenas administradores da agência recebem catálogo de organizações; clientes consultam e filtram a própria organização. O detalhe não introduz mutações ou privilégios.

## Valores e cobertura

Oito indicadores: investimento, impressões, cliques, leads atribuídos, CTR, CPC, CPM e CPL. Cartões exibem SOMENTE os valores observados nos registros recebidos e sua cobertura; não afirmam coleta integral. Um componente ausente, negativo ou não finito invalida apenas o total dependente; overflow permanece indisponível. Razões usam somas de componentes, sem média de taxas.

As tabelas exibem cada dia do calendário atual e comparativo, contagem de registros e anúncios distintos. Dia sem fato fica indisponível, nunca zero presumido. Zero observado continua zero. Uma comparação percentual exige componentes conhecidos em todos os dias de ambos os períodos; leads/CPL também exigem janelas de atribuição conhecidas e equivalentes por conta. Denominador zero não gera taxa, mas componentes diários zero podem integrar uma razão agregada válida. Presença diária não prova completude de todos os anúncios.

Não inferir pessoas únicas, vendas, receita, lucro, ROI ou alcance deduplicado. Datas seguem a fonte; fuso cadastral e geração UTC são explícitos. Valores pequenos mantêm seis casas ou notação científica para evitar zero visual fabricado. Impressão/PDF é acionada pelo usuário com o controle existente e desabilitada quando ambos os períodos não têm fatos. Nenhum link público, armazenamento de documento ou envio por e-mail.

## Evidência e limites

Fixtures sintéticas. Testes do domínio, renderização, página real com dependências simuladas e URLs produzidas pelo SDK Supabase real verificam seleção, paginação, nulos, zeros, overflow, comparação, aliases, duplicação, falhas e isolamento. Essas execuções não homologam sessão JWT real, Storage HTTP, coleta dos provedores, impressão visual ou UX autenticada. Nenhuma migração, dependência, Auth, RLS, Storage, OAuth, Edge ou dado de cliente foi alterado.

Revisão e resultados do lote REL-002 estão no roadmap. Integração exige Quality Gate e Vercel success/READY no mesmo SHA; produção deve ser confirmada por SHA/alias. Rollback: reverter os arquivos CAMP-001 e links do executivo sem afetar os demais relatórios e dados.


## CAMP-002 — CSV local da campanha

O detalhe autorizado gera o CSV no servidor a partir do mesmo CampaignReport da tela, sem nova consulta ou endpoint. O navegador recebe apenas o arquivo pronto e o baixa mediante clique; botão desabilitado quando nenhum período possui fatos e erro anunciado sem diagnóstico interno. Não exportar IDs individuais de anúncio/fato, credenciais ou membros. Conta/campanha/plataforma permanecem como identidade do recorte já autorizado.

CSV versão 1, UTF-8 BOM e ponto-e-vírgula. Para cada período há uma linha total_observado_recebido, uma periodo_componentes_completos e uma dia para cada data solicitada. São níveis SOBREPOSTOS e não somáveis. O observado usa os mesmos totais estritos dos registros recebidos; o segundo nível só disponibiliza cada métrica quando os componentes existem em todos os dias. Isso não comprova que todos os anúncios da origem foram coletados. Não inferir atividade zero em lacunas.

Oito métricas existentes, sem indicadores novos. Razões usam somas de componentes. Cobertura em dias, registros, anúncios distintos e janelas de atribuição do PERÍODO são metadados repetidos, não parcelas adicionais. Registros/anúncios diários são identificados separadamente. A linha de calendário completo ATUAL é a única que pode conter variações percentuais; usa campaignDelta, sem base zero, dados incompletos ou atribuição de leads/CPL incompatível. A coluna ctr_pct é o nível de CTR; variacao_ctr_pct é a mudança relativa percentual de CTR, não uma diferença em pontos percentuais.

Indisponibilidade é célula vazia; zero recebido é número zero, inclusive em contagens explícitas de registros. Valores decimais não são arredondados pelo CSV. Datas seguem a fonte, fuso cadastral e geração UTC são explícitos. Nome de arquivo limitado e sem diretórios; importar identidades como texto no leitor de planilha para preservar seus caracteres e dígitos.

O serializador compartilhado neutraliza texto com prefixos de fórmula, controles e formatadores Unicode, inclusive variantes largas. O quoting e apóstrofo reduzem exposição na importação inicial; não há garantia universal por leitor ou após salvar/reabrir planilhas. Não afirmar execução de Excel/LibreOffice nem homologação autenticada a partir de testes do parser CSV. Referência de ameaça: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).

Aceite do lote REL-003: testes de parser real para paridade com domínio em todos os níveis/períodos, cobertura, atribuição, nulos/zeros/overflow, metadados, escaping, IDs omitidos, nome seguro, clique/erro e página sem exportador em falha de escopo. Gates remotos novos do head final obrigatórios. Reverter apenas CAMP-002 em regressão, preservando CAMP-001 e a proteção comum SEC-CSV-001.
