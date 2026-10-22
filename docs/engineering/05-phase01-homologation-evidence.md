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

## Encerramento do ciclo técnico — 22/10/2026
**Status operacional: núcleo da Fase 01 VERIFICADO EM CI, encerramento com ressalvas para permitir avanço à trilha Fase 02.**
Não equivale a auditoria de segurança, homologação integral de navegação, nem a aprovação do sistema para novos clientes.

### Validações efetivamente executadas
- PR #51 (merge `3cf9bb94215d4b60d19469f6bc217267c7b01d33`): GitHub Actions PR, run `39832550781` — **success**.
- `npm ci`; instalação de ESLint para a pipeline; `npm run lint` (escopo incremental); `npm test`; `npm run typecheck`; `npm run check:architecture`; `npm run build`: aprovados.
- A configuração flat `eslint.config.mjs` cobre módulos puros de métricas, calendários, validação de arquitetura e testes correspondentes. **Não cobre todo o legado/UI.**
- Arquitetura por módulos, contratos de métricas e testes de dia bissexto, faltas de dados e taxas ponderadas têm evidências em PRs #46 e #48.

### Ressalvas e proteção contra risco
1. Lint: configuração incremental, ESLint instalado sob demanda no CI sem pacote lockado; integração ao lockfile e ampliação de cobertura rastreadas em #49. **Não chamar de lint integral reproduzível.**
2. Testes de navegação/permissões com duas identidades de empresas diferentes continuam nos issues #37/#39/#50; não liberar novos acessos comerciais sem essas evidências.
3. Validação real de funis, atribuição, moedas e lacunas temporais permanece em #47. A biblioteca pura de calendário ainda não é usada por todos os gráficos.
4. A auditoria de integrações/OAuth, Storage e service-role continua em #38.
5. Dados externos/métricas ausentes não devem ser simulados; recursos dependentes ficam restritos.

### Decisão de continuidade
A Fase 01 tem **gate técnico restrito aprovado** para desenvolvimento incremental. A **Fase 02 (identidade e segurança de empresas)** está autorizada para implementação/testes em branch isolada, com gate próprio. A Fase 01 não está homologada funcionalmente de ponta a ponta.
