# Fase 02 — Validação prévia de atualização administrativa

Identificado: `updateOrganization` em `src/app/(agency)/admin/actions.ts` persistia `organizations` e só depois verificava se nicho e modelo de vendas estavam presentes para aplicar o funil sugerido. Uma solicitação inválida podia mudar a organização e retornar erro, deixando atualização parcial.

Correção:
- ID recebido validado via `safeParse`, sem exceção não tratada por UUID inválido.
- `validateOrganizationUpdateRequest` verifica pré-requisitos do funil **antes** de atualizar `organizations`.
- Sem funil solicitado, edição comum permanece válida, inclusive com campos de nicho/modelo ausentes.
- Testes puros cobrem cenários positivos e negativos.

Escopo e ressalva: corrige atualização parcial por **entrada inválida**. Falhas de rede ou banco durante a segunda gravação de `dashboard_configs` ainda podem produzir alteração parcial; resolver com RPC transacional isolada somente após revisão de SQL/RLS e testes staging. Não houve alteração de schema nem execução em produção.
