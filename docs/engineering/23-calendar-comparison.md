# Comparação de períodos por calendário

Data: 25/10/2026. ANA-019, complemento analítico do ciclo 07 / PR #152, aguardando gates finais.

O uso direto de setUTCFullYear fazia 29/02 rolar para 01/03 no ano anterior não bissexto. comparisonPeriod passa a fixar os limites em 28/02 nesse caso. Período anterior mantém o número inclusivo de dias e termina na véspera do atual; usa UTC de datas de calendário, sem depender de horário de verão do host. Sem comparação não consulta o período anterior.

O intervalo máximo passa a expressar dois anos de calendário, com limite final ajustado quando a origem é 29/02. Isso inclui o dia bissexto legítimo em períodos de dois anos, antes recusado pelo teto fixo de 730 dias. O máximo permanece limitado a 732 datas inclusivas; intervalos maiores são recusados. Datas inexistentes, ordem invertida e deslocamento para ano ISO não representável falham fechados.

Ano anterior pode ter duração diferente. O alinhamento existente por posição preserva lacunas como null, sem criar fatos para 29/02. O filtro exibe as datas aplicadas e explica a política anual, sem supor que os períodos sejam coortes comparáveis. Não normaliza contagens por dia nem fabrica observações.

11 regressões adicionais validam calendário, limites, século/bissexto, virada do ano, datas de mudança de DST, modo desativado, renderização do filtro e o módulo real de consulta com builder de banco explícito em memória. Os testes confirmam predicados de organização/moeda/provedor nos quatro conjuntos de comparação; não são JWT/RLS HTTP nem ingestão real. Não acessam rede ou segredos.

A alteração não adiciona permissões, queries novas ou conectores. Mantém concorrência das leituras existentes e sua segregação. Lint ampliado cobre os arquivos alterados. Sem migração ou escrita em dados reais. Rollback: reverter calendário/wiring/rótulo como conjunto, conservando validação de datas e limites.

## Bloqueio de publicação

No head inicial e6e328676e9c4f3c2ed272378e1b2546e9ddbd2f de #152, Quality Gate #223 (run 40247605774) passou, inclusive build Linux. Vercel retornou failure com target build-rate-limit e não criou preview. O Windows local compilou/tipou mas falhou no diretório gerado com EPERM; a tentativa de outro runtime registrou processo Turbopack indisponível. Não substituir esses resultados por sucesso presumido.

O head final precisa repetir Quality Gate e Vercel; nenhum merge enquanto a Vercel não aprovar o mesmo SHA. Não foram alterados plano, limites, equipe ou proteções para contornar a cota. A hora de renovação não foi fornecida pelo status. Referência operacional: [limites da Vercel](https://vercel.com/docs/limits).

Validação local consolidada: 292 testes aprovados (27 regressões novas no ciclo 07), lint ampliado, tipos da aplicação/helper Edge e arquitetura aprovados. 140 checks SQL já aprovados no mesmo ciclo, sem mudança de esquema. Build final e Vercel dependem da execução do novo head em CI/preview; não herdados do head anterior.

## Gates finais e integração — 25/10/2026

Quality Gate #226 passou no head a0d5869fa8035cbb735d951c66ab03d10936d40a. A nova tentativa de preview dpl_2NAqZNv9ezCRB9rXYgQxg1YRDYZf ficou READY e atualizou Vercel para success nesse SHA. PR #152 integrado em dfea7ccfc9c489ba8af9c56ff28924192d5819fd, árvore idêntica à aprovada. Deployment de produção recusado por api-deployments-free-per-day (HTTP 402, retryAfter 86400); produção ainda 5d3a180e. Ver [24-release-and-auth-operations.md](24-release-and-auth-operations.md). O erro local EPERM segue registro de ambiente, sem alterar o build validado no CI.
