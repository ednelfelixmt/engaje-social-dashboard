# REL-004 — Lote de liberação de pendências

Base atual: main5545947, incluindo FILTER-DATE-001 (#217) e as guardas #219/#221/#222. Lote REL-004 amplia as três pendências consolidadas com METRIC-GUIDE-001, o guia privado de79 definições. Aprovações anteriores não se transferem: o novo PR exige todos os gates no seu próprio head.

| Pacote original | Head preservado | Produto |
|---|---|---|
| #207 | eb7dfdfee346dbcb2f6e104cbcc0a893bba360a9 | Executivo/plataformas/ranking preservam zero observado e excluem só catálogo sem fatos, com tenant/moeda nos dois períodos |
| #214 | c18e132b8f4e988354874bd438286c140f0051f0 | Guard offline de nomes/versões locais no CI; mantém colisão histórica e issue 211 abertas |
| #215 | 14e86578e49357a74dd9f6003363dd7ff72a48e4 | Diagnóstico agencyTenant, fontes validadas, jobs com µs/cronologia e 15  sondas anônimas |

O merge local resolveu conflitos de append no roadmap e união de listas em package/eslint; dependências/metadados iguais entre os pais foram conferidos. Nenhum alvo de lint ou script anterior foi removido. O catch de período e a recuperação segura do #217 permanecem antes das leituras; zero observado não vira ausência e catálogo sem medição não vira zero.

A guarda verify:local-migrations lê nomes de arquivos. Tolera apenas o par histórico exato da versão 20260930230000 e reprova novas colisões, adição de terceiro arquivo ou remoção/renomeação silenciosa. Não lê SQL remoto, não aplica migração, não repara histórico e não declara Supabase Preview homologado. A reconciliação #211 exige plano/backup/rollback próprios; nenhuma autorização é inferida do guard verde.

O diagnóstico preserva acesso só à agência, organização em todas as fontes, rejeição integral de erro/null/tenant/duplicidade, campanhas por conta, datas impossíveis/futuras, contadores finais coerentes e precisão de microssegundos. BigInt interno não é serializado. Mensagens privadas/credenciais não são selecionadas. Ver contrato data-quality-diagnostics.md.

Sem alteração de SQL, schema, configuração Supabase, Auth, RLS, Storage, Edge, OAuth, grants, segredos, dependências ou lockfile. Nenhum dado real como fixture, sincronização de teste, contratação de plano, projeto alternativo ou proteção relaxada. Navegação autenticada/contas reais/Storage HTTP/JWT A/B/PDF visual e SMTP adiado permanecem fora desta comprovação.

Validação local combinada: Validação anterior na base611:662 testes,140 verificações SQL sintéticas, tipos app/Edge, lint ampliado, arquitetura e guard local aprovados. Revisão independente Codex comparou o resultado às três refs e main 611: arquivos de produto preservados, exceptuando as combinações documentadas de section/listas/README/roadmap. Sem impedimentos restantes. Claude recebeu proposta (saída vazia) e diff; o runner do diff encontrou EOF ao escrever ao processo encerrado. Não há parecer Claude verificável.

Merge somente após Quality Gate integral e Vercel success/READY no mesmo head, com revisão e PR mergeável. Confirmar produção separadamente por SHA/alias e16 sondas (inclui o guia). Só depois encerrar #207/#214/#215 como substituídos, sem declará-los integrados individualmente ou fechar #211. Se cota impedir, preservar todos abertos até liberação efetiva. Rollback apenas do módulo com regressão comprovada, sem reduzir autorização ou remover a detecção de drift para ocultar o problema.

Build padrão e15 GETs locais da combinação concluídos com sucesso; falha auxiliar de ambiente não se repetiu nesta execução. Gates remotos e produção continuam separados.

## Atualização de base e produto

O merge fd61968 incorporou main5545947 sem conflito em código; somente append no roadmap. As guardas de escopo de ingestão, moeda dos cards e UUID dos relatórios, com regressões principais, foram comparadas por blob e preservadas. A combinação passou670 testes antes do novo guia. A produção5545947 READY observada descreve o estado naquele instante; a issue220 documenta divergência histórica e não aprova este lote.

METRIC-GUIDE-001 oferece busca/filtros por79 definições e condições de cálculo por contexto, restrito ao tenant com overview habilitado. Não lê medições e não confunde opção configurável com recebimento/homologação. Contrato em metric-methodology.md. Os25 testes direcionados passaram e a revisão independente Codex não encontrou impedimento. Claude foi consultado; registrar apenas parecer verificável. Gates completos da revisão final ainda são obrigatórios e não herdam aprovação do head713fbd4.

Validação combinada atual:681 testes,140 verificações SQL sintéticas, tipos app/Edge, lint sem advertências, arquitetura e guard local aprovados. Claude diff retornou saída vazia/JSON incompleto; indisponibilidade registrada, sem parecer conjunto.

Build local atual: compilação e TypeScript concluídos, mas prerender /_not-found interrompido por EPERM mkdir em .next no Windows (ENV-BUILD-003). Os15 GETs/build da versão anterior não aprovam esta revisão com16 rotas; exigir CI Linux integral e Vercel do head final. Sem troca de compilador nem bypass.
