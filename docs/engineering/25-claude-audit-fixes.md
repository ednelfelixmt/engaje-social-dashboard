# Correções da revisão de 27/10/2026

O ciclo corrige a cobertura incompleta do lint e a limpeza incompleta de arquivos ao excluir um cliente. Acrescenta prova comportamental do handler de integrações para publicar os gates de agência/OAuth já presentes na main.

## Contrato de segurança

Clientes viewer, editor e client_admin não podem executar ações administrativas. O handler valida Auth e exige is_super_admin === true antes de acessar consultas com service_role. O callback verifica o iniciador novamente, após state e nonce. A sincronização agendada continua exigindo seu segredo próprio validado no banco; não ganha acesso pelo papel do usuário.

A enumeração Storage usa UUID de organização, ordenação estável, paginação de 100 itens e visita de subpastas. Não remove arquivos durante a enumeração. Resposta inválida ou erro interrompe a exclusão antes da RPC do banco. Após a RPC, remoções usam lotes de 100 e informam erros de limpeza existentes. Isso não torna banco e Storage uma transação única: uploads concorrentes e falhas após a exclusão podem exigir reconciliação operacional. Nenhuma exclusão real foi usada como teste.

## Validação e revisão

Os testes novos executam a fonte real do handler e helpers, com doubles explícitos de Auth/banco/Storage e rede proibida. Testam negação por papel/ação, autenticação inválida, RPC com erro, acesso autorizado ao escopo do tenant, segredo de cron, revogação durante callback, state forjado, replay e erro de Storage antes da exclusão. Os testes de arquivos incluem 1101 objetos, subpasta e erro em página posterior.

Evidência inicial: 573 testes, 140 verificações SQL no banco descartável, tipos de aplicação/helpers Edge, arquitetura e lint sem advertências. Build e 12 sondas HTTP locais aprovados após corrigir um diretório de saída com EPERM no Windows. As verificações finais do commit combinado e a revisão independente são registradas no roadmap/PR. Não se trata de JWT real ou homologação Meta.

## Publicação Edge

O deploy Vercel não atualiza Edge Functions. Engaje-integrations e meta-auth devem incluir o mesmo index de integrações e os módulos compartilhados de autorização, escopos e Storage. Meta-auth usa o wrapper versionado. Preservar os valores anteriores de verify_jwt: true em engaje-integrations e false em meta-auth. Não ampliar acesso de gateway neste reparo.

Antes do rollout: preservar ambas as fontes publicadas e seus metadados em ambiente local protegido, comparar toda a diferença com a fonte revisada, executar os gates e integrar somente após CI e Vercel. Publicar uma função por vez, reler os arquivos remotos e comparar hashes. Sondas negativas sem usuário e com token inválido não devem alterar dados. Registrar versões e limitações. O callback positivo, login real A/B e Storage real permanecem pendentes até testes protegidos.

## Reversão

O bundle anterior de engaje-integrations v41/meta-auth v24 foi preservado fora do repositório. Reverter o pacote completo restaura também a autorização legada: isso reabre SEC-014 e exige contenção explícita, nunca rollback silencioso. Preferir correção posterior preservando a autorização admin-only. Não remover migrações de autorização do banco para acompanhar runtime antigo.

Revisão independente concluída por Claude Code / Claude Sonnet 4.6. Não identificou impedimento técnico; a resolução de imports do teste foi restringida aos módulos explicitamente esperados. Codex conferiu os achados: o callback recusado permanece em 400, enquanto ações POST sem autorização retornam 401/403. A base combinada com e0a4f63 executou 579 testes e lint sem advertências.


## Resultado do rollout em 27/10/2026

PR #202 integrado em cc44b0f43ff43ce9a222cc69983fc2ba6fb7f08e após Quality Gate #40511172581 e Vercel no head ffcfce3d3d3542a7d9b6a18cbabdee82af2a718d. Produção dpl_GJ5S4TsKgXKNmkmX64KEhgfbNFq4 READY no commit integrado.

| Função | Versão | verify_jwt | Hash do bundle |
| --- | --- | --- | --- |
| engaje-integrations | 42 | true | 1509556d817dc0d12af43a454c4b349e2143df6e01d731f89f9c2d45465700a8 |
| meta-auth | 25 | false | c4fb4eed19d18ab739fab80daef4bc6a67266b815e088fb0e5763acab6e06f62 |

Os arquivos relidos das duas funções coincidem integralmente com o pacote aprovado. O wrapper faz os hashes de bundle diferirem sem duplicar a implementação. As oito sondas negativas de HTTP passaram. Sessões ausentes/inválidas em meta-auth agora recebem 401; cron sem segredo permanece negado e state forjado não avança. A verificação do gateway em engaje-integrations foi preservada.

A regra de proteção main 85421414 foi salva após confirmação de identidade do proprietário e relida no painel; API confirmou protected=true e checks GitHub Actions/Vercel. Clientes reais não foram usados como fixtures.

SEC-014 teve o drift de código corrigido no runtime, mas o fluxo positivo com JWT real e provedor OAuth continua sem homologação. O ambiente phase02-homologation e suas fixtures protegidas são pré-requisitos ausentes; a lista atual de ambientes tem apenas Preview e Production. A proteção Supabase contra senhas vazadas está limitada ao plano Pro ou superior, enquanto a organização usa Free. Nenhum plano foi contratado.
