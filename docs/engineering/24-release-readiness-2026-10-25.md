# Verificação de release — 25/10/2026

Data de referência: America/Cuiaba. Base do código: `29729893` da `main`.
Estado: **código validado localmente; homologação autenticada e release produtivo pendentes**.

## Correções consolidadas

- Reaproveitadas as correções analíticas dos PRs #153 e #155 sobre a base atual,
  preservando os limites de métricas ponderadas do PR #156 e os comparativos
  de escopo completo do PR #158. Não é necessário
  integrar novamente as mesmas alterações depois deste pacote.
- Contagens negativas ficam indisponíveis, sem serem convertidas em zero.
- Alcance e cliques únicos não são somados entre observações/dias/campanhas sem
  deduplicação na origem. Frequência e CTR único ficam indisponíveis nesse caso.
- O resumo de campanhas rejeita entrada com organizações diferentes.
- O CI mantém testes e tipos explícitos e pula somente sua repetição no `prebuild`.
  Builds locais e de deployment continuam executando o `prebuild` normalmente.
- O Quality Gate inicia o build compilado e executa `npm run verify:http` antes de
  terminar. O verificador exige login funcional por HTTP, recuperação anônima sem
  formulário de nova senha, bloqueio administrativo, callback sem código recusado,
  redirecionamentos corretos e respostas sem cache. Faz somente GETs sem credenciais.
- `AGENTS.md` e `CLAUDE.md` registram a colaboração solicitada pelo usuário.

## Evidências locais

| Verificação | Resultado |
|---|---|
| Instalação pelo lockfile | `npm ci` concluído |
| Suíte completa | 315 testes aprovados; nenhum falhou ou foi pulado |
| Banco PostgreSQL descartável | 140 verificações SQL aprovadas |
| ESLint incremental ampliado | Aprovado |
| Tipos da aplicação e helper Edge | Aprovados |
| Tipos do verificador HTTP e de seus testes | Aprovados |
| Limites de arquitetura | Aprovados |
| Build Next.js de produção | Concluído |
| Smoke HTTP do build local | 6/6 rotas aprovadas |
| Smoke HTTP da produção existente | 6/6 rotas aprovadas |
| YAML e sintaxe Bash da etapa HTTP | Validados |

Ambiente local: Windows, Node `24.19.0`, npm `11.17.0`. O CI usa Node 22 e precisa
aprovar este pacote no SHA final. O teste HTTP da produção existente não comprova
que este pacote já esteja publicado.

Claude Code revisou o diff analítico e o smoke HTTP de forma independente. As sugestões foram
conferidas no código e a proteção das métricas ponderadas da base atual foi mantida.
O caso adicional de duas observações da mesma campanha no mesmo dia ganhou teste.
O CI recebeu diagnóstico explícito e logs quando o servidor não inicia a tempo.

## Estado externo confirmado

- A `main` em `e3d6a799` já tinha Quality Gate aprovado no run `40257616262`.
- A produção Vercel consultada está `READY` em `5d3a180e`, deployment
  `dpl_GizpzttpeEDxftwdSrRDeEFehziP`, anterior à base deste pacote. O status Vercel
  de `e3d6a799` indica `failure`, com destino `build-rate-limit`.
- O Supabase `ityidnsfhgotucgvcifq` está `ACTIVE_HEALTHY`. Consulta agregada mostrou
  três identidades Auth, oito organizações, três organizações com membros e as duas
  organizações sintéticas conhecidas. Isso confirma a existência de fixtures,
  sem comprovar suas credenciais nem isolamento com JWTs reais.
- O histórico de Actions consultado por `event=workflow_dispatch` não retornou runs.
  A CLI local do GitHub não está autenticada. O conector não fornece disparo dos
  workflows manuais nem consulta dos secrets desses ambientes; não se presumiu que
  os secrets estivessem configurados ou ausentes.
- A implementação publicada de `meta-auth` (versão 24) ainda não contém o helper
  `requireAgencyAdministrator` do repositório. `engaje-integrations` versão 41
  compartilha o mesmo hash de bundle listado. O rollout e a validação de autorização
  em runtime de SEC-014 continuam necessários; não foram feitos neste pacote.
- O Security Advisor mantém avisos de `pg_net` em `public`, proteção contra senhas
  vazadas desativada e quatro tabelas com RLS sem políticas. Essas tabelas não devem
  ganhar permissões permissivas apenas para remover avisos.

## Gates que continuam abertos

1. **Publicação:** recuperar a cota de deployment Vercel e obter preview `READY`/
   status `success` no SHA final antes de integrar e publicar este pacote.
2. **SEC-010/011:** executar o workflow `Phase 02 Final Auth Gate` em runner
   autenticado e com os secrets protegidos das duas identidades sintéticas.
   Leituras/escritas negadas, Storage, revogação e expiração exigem provas próprias;
   o smoke anônimo e o banco descartável não substituem esses testes.
3. **SEC-014:** revisar o bundle Edge atual, preparar rollback, publicar as funções
   correspondentes e comprovar negação por papel/JWT e callback OAuth com fixtures
   autorizadas. Não presumir que código integrado já esteja no runtime Supabase.
4. **UX-002 e recuperação:** validar jornadas autenticadas de agência/viewer,
   filtros, administração, responsividade e recuperação PKCE real, incluindo entrega
   de e-mail por provedor configurado. A tentativa de acesso visual ao Chrome
   expirou; não há evidência visual nesta rodada.
5. **Integrações reais:** conectar contas autorizadas e reconciliar origem, moeda,
   atualização e resultados na UI. Conectores classificados como base preparada no
   README continuam com essa classificação até sua própria homologação.

Não houve alteração em registros de clientes, credenciais, RLS, Storage, migrações,
funções Edge ou permissões de produção. Não declarar o aplicativo 100% homologado
com base somente no Quality Gate ou nos GETs anônimos.

Rollback do código: reverter o commit deste pacote, preservando os controles de
autorização já implantados. Os PRs de origem permanecem rastreáveis até a integração
validada do pacote consolidado.
