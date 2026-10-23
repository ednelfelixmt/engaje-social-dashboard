# MediaHub — Evidência pós-migração: cliente somente leitura

Data: 23/10/2026. Ambiente: Supabase `ityidnsfhgotucgvcifq`.

## Resultado verificado em catálogo (somente leitura)

- `auth.users`: **1** conta.
- Organizações de clientes (`organizations.is_agency=false`): **5**.
- Políticas de escrita `config_insert`, `config_update`, `config_delete` em `branding` e `dashboard_configs`: **6/6** contêm `private.is_super_admin()`; conferidas após aplicação em produção da migração `client_dashboard_readonly_admin_only`.
- PR de código e migração: **#91**, integrado à `main`. Relatório estrutural anterior: **#90**, integrado à `main`.

## Decisão de homologação

**APROVADO:** inspeção estrutural dos seis controles de escrita e presença dos cinco clientes. **NÃO EXECUTADO:** prova comportamental autenticada de que usuários clientes são somente leitores, incluindo negação de POST/PATCH/DELETE, tentativas de acesso cruzado e sessões revogadas.

As contas de cliente sintéticas devem ser provisionadas pela API Auth Admin oficial, nunca por SQL em `auth.users`. Sem isso, não declarar Fase 02 integralmente homologada. Este documento não substitui os testes E2E.

Nenhum dado de cliente foi alterado durante a coleta desta evidência.
