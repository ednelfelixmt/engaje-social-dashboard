# Fase 02 — Proteção da organização da agência em edição de memberships

## Achado
A ação administrativa `saveMember` aceitava qualquer UUID em `organization_id` e limitava a opção de cargo às permissões de cliente, mas não validava `organizations.is_agency` antes de criar/alterar o vínculo. O formulário de clientes poderia portanto alterar o espaço de organização da própria agência.

## Correção
- Antes de consultar/alterar `organization_members`, a ação verifica a existência da organização e `is_agency=false`, usando a sessão administrativa com RLS.
- Caso a consulta falhe ou a organização não exista, a operação é recusada sem gravação.
- A tentativa de vincular usuário através do formulário de clientes à organização da agência é bloqueada.
- A validação é pura e testada em `tests/membership-guards.test.ts`.

## Limites de segurança
A proteção é parte da camada de aplicação e não substitui RLS, os papéis administrativos de banco ou os testes com duas identidades autenticadas em staging. Não houve alteração de schema, migração ou credenciais. A consistência transacional de convites permanece em #54.
