# GOAL-001 — Consulta privada de metas e referências

Data: 26/10/2026. Rota: /[organizationSlug]/reports/targets, habilitada pela página paid.

## Escopo funcional

Consultar as dez referências globais existentes em dashboard_configs. Quatro recebem valores observados de anúncios: investimento, leads atribuídos, CPL e CTR. As demais continuam visíveis, com a dependência necessária quando cadastradas: frequência requer audiência deduplicada; ROI custos completos; ROAS/CPA receita ou compras verificadas com escopo compatível; receita/compras exigem sua fonte conciliada. Não substituir vendas por leads nem investimento por custo financeiro completo.

Não há vigência nem moeda própria nas referências atuais. A tela compara numericamente apenas o recorte escolhido e interpreta referências monetárias na moeda cadastral atual da organização. Não declara meta mensal atingida, ritmo esperado, projeção, orçamento correto ou desempenho favorável. Nenhum alerta, e-mail, cron, alteração de meta ou nova integração foi criado. A falta de vigência permanece pendência de modelagem antes de automatizar acompanhamento temporal.

## Contrato de cálculo

1. Autenticar tenant e ler sua configuração. Verificar organization_id do cadastro e paid antes de consultar fatos. Clientes têm somente a própria organização no filtro; apenas superadministradores da agência recebem catálogo de clientes e link de edição. A rota de configuração mantém a autorização administrativa existente.
2. Reutilizar dashboardData com ads=true, predicados organization_id/currency/datas e paginação ordenada por id. Comparação com outro período é desabilitada, pois esta consulta é com uma referência cadastrada. Não consultar CRM, dados orgânicos ou credenciais de integrações.
3. Reutilizar buildPerformanceReport para validar escopo, datas, plataforma e grão anúncio/dia/moeda, incluindo IDs e aliases Meta duplicados. Validar também o organization_id das referências no domínio puro.
4. Exigir componentes válidos em todos os dias do calendário solicitado para disponibilizar cada indicador do período. Zero é observado; um dia sem fatos não é presumido zero. Cobertura é por indicador: null/negativo/não finito em leads não invalida automaticamente um investimento válido. Soma em overflow continua indisponível.
5. CTR/CPL são razões dos totais canônicos. Um denominador diário zero não invalida a razão do período quando os componentes desse dia são conhecidos e o denominador agregado é positivo. Não fazer média de taxas. Leads/CPL exigem uma janela reportada conhecida por conta; não representam pessoas únicas.
6. Não comparar qualquer referência com uma moeda filtrada diferente da moeda cadastral, pois se trata de outro subconjunto de fatos da organização. Mostrar as unidades e os valores observados separadamente, sem conversão cambial ou diferença calculada.
7. Aceitar referência zero, mas nunca converter strings/booleanos/vazios em números. Valores precisam ser números finitos e não negativos, exceto a referência de ROI, cujo cadastro já admite sinal e que permanece sem cálculo. Ausência e cadastro inválido são estados distintos.
8. Apresentar posições neutras abaixo/igual/acima e diferença absoluta finita. Não colorir investimento maior ou menor como bom/ruim. CTR usa diferença em pontos percentuais. Referências sem vigência não autorizam conclusão de cumprimento mensal.
9. Exibir até seis casas e notação científica para valores não nulos menores que 0,000001, evitando transformar observações subcentavo em zero visual. Limitar agregados por checks de finitude, sem truncar dados de origem.

Cobertura informa somente os componentes recebidos, não a completude de todas as contas/anúncios da origem. Datas seguem a fonte sem conversão; fuso cadastral e geração UTC são explícitos.

## Segurança, erros e evidência

Apresentação no servidor, nenhum cliente Supabase privilegiado ou dado secreto enviado ao browser. Filtros de leitura usam o componente existente. Configuração de outro tenant é recusada antes de fatos; erro na leitura/consolidação retorna aviso seguro sem valores parciais ou diagnóstico interno. Nenhuma mutação, migração, dependência, grant, RLS, Storage, OAuth ou Edge foi alterado.

Baseline main b8b96b9a38c545d1532aea64d762bf1ac017c64f: 437 testes. Pacote final: 458 testes (21 novas regressões), lint, tipos app/Edge, arquitetura, build e 140 verificações SQL aprovados. Testes usam somente fatos sintéticos e a página real com serviços simulados; não homologam JWT A/B, Storage HTTP, coleta de anúncios ou navegação autenticada. Onze sondas HTTP incluem negação da nova rota e cache no-store; resultado no PR.

Revisão de proposta e diff solicitada ao Claude Code local com ferramentas desabilitadas, sem segredos, sem resposta em 60/90 segundos. Revisão independente indisponível; Codex responde pela implementação/revisão/verificação. O aviso prefetch do teste de navegação foi corrigido no mock; não era falha de produto.

Componente legado ExecutiveIntelligence contém conversões de ausência para zero e inferência de ritmo/projeção pelo período filtrado. A inspeção encontrou apenas definição e import, sem montagem atual no src; não foi confirmado incidente de cliente. A nova tela não depende dele. Revisar seus contratos antes de reativação.

## Entrega e pendências

Exigir Quality Gate completo e Vercel success/READY do mesmo head, diff inspecionado e mergeabilidade antes de main. Agrupar a entrega; não tentar publicação alternativa ou mudança de plano em caso de cota. Confirmar produção por SHA/alias e executar onze sondas após READY. Código integrado não equivale a publicado ou homologado.

Em 26/10, produção b8b96b9 / dpl_12QmkMfrSngcbKhC4LP7go4Kg1wY foi confirmada READY com domínio atribuído, incluindo REL-001 e FUN-002; o bloqueio anterior de produção d4afb7d foi superado por publicação posterior. Isso não garante disponibilidade de cota futura. Consolidar o registro pendente do draft #182 neste pacote antes de encerrá-lo como substituído.

SMTP adiado. SEC-010/011, SEC-014 runtime, UX-002, ingestões reais e homologação financeira permanecem pendentes. Vigência/moeda versionada das metas requer desenho e validação próprios. Metas de planejamento do projeto permanecem: analytics 06/11, integrações 20/11, relatórios/TV 04/12, estabilização 11/12, entrega geral 18/12/2026.

Rollback: reverter apenas GOAL-001 em regressão comprovada, preservando configurações, dados, receitas e relatórios existentes.


## GOAL-002 — CSV local de referências (proposto para gates em 26/10/2026)

O mesmo relatório privado autorizado pelo servidor agora fornece um CSV local, sem endpoint de exportação, permissão adicional ou escrita. O objeto `TargetReferenceReport` já validado gera exatamente dez linhas, uma por referência; cada linha explicita campo, indicador, valor observado, referência, diferença somente quando comparável, estado, motivo, dias com componentes, dias esperados/recebidos, registros, janela de datas, fuso e moedas separadas. Nenhum ID bruto de anúncio, identidade de membro, token ou fato individual é exportado.

Os valores observados continuam distintos das referências cadastradas; zero observado é zero, indisponibilidade é célula vazia. Divergência de moeda não gera diferença, e referências sem origem válida não viram observações. Não somar linhas nem interpretar os valores como metas mensais, porque as referências não possuem vigência cadastrada. Texto externo é neutralizado contra fórmulas em planilhas, e o arquivo é baixado no navegador apenas após clique, usando URL local revogada após o acionamento. O botão fica desabilitado quando nenhuma referência está cadastrada; erro de tenant/fonte não o renderiza.

Regressões sintéticas em `tests/target-references-export.test.ts`, `tests/target-references-ui.test.ts` e `tests/target-references-page.test.ts`. A homologação de UX em sessão autenticada e a validação de fatos reais continuam pendentes. Integração exige Quality Gate e Vercel aprovados para o mesmo SHA; em falha de preview por cota, não integrar, mesmo se os testes passarem. Rollback: reversão independente de GOAL-002, mantendo o relatório GOAL-001.
