# Fase 02 — Integridade das permissões OAuth Meta

Data: 22/10/2026. Entrega de **hardening sem alteração de banco**.

## Achado
O fluxo de callback em `supabase/functions/engaje-integrations/index.ts` consultava as permissões concedidas pela Meta. Quando havia uma configuração Business Login e a leitura retornava vazia (inclusive após uma exceção ignorada), a lista era substituída por `metaOAuthPermissions()` — os escopos **solicitados**, não necessariamente os escopos **concedidos**. Isso podia marcar `permissionsValid` incorretamente na atribuição de ativos e construir uma interpretação falsa de autorização.

## Correção
- `verifiedOAuthScopes` preserva apenas escopos informados pela plataforma, removendo repetições e vazios.
- Sem lista confirmada, mantém lista vazia. `assign_assets` possui controle por `permissionsFor(provider)` que impede habilitar sincronização quando as permissões exigidas estão ausentes.
- Testes unitários cobrem resposta ausente, lista duplicada e escopos não concedidos.
- O fluxo Business Login ainda poderá concluir a descoberta dos ativos, mas sincronizações que necessitem permissões desconhecidas permanecerão bloqueadas até reconexão/verificação.

## Restrições de homologação
- O CI valida código Node/Next e testes puros. **Não valida runtime Deno Edge nem o OAuth end-to-end com conta Meta.**
- Implantação da Edge Function publicada é independente do merge do GitHub: não afirmar que o runtime Supabase foi atualizado sem verificação/deploy explícito.
- OAuth callbacks, `service_role`, armazenamento de tokens e estados assinados continuam em #38; contas reais em staging em #57.
- Uma melhoria futura: registrar erro de consulta de permissões separadamente de lista de permissões vazia, com diagnóstico sem expor tokens.
