# Ciclo 08 — Fechamento do ciclo 07 e configuração operacional do Auth

Registro histórico: 25/10/2026, America/Cuiaba. Não representa homologação comercial.

**Estado verificado em 26/10/2026:** produção READY no commit 9db86da954f012b9d4d7628dfa169dc55da82092, deployment dpl_3Jm6YopimK8jSVrRQwbyThFC16Wz, incluindo #152. O bloqueio de publicação descrito abaixo foi superado por execução posterior. O responsável adiou expressamente o SMTP; não retomar cadastro, credenciais ou ativação neste ciclo. As configurações de URL registradas em 25/10 continuam como evidência daquela execução, sem alegar nova inspeção de SMTP em 26/10.

## Código integrado

PR #152 integrado à main como dfea7ccfc9c489ba8af9c56ff28924192d5819fd. Head aprovado: a0d5869fa8035cbb735d951c66ab03d10936d40a. Quality Gate #226, run 40248078435, success (292 testes, SQL, lint, tipos, arquitetura e build Linux). Preview Vercel dpl_2NAqZNv9ezCRB9rXYgQxg1YRDYZf READY e status success no mesmo head após nova tentativa. As árvores Git do head e do merge são idênticas: c4c9842267cbbd39ddb9c0e4492f091427c334c4.

FUN-001 e ANA-019 corrigidos no código. A revisão autenticada com fontes reais e a deduplicação de alcance/frequência continuam pendentes.

## Produção e limite da Vercel

A criação de deployment de produção para dfea7ccf foi recusada: HTTP 402/payment_required, recurso api-deployments-free-per-day, mais de 100 deployments, retryAfter 86400. O serviço orientou tentar após 24 horas. Não é falha de compilação nem nova reprovação do head, mas impede publicar o merge.

Produção permanece no deployment READY dpl_GizpzttpeEDxftwdSrRDeEFehziP, commit 5d3a180e (recuperação de senha). Não afirmar que o funil/calendário de #152 está em produção. Não houve troca de plano, equipe, região, proteção ou uso de preview como produção para contornar o limite.

Fallback oficial pela CLI instalada 59.5.0 foi tentado no mesmo endpoint, equipe/projeto e commit. A primeira chamada rejeitou os argumentos e a tentativa corrigida falhou internamente com erro de faixa de err; nenhum deployment foi criado pela CLI. Descoberta pública do Marketplace também encontrou esse erro. Não usar isso como prova de autorização, instalação ou publicação bem-sucedida.

Condição de liberação: cota disponível e deployment de produção do merge atual READY, domínio atribuído e sondas após publicação. Se main avançar, revisar o novo conteúdo/gates antes de publicar. Nenhum agendamento futuro foi criado.

## Auth corrigido no projeto engaje-social

Na sessão autenticada do painel, Site URL era http://localhost:3000 e não havia Redirect URLs. Foram salvos e verificados:

- Site URL: https://mediahub.engajeperformance.com.br
- Redirect URL: https://mediahub.engajeperformance.com.br/auth/recovery/callback
- Redirect URL: https://mediahub.engajeperformance.com.br/auth/invite

As duas rotas correspondem aos destinos usados no código atual. Sem wildcard amplo, novos destinatários de dados, papéis, RLS ou alterações em usuários. A página confirmou duas URLs; evidência visual sem credenciais foi salva no relatório local. Nenhum template, senha ou token foi alterado e nenhum e-mail real foi enviado.

## E-mail: dependência concreta

O painel confirmou custom SMTP desligado e templates padrão. O responsável informou não possuir provedor SMTP. O serviço padrão Supabase restringe destinatários à equipe do projeto e não se destina a clientes em produção; não adicionar clientes à equipe administrativa como solução.

Resend é compatível com SMTP do Supabase e foi proposto para ativação. A página de cadastro foi preparada, mas não foi criada conta, aceita assinatura/termos, gerada chave ou contratado plano. Cadastro requer a atuação do responsável com credenciais pessoais e aceite dos termos. A integração SMTP ficará no Supabase, sem SDK adicional nem chave no bundle/Vercel.

Após conta e domínio verificados, a configuração publicada pelo provedor é host smtp.resend.com, porta 465, usuário resend; a senha SMTP corresponde à API key e deve ser inserida diretamente no painel protegido, nunca neste documento/chat. Nome de remetente proposto: Engaje Mídia Hub. O e-mail de remetente será escolhido dentro do domínio efetivamente verificado; não foi inventado ou gravado endereço como se já estivesse habilitado.

Os registros DNS devem ser exatamente os fornecidos para a conta/domínio pelo provedor. Não foram gerados valores fictícios de SPF/DKIM, removidos registros existentes ou presumida verificação. Sem conta/domínio/chave, não habilitar SMTP com campos vazios.

## Aceite ainda necessário

Com identidade e caixa postal sintéticas protegidas: entrega, PKCE no mesmo navegador, link expirado/uso único, alteração de senha, novo login e sessões anteriores. O responsável realiza a entrada de novas credenciais. SEC-010/011, SEC-014 runtime e UX-002 continuam abertos; configuração de URLs não equivale a teste Auth A/B.

## Fontes e manutenção

- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend com Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Limites Vercel](https://vercel.com/docs/limits)

Este lote altera somente documentação no repositório. O código mantém a validação do PR #152; o PR de evidência recebe seus próprios gates e não será integrado sem as aprovações exigidas. Nenhuma migração, dado real de cliente ou segredo integra o diff.

Revisão Security Advisor após ajuste de Auth: permanecem os avisos conhecidos de [pg_net em public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senha vazada desligada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), além de quatro avisos informativos de RLS sem políticas nas tabelas internas que usam negação por padrão. SEC-012/013 seguem registrados; nenhuma política permissiva foi criada para suprimir avisos.

Registro de identificadores: o funil de #152 passa a FUN-001 (referido como ANA-018 no registro anterior), evitando colisão com ANA-018 de contagens negativas no PR #153, trabalho independente ainda aberto. Calendário mantém ANA-019. Nenhum código do PR #153 foi sobrescrito, integrado ou homologado por este lote.
