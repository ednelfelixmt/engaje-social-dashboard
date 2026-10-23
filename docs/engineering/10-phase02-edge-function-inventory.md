# MediaHub — Fase 02: inventário de Edge Functions (2026-10-22)

Consulta somente leitura à API de gerenciamento do projeto Supabase de produção `engaje-social`. Nenhuma função foi publicada ou modificada nesta auditoria.

| Função | Versão observada | verify_jwt | Status |
| --- | ---: | --- | --- |
| windsor-sync | 10 | true | ACTIVE |
| meta-auth | 24 | false | ACTIVE |
| meta-sync | 4 | true | ACTIVE |
| windsor-connect | 3 | true | ACTIVE |
| windsor-accounts | 3 | true | ACTIVE |
| windsor-paid-sync | 3 | true | ACTIVE |
| engaje-integrations | 41 | true | ACTIVE |
| engaje-ingest | 6 | false | ACTIVE |

## Achados e limites

- `engaje-ingest` (versão 6) usa `verify_jwt=false` e autenticação por chave `x-engaje-key`; a inspeção do código em produção confirmou comparação do hash contra `integration_ingest_keys`, checagem de integração habilitada, tamanho máximo de payload, limite de registros e restrição de datasets. **Ainda não é homologação de autenticação negativa**.
- `meta-auth` tem `verify_jwt=false`: requer revisão de cada rota e callback OAuth para comprovar a autenticação por conta própria.
- As seis outras funções declaram `verify_jwt=true`. Isso não prova autorização por organização internamente nem ausência de funções com service-role.
- `engaje-integrations` e `meta-auth` compartilham o mesmo hash de conteúdo observado, apesar de flags JWT diferentes. **Auditar a distinção de acesso por rota** antes de homologar.
- O rate-limit do `engaje-ingest` usa um Map em memória; não constitui limitação global consistente entre instâncias. Revisar quota distribuída e proxy IP antes de considerar proteção de abuso homologada.

## Próximos testes obrigatórios

1. Executar requisições negativas com credenciais de teste e sem credenciais, confirmando códigos e ausência de side effects.
2. Validar organização A/B, Storage, callbacks OAuth, replay de state, segregação de tokens e RLS com duas identidades reais não privilegiadas.
3. Não criar credenciais fictícias via INSERT manual em `auth.users`; provisioná-las pela Auth Admin API em fluxo autorizado e auditar revogação.
4. Nenhuma operação destrutiva, mutação de banco ou produção é homologada por este inventário.

Status: **inventário verificado; autenticação/isolamento reais pendentes**.
