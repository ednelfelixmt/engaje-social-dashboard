# Homologação técnica — Fase 01 (22/10/2026)

## Status
**GATE TÉCNICO PARCIAL APROVADO; HOMOLOGAÇÃO FUNCIONAL/SEGURANÇA AINDA PENDENTE.**
Não afirmar "software totalmente homologado" nem "Fase 01 encerrada sem ressalvas".

## Evidências reproduzíveis
- PR #48: verificação de arquitetura pelo compilador TypeScript (`scripts/check-architecture.ts`), com casos positivos e negativos.
- Integração ao GitHub Actions `quality.yml`: `npm ci`, `npm test`, `npm run typecheck`, `npm run check:architecture`, `npm run build`.
- Workflow PR (commit `234311c8b63eed0390dbdb0424ef32bce38cf515`), run **39823867941**: **success** em 22/10/2026.
- `src/lib/metrics/calendar.ts` implementa calendário inclusivo e alinhamento de períodos, conservando `null` para dias sem coleta.
- `tests/calendar.test.ts` cobre dia bissexto, intervalo inválido, ausência vs zero e alinhamento.
- `tests/architecture.test.ts` cobre proibição de importar sessão/DB privilegiado para cliente e dependências indevidas da camada de métricas.

## Limites do que foi testado
- Testes de calendário validam **a biblioteca**, ainda não representam sua adoção por todos os gráficos e consultas.
- `check:architecture` é um conjunto de regras estáticas específicas, **não ESLint**; lint standard versionado está no issue #49.
- TypeScript/build bem-sucedidos **não** equivalem a validação de segurança multitenant, integração real com APIs, testes visuais ou navegação autenticada.
- Homologação E2E com dois tenants, responsividade e permissão real em #50, #37 e #39.
- Motor semântico (moedas, atribuição e dados faltantes) continuará em #47.

## Política de avanço
Fundação técnica (testes, tipos, limites básicos e biblioteca de calendário) pode avançar por design risk-based gates.
**Nenhuma superfície nova com dados sensíveis ou permissões ampliadas deve ser declarada homologada** antes do E2E cross-tenant.
Problemas identificados são rastreados, não ignorados. Fase 01 poderá ser encerrada **com ressalvas** quando o responsável aprovar formalmente os riscos e demonstrar contenções nas superfícies afetadas. Nesta entrega não houve tal aprovação.
