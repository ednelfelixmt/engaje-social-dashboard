# Homologação final — execução e dependências verificadas

Atualização de28/10/2026: consulta Claude concluída com CLI2.1.302. O contrato HOM-RUN-001 em27-homologation-runner-evidence.md passa a exigir dados positivos nas11tabelas scoped e negação explícita da tabela administrativa integrations, além de arquivos privados e ambiente protegido. O relato de401 abaixo é histórico, não o estado atual da consulta.

Registro de 27/10/2026, America/Cuiaba. Não representa aceite comercial. Referência funcional: main8ffcfa541638c999cb0ee8962c66b0cf69366a15, lote #218 publicado;681 testes,140SQL sintéticos, Quality Gate40608829541, preview READY no head75cf107, CI main40609173529 e produção dpl_FkdLbU5bnBdAFJV5EdMeh2Y4rDa3 READY/alias/16HTTP aprovados.

## Situação real

- Supabase Engaje ityidnsfhgotucgvcifq ACTIVE_HEALTHY; três usuários Auth e três organizações com membros ativos. As fixtures abaixo já existem com viewer ativo e um ativo atribuído cada. A afirmação histórica de apenas uma identidade não descreve o estado atual.
- Arquivos exatos branding/<UUID>/phase02-isolation-fixture.png: zero nas duas fixtures. Não confundir ativo cadastrado com arquivo privado recebido.
- GitHub exibe apenas os ambientes Preview e Production, sem phase02-homologation. Lista de secrets do repositório/ambientes vazia; Phase02 Final Auth Gate não tem execuções. Não disparar um runner sem ambiente protegido/credenciais nem criar um ambiente desprotegido implicitamente por dispatch.
- Ambiente local contém apenas URL e publishable key do aplicativo, sem senhas A/B ou service role. Não extrair sessões de navegador, fabricar JWT, alterar auth.users por SQL, pedir segredos no chat ou usar clientes reais.
- Claude Code2.1.91 estava encerrando sem saída por EPERM nos arquivos locais de configuração/lock. Após permitir acesso ao próprio CLI, a consulta real chegou à API e retornou401: OAuth access token has expired. Parecer atual depende de renovação de login pelo responsável; não atribuir testes ou aprovação ao Claude.

## Preparação mínima do responsável

1. Renovar o Claude Code com /login ou claude auth login e avisar quando concluir. Não enviar tokens/códigos ao chat. Codex já preparou o pacote de fontes e a matriz de aceite para reenviar após autenticação.
2. Em GitHub Settings → Environments, criar phase02-homologation, configurar required reviewer e restringir a main. Manter a proteção existente da main; não contratar plano ou enfraquecer regras para conseguir executar.
3. Nesse ambiente, cadastrar os cinco secrets exigidos pelo workflow phase02-final-auth.yml: PHASE02_PUBLISHABLE_KEY, PHASE02_A_EMAIL, PHASE02_A_PASSWORD, PHASE02_B_EMAIL e PHASE02_B_PASSWORD. Valores devem ser fornecidos diretamente no painel protegido. Chave publishable, nunca service role para os testes de usuário. Usar exclusivamente as identidades de fixture abaixo; se a senha não estiver disponível, recuperação/alteração é operação do responsável no Auth, sem gerar ou divulgar senha pelo chat.
4. Pelo painel Storage do projeto Engaje, manter branding privado e carregar os dois PNGs sintéticos de1pixel, sem sobrescrever arquivos divergentes: c4c77b35-03a4-417a-94c2-e845d48679c1/phase02-isolation-fixture.png e10289f2d-23b9-4c86-a10e-0503bcc2de79/phase02-isolation-fixture.png. Foram preparados localmente a partir do payload já versionado no uploader; não são imagens de clientes. Não inserir storage.objects por SQL. Não mudar a publicidade do bucket.
5. Em Actions → Phase02 Final Auth Gate, selecionar main e **desmarcar provision_private_fixtures**, pois os arquivos foram preparados no painel. Isso evita armazenar PHASE02_SERVICE_ROLE_KEY no GitHub. O caminho opcional do uploader existente só pode ser usado com credencial server-side protegida e autorização específica; não é necessário para este procedimento manual.
6. Aprovar a execução no ambiente protegido, acompanhar preflight e teste real A/B até completed/success e guardar run/SHA/horário/log sanitizado. Antes de guardar logs, verificar ausência de senhas/tokens, URLs assinadas e dados reais. Em falha, registrar o primeiro caso quebrado; não repetir login indefinidamente.

| Fixture | Organização | Identidade Auth | Papel |
|---|---|---|---|
| A | c4c77b35-03a4-417a-94c2-e845d48679c1 / homologacao-a-20261024 |079b2713-a99a-41a6-acc3-b129863ef7a6 | viewer ativo |
| B |10289f2d-23b9-4c86-a10e-0503bcc2de79 / homologacao-b-20261024 |4fd21c94-e93d-4e35-923b-b1ec4622fd94 | viewer ativo |

Não misturar os nomes de secrets desse workflow com o runner alternativo phase02-protected-isolation.yml, que usa MEDIAHUB_*. Configurar um não configura o outro.

## Matriz de aceite e evidência necessária

| Gate | O que deve ser comprovado | Situação nesta inspeção |
|---|---|---|
| Qualidade/release218 | suíte, SQL sintético, tipos/lint/build/HTTP, CI e Vercel no SHA certo, alias de produção | Aprovado para o lote218; não equivale ao app inteiro |
| SEC-010 leitura A/B | login das duas identidades exatas, own-read positivo, tabelas/ativos/conexões estrangeiros negados, signed URL própria permitida e alheia negada nos dois sentidos | Bloqueado por secrets/ambiente/arquivos; runner existe, sem execução real |
| SEC-011 escrita | DML/RPC/Storage negados a viewer tanto no tenant próprio quanto no alheio, com controle positivo da agência e fixtures sintéticas | Ainda exige procedimento autenticado específico; runner de leitura não cobre |
| SEC-011 sessão | login/logout, expiração, refresh e efeito real de revogação nos caminhos sensíveis | Não executado; logout não prova invalidação instantânea do JWT |
| SEC-014/OAuth | negativas de sessão/callback/cron, autorização da agência, callback de uso único/expirado/revogado e integração com provedor real | Rollout42/25 e negativas básicas registrados; fluxo real de provedor ainda pendente |
| UX-002 | viewer autenticado sem personalizar/importar/escrever, navegação/filtros/relatórios; agência com controles autorizados | Falta jornada no navegador com identidades sintéticas |
| DATA/integrações | amostra autorizada fonte → ingestão idempotente → banco → totais/filtros/UI, janela/moeda/atribuição/cobertura | Contratos e testes sintéticos presentes; fontes reais e janela orgânica pendentes |
| PDF visual | imprimir/salvar cada relatório, revisar paginação, cortes, legibilidade, contexto/avisos em desktop/móvel | Código/SSR testado; arquivos PDF reais ainda não revisados |
| Auth e-mail | convite/recuperação/entrega/link de uso único/expirado/sessões | SMTP adiado por decisão do responsável; não marcar entrega pronta |
| #211 migrações | plano revisado com backup/diff/rollback e reconciliação comprovada no ambiente correto | Colisão histórica e drift não reconciliados; guard offline não resolve |
| SEC-012/013 | pg_net em public, proteção de senha vazada, quatro tabelas com RLS sem policy e grants revisados | Avisos atuais preservados; sem política permissiva, upgrade ou alteração arriscada |

Cada aceite requer executor, SHA/deployment, horário, casos positivos e negativos, resultado e limites. Revisão estática ou emulação SQL não substituem JWT/HTTP real. Nenhum gate é encerrado só por existência de política, cadastro ou workflow.

## Limites de intervenção

Nenhuma fixture foi criada/alterada no Supabase nesta inspeção; PNGs somente locais, sem upload. Nenhum segredo do GitHub foi lido/criado. Nenhum workflow foi disparado sem pré-requisitos. Nenhum e-mail, sincronização de provedor, conta nova, alteração de senha, migração/repair/reset ou plano pago foi acionado. A ação operacional pendente pertence ao responsável do projeto; a implementação/testes executáveis permanecem com Codex e revisão com Claude assim que o login for renovado.

## Sondas runtime executadas

Oito requisições negativas no projeto Engaje aprovadas: engaje-integrations e meta-auth recusam POST sem sessão e com token inválido (401), callbacks com state forjado (400), meta-auth recusa cron sem segredo (401) e callback sem state (400). Sem redirecionar ao provedor ou registrar bodies/credenciais. Não comprovam escrita negada com viewer válido, revogação de sessão ou OAuth real.

A alternativa de consultar a janela já aberta do Claude não recebeu aprovação da interface dentro do prazo; nenhuma mensagem foi enviada por essa janela. Consulta CLI segue bloqueada por401 até o responsável renovar o login.
