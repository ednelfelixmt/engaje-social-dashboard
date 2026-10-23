# Fase 02 — Pré-condição de leitura das permissões existentes

Achado: `saveMember` lia `organization_members.role` para impedir alterações do superadministrador, mas descartava o campo `error`. Um erro de leitura podia ser tratado como vínculo inexistente e o fluxo tentava executar `upsert`.

Correção: tratar explicitamente qualquer erro da leitura como bloqueio da alteração (fail-closed); preservar proteção do papel `super_admin`; manter criação de novos vínculos legítimos quando a consulta retorna vazia **sem erro**.

Testes unitários cobrem erro de leitura, superadministrador protegido, vínculo normal e vínculo ausente. Continua obrigatório o teste autenticado real em staging (#57). Não foram alteradas políticas RLS, dados de clientes nem a estrutura do banco.
