# Ciclo 06 — Recuperação de senha com Supabase Auth

Data: 25/10/2026. Código em validação; envio e jornada autenticada reais ainda não homologados.

## Fluxo entregue

O login passa a oferecer Esqueci minha senha. A solicitação valida e normaliza o e-mail e chama resetPasswordForEmail usando o cliente SSR existente. A resposta permanece indistinguível entre conta existente, inexistente ou rejeição do provedor; não afirma que um e-mail foi entregue. Nenhum dado de perfil ou membership é criado/alterado pela recuperação.

A rota auth/recovery/callback troca o código PKCE pelo cliente oficial Supabase, preserva cookies de sessão e de limpeza inclusive no erro, remove o código da URL de destino e desabilita cache. O destino é sempre auth/reset-password. Host, Origin, next e redirectTo fornecidos pelo navegador não escolhem o destino. APP_ORIGIN é configuração confiável somente do servidor; o padrão é a origem de produção Engaje. HTTP só é aceito para localhost/127.0.0.1 de desenvolvimento; credenciais, caminho, query e fragmento na origem são recusados.

A página e a Server Action de redefinição validam a identidade no Auth por getUser. A senha é alterada somente pelo updateUser da sessão corrente, sem UUID recebido do formulário, chave de serviço ou SQL em Auth. A validação exige 12 caracteres, confirmação, valor não vazio e no máximo 72 bytes UTF-8, sem truncamento silencioso. Regras adicionais do provedor continuam valendo.

Após alteração confirmada, a ação solicita signOut global. Se o encerramento falhar, informa que a senha já mudou e orienta a sair/entrar novamente, sem fingir rollback da senha. A revogação de refresh tokens não invalida imediatamente um access JWT já emitido: ele pode permanecer válido até expirar. SEC-011 continua exigindo a prova real de sessão e acesso revogado.

## Interface e segurança

Formulários apresentam pendência, erro anunciado por role=alert, sucesso por role=status, labels e autoComplete apropriados para gerenciadores de senha. O formulário de senha desaparece após sucesso; link inválido, sessão ausente e falha do Auth não exibem campos de atualização. Página/handler autenticados usam force-dynamic; callback envia Cache-Control private/no-store, Pragma, Expires e Referrer-Policy no-referrer. Não foi substituído o provedor Auth nem alterada a autorização de leitura dos clientes.

## Validação

19 regressões cobrem: limites/Unicode, normalização, resposta sem enumeração de contas, identidade validada antes da mudança, UUID de terceiro ignorado, rejeição pelo provedor, falha de logout após senha já salva, PKCE, cookies e sua limpeza, cache, origem/next maliciosos, link inválido, formulário pendente, sucesso, erro e página sem sessão. Dependências de Auth são doubles explícitos, sem rede, tokens ou destinatários reais. Os testes não enviam e-mails.

## Configuração e aceite externo

1. Em produção, confirmar Site URL e permitir exatamente https://mediahub.engajeperformance.com.br/auth/recovery/callback nas URLs de redirecionamento do Supabase. Preservar convites e callbacks já autorizados; não cadastrar wildcard amplo.
2. Em staging próprio, definir APP_ORIGIN com a origem HTTPS aprovada e permitir o callback exato. O usuário deve abrir o e-mail no mesmo navegador que iniciou PKCE.
3. Executar com identidade sintética protegida: solicitar link, receber e-mail real, expiração/uso único, troca da senha, cookies, novo login, sessão anterior, limites de envio e desktop/mobile/teclado. Configurações de reautenticação ou senha atual do provedor não devem ser desabilitadas para passar nos testes.
4. Verificar SMTP e proteção contra senhas vazadas conforme o plano existente. Leaked password protection continua WARN conhecido, sem declarar ativação por este código.

Quality Gate e Vercel do mesmo SHA são obrigatórios para integrar. Não há migração nova nem alteração de template/configuração do provedor neste ciclo. Rollback: reverter as rotas/formulários de recuperação; preservar login, sessões e os controles RLS existentes. Não há senha disponível para reverter e não se deve tentar restaurá-la.

Referências: [Supabase SSR/PKCE](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [Password reset](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [Password security](https://supabase.com/docs/guides/auth/password-security), [Sign out](https://supabase.com/docs/reference/javascript/auth-signout). Estado da publicação e testes reais deve ser registrado sem confundir mocks com homologação.

Validação local final: 265 testes, 140 checks SQL, lint ampliado, tipos, arquitetura e build aprovados. Os testes de renderização detectaram uma label sem fechamento no formulário; corrigida antes dos gates. O build gera as rotas forgot-password, recovery/callback e reset-password. Nenhum e-mail real foi enviado para essa validação.
