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
