# Fase 02 — Execução única do gate A/B no ambiente existente

Ambiente alvo: `ityidnsfhgotucgvcifq` (produção). **Não execute SQL diretamente em `auth.users`.** Somente fixtures sem vínculo com clientes reais.

## Pré-requisitos verificados
- O executor `scripts/verify-production-isolation.ts` está na `main` e tem preflight negativo.
- O schema `organizations` exige `name` e `slug`; demais campos têm defaults. `organization_members` exige `organization_id`, `user_id`; `role` permite `viewer`.
- A conta atual no banco é única: não há duas identidades para homologação E2E.
- Não há ferramenta conectada para Auth Admin createUser. O provisionamento deve ocorrer por interface/API oficial usando credencial server-side autorizada e auditada, nunca em chat, GitHub ou navegador.

## Preparar fixtures sob procedimento aprovado (operação de produção)
1. Criar **duas contas Auth sintéticas distintas** com e-mails de domínio `.test` por `supabase.auth.admin.createUser` no servidor protegido, sem publicar passwords ou tokens.
2. Criar duas organizações de teste isoladas, não agência, com slugs distintos (ex.: `homologacao-a` e `homologacao-b`). Confirmar ausência de conflitos antes de inserir.
3. Associar cada usuário **somente** à sua própria organização com papel `viewer` e vínculo ativo. Verificar ausência de `super_admin`.
4. Criar um ativo sintético com vínculo por organização e um arquivo `branding` privado por organização, nos caminhos correspondentes aos próprios slugs. Não usar assets, integração, credencial ou arquivos de clientes reais.
5. Guardar inventário interno com IDs dos itens de fixture, expiração/remoção planejada e rollback. Não imprimir segredos nos logs.

## Executar o gate já implementado

No ambiente local protegido ou executor CI protegido com secrets configurados, executar:

```sh
MEDIAHUB_PROD_READONLY_ACK=YES_READ_ONLY npm run verify:production-isolation
```

Antes, definir via secret store, nunca em código:
`MEDIAHUB_SUPABASE_URL`, `MEDIAHUB_PUBLISHABLE_KEY`,
`MEDIAHUB_A_EMAIL`, `MEDIAHUB_A_PASSWORD`, `MEDIAHUB_A_SLUG`,
`MEDIAHUB_B_EMAIL`, `MEDIAHUB_B_PASSWORD`, `MEDIAHUB_B_SLUG`,
`MEDIAHUB_A_BRANDING_FILE`, `MEDIAHUB_B_BRANDING_FILE`.

O script faz somente login, consultas de leitura, criação de signed URLs de curta duração e logout. **Não comprova bloqueio de escrita ou revogação de sessões**; esses testes precisam de um procedimento controlado separado antes da homologação completa.

## Critérios de aceite
- Dois usuários e duas organizações de teste independentes confirmados.
- Leitura de próprios dados/arquivo permitida; leitura de organizações, conexões, ativos e arquivos privados cruzados negada nos dois sentidos.
- Sem efeitos nos dados dos cinco clientes; evidência do teste em CI com mascaramento de credenciais.
- Testes negativos de escrita, revogação, callback OAuth e APIs registrados separadamente.
- Falhas mantêm a fase aberta; aprovação integral somente com evidências executadas.
