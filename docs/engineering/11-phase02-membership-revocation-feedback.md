# Fase 02 — Feedback correto de revogação de convites

**Problema:** a ação `saveMember` atualizava `organization_members` e em seguida revogava convites pendentes em `client_user_invitations`, mas ignorava erros na segunda operação, apresentando confirmação de sucesso mesmo quando a revogação não era comprovada.

**Correção:** `membershipRevocationFeedback` diferencia sucesso integral, serviço privilegiado ausente e falha na revogação. Agora a interface recebe `ok:false` e mensagem explícita de **alteração parcial** se o vínculo foi persistido, mas os convites não foram comprovadamente revogados. Sucesso integral só é informado após resposta sem erro das duas operações.

**Teste:** `tests/membership-guards.test.ts` cobre sucesso, falha de revogação, serviço indisponível e falha na atualização original.

**Limitação crítica:** o vínculo e a revogação ainda são operações distintas; a falha na segunda não desfaz automaticamente a primeira. O issue #54 mantém como requisito transação atômica, auditoria e testes E2E. **Esta entrega corrige informação enganosa, não resolve a atomicidade.** Não foi feita alteração do schema nem migração de produção.
