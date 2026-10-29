# HOM-HTTP-001 — Aceitação HTTP autenticada de clientes

Registro de 29/10/2026. Complementa o gate JWT/Storage de `27-homologation-runner-evidence.md` com a resposta real do Next.js. Não equivale à homologação visual ou interativa do navegador.

## Contrato

`npm run verify:authenticated-http` usa `@supabase/ssr` já instalado para criar duas sessões reais com cookies exclusivamente em memória. Antes de enviar qualquer requisição autenticada ao aplicativo, exige os usuários e organizações sintéticos exatos de `existingIsolationFixtures`, organização não agência, membership único/ativo/viewer e `is_super_admin=false`. Não usa service role ou chaves administrativas. A saída contém apenas rótulos A/B, categorias e status; erros do SDK, HTML, cookies, senhas e tokens não são impressos.

O destino aceita somente HTTP em localhost/127.0.0.1, o domínio HTTPS canônico e previews com o prefixo do projeto e sufixo da equipe conhecidos. Origem com credenciais, caminho, query, fragmento, outro projeto/equipe ou protocolo é recusada antes da autenticação. Cookies são enviados em GET apenas à origem aprovada; redirects não são seguidos (manual no aplicativo, error no backend Auth).

Cada identidade precisa comprovar:

- Dashboard próprio HTTP 200 com HTML, nome da própria organização e link de navegação próprio; nenhum marcador de erro SSR, conteúdo conhecido da outra organização ou link administrativo.
- Dashboard da outra organização HTTP 404.
- `/admin` HTTP 307 para a raiz da mesma aplicação, aceitando Location relativa ou absoluta equivalente.
- Configurações de dashboard, integrações, qualidade, branding e compartilhamento HTTP 404, mesmo no tenant próprio.
- `Cache-Control` privado e `no-store` em todas as respostas.

O corpo HTML tem limite de 6 MiB e cada request tem timeout. Ambas as sessões recebem logout local e os mapas de cookies são limpos, inclusive em falha. Falha no cleanup impede PASS quando as demais verificações passaram; não substitui a causa original quando já havia falha. Login/logout modificam sessões Auth; o verificador não grava dados da aplicação.

## Configuração protegida

Definir somente no processo executor: `MEDIAHUB_HTTP_READONLY_ACK=YES_AUTHENTICATED_READS`, `MEDIAHUB_APP_ORIGIN`, `MEDIAHUB_SUPABASE_URL`, `MEDIAHUB_PUBLISHABLE_KEY`, `MEDIAHUB_A_EMAIL`, `MEDIAHUB_A_PASSWORD`, `MEDIAHUB_B_EMAIL` e `MEDIAHUB_B_PASSWORD`. O backend permitido é o projeto Engaje já fixado no runner. UUIDs/slugs dos dois fixtures são constantes; não há fallback para contas reais.

Não colocar senhas em argumentos, comandos, inputs de workflow, documentação ou logs. O comando é manual e não acrescenta login real ao Quality Gate comum. Este pacote não configura secrets nem dispara o workflow protegido GitHub. Seguir a proteção do ambiente ao executá-lo nesse contexto. O runner não contorna Deployment Protection da Vercel.

## Evidência de execução

Aplicação na base `1060cde59773ffccfbe5a3f871706d587b0e6cce`; produção Vercel `dpl_DtA9nT8TeU7eD1VCkr5vjewarNwz` READY. Senhas sintéticas existentes foram carregadas de DPAPI CurrentUser por auxiliar local; nenhum valor privado foi versionado.

| Ambiente | Horário UTC do recibo | Resultado |
|---|---|---|
| Build local Next.js 16.4.3 | 29/10 17:32:43 | 16/16 verificações autenticadas PASS |
| `mediahub.engajeperformance.com.br` | 29/10 17:33:49 | 16/16 verificações autenticadas PASS |
| Mesmo domínio, sem cookies | 29/10 17:36:20 | 16/16 sondas HTTP existentes PASS |

Os recibos locais `local-authenticated-http.json`, `production-authenticated-http.json`, `production-anonymous-http.json` e `acceptance-evidence.json` guardam somente metadados sanitizados. A identificação acima é da aplicação efetivamente testada, anterior ao commit que acrescenta o runner; não transferir esse deploy para outro SHA. A cota de deploy que bloqueou o merge #244 em 28/10 não impede afirmar o READY acima, verificado nesta rodada; não se alterou billing nem forçou publicação para obter esse resultado.

As regressões do runner usam SDK/HTTP sintéticos, com canários, para rejeitar vazamento, falta de controle positivo, erro SSR com status 200, redirect indevido, cache público, identidades/perfis incorretos, erros de serviço e cleanup. A suíte completa também revelou dois falsos negativos locais de `workflow-credential-boundaries.test.ts`: regex LF aplicada a checkout CRLF. Normalizar somente a leitura do teste preserva as mesmas asserções de permissões, pinagem e isolamento de secrets; nenhum YAML foi alterado.

## Revisão, publicação e limites

A consulta não interativa ao Claude Code foi tentada sem ferramentas e sem credenciais no contexto. Retornou HTTP 401, `OAuth access token has expired`; não houve parecer independente nesta rodada. Conforme `AGENTS.md`, a limitação fica registrada e Codex prossegue com validação própria. Nenhuma resposta do Claude foi simulada.

Integrar o pacote somente com Quality Gate e Vercel Preview aprovados no mesmo head; verificar main/produção separadamente depois. Rollback reverte o runner, testes, comandos/lint e documentação; não altera RLS ou permissões para obter PASS.

Permanecem separados: interação/login via formulário, filtros, teclado/responsividade, agência, PDFs visuais, DML/RPC/Storage de escrita, DELETE por linha, expiração natural de JWT, OAuth e fontes reais, SMTP adiado e reconciliação de migrações #211. UX-002 e SEC-010/011 não estão integralmente homologados por esta evidência HTTP.
