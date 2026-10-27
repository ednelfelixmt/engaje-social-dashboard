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
