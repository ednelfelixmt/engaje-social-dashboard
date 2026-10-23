# Fase 02 — Consulta de vínculo antes de modificar permissões

A ação administrativa `saveMember` consultava o vínculo atual para impedir alterações de `super_admin`, mas ignorava o erro de leitura em `organization_members`. Dessa forma, em caso de falha na consulta, o código tratava a ausência de dados como ausência de privilégio e prosseguia até a tentativa de escrita.

Agora `canUpdateExistingMembership` recusa a ação caso a leitura não seja comprovadamente bem-sucedida, antes de qualquer alteração; também mantém a negação de mudanças da função `super_admin`. Os testes de regressão cobrem erro da leitura, função protegida, membro comum e usuário sem vínculo anterior.

Não houve alteração de esquema, credenciais ou permissões em produção. Esta checagem é defesa adicional e não substitui políticas RLS, operações atômicas (#54) nem testes com identidades reais em staging (#57).
