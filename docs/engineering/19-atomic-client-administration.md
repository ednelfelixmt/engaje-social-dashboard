# Ciclo 04 — Administração atômica e histórico por cliente

Data: 25/10/2026. Escopo: #54, #65 e cadastro de clientes. Implementação em validação; homologação autenticada permanece aberta.

## Entrega funcional

- Criar cliente, branding/configuração inicial e funil em uma transação. Se a aplicação do funil falhar, nenhum cliente órfão é persistido.
- Atualizar cliente e aplicar funil em uma transação; sem aplicação explícita, o funil personalizado permanece intacto. Configuração ausente é erro, não sucesso com zero linhas.
- Atualizar vínculo de acesso e revogar convites pendentes desse cliente/usuário na mesma transação. Apenas viewer pode ser concedido. Registro Auth confirmado e convite global ausente/aceito são exigidos para ativação; desativação continua possível com cadastro pendente. Organização da agência e vínculos super_admin são protegidos. SaveMember usa JWT do administrador, sem chave de serviço ou fallback para gravações sequenciais.
- Tela administrativa de histórico por cliente, com carregamento, vazio, falha/repetição e tabela acessível. Exibe até 100 eventos de cadastro, dados do cliente, funil, acesso e revogação de convite. Guarda administrativa precede consultas; clientes não acessam o histórico.

## Segurança e integridade

RPCs públicas são SECURITY INVOKER. Criar/editar preservam as políticas RLS existentes e verificam administrador ativo da agência. Somente a transação de membership precisa de SECURITY DEFINER para ler Auth/convites privados. A consulta de auditoria usa helper privado definer com a mesma autorização e escopo de um cliente. Todas as funções fixam search_path vazio e têm execução anon/PUBLIC revogada. Nenhuma autorização usa user_metadata ou e-mail fornecido pelo solicitante.

A tabela de auditoria fica em private, com RLS e sem privilégios diretos de anon/authenticated/service_role. Triggers privados registram auth.uid(), horário, organização, usuário afetado e estados mínimos. Dados do cliente/funil registram apenas os nomes dos campos alterados; não se copiam nomes de clientes, conteúdo do funil, e-mails, métricas, tokens ou payloads. A gravação do histórico participa da mesma transação, inclusive rollback por falha posterior. Registros são preservados após exclusão do cliente; a tela exige um cliente existente. Alterações internas sem sessão de administrador não são atribuídas falsamente a uma pessoa.

Locks seguem cliente → identidade Auth → convite → membership; não há HTTP dentro da transação. Os testes SQL provam atomicidade por falha intermediária. Concorrência entre conexões reais, JWT, PostgREST e jornada visual ainda dependem de staging Engaje (#57), SEC-010/011 e UX-002. As issues #54/#65 não são encerradas por testes locais apenas.

## Migração e plano operacional

Arquivo criado com a CLI oficial 2.83.0, após consultar --help: 20261025203411_atomic_client_administration.sql. A CLI 2.122.0 tentou criar telemetria fora da área do projeto e foi bloqueada pelo ambiente; a versão compatível foi usada apenas como ferramenta local, sem dependência nova do aplicativo.

Pré-flight live somente leitura confirmou: funções novas/tabela de auditoria ausentes; inicialização cria branding/config; trigger de membership restringe super_admin à agência; índices únicos de convites por usuário e cliente/usuário presentes; Auth possui email_confirmed_at. A migração é aditiva: cria funções, tabela privada e triggers, sem atualizar registros de clientes, Auth ou convites existentes.

Ordem de publicação: testes/build locais → PR com Quality Gate e Vercel aprovados no mesmo SHA → aplicar migração aditiva revisada → verificar catálogo, grants, RLS e assinaturas → integrar aplicação à main. A versão anterior continua compatível enquanto as funções são acrescentadas. Falha na migração impede integrar chamadas que dependam delas; não há fallback permissivo. Não executar bootstrap ou migrações antigas sobre produção.

Rollback/contensão: manter dados e histórico privado. Se necessário, retirar a versão da aplicação que chama as RPCs e revogar EXECUTE das novas entradas públicas, sem apagar auditoria ou clientes. Para falha do trigger de auditoria que afete gravações anteriores, desabilitar apenas os quatro triggers novos após inspeção; registrar a lacuna de rastreabilidade. Não remover RLS, conceder grants amplos ou descartar histórico. Nenhuma função Edge é publicada neste ciclo.

## Evidências e pendências

43 novas regressões iniciais (ações, SQL e interface), mais teste de auditoria de funil. Suíte anterior à última regressão: 232 testes e 139 checks SQL aprovados, tipos e arquitetura aprovados. Corrigidos antes de integrar: inferência de tipo do funil, delimitador SQL de fixture e mocks de renderização. O inventário local passou de 23 a 25 tabelas públicas ao reproduzir os dois cadastros de convite já existentes em produção; a autorização deles continua negada aos clientes.

DEV-002: geração integral antiga tentou remover campos de métricas/metas e refinamentos existentes. Essas remoções foram descartadas. Novo modo functions-only preserva tabelas/views/RPCs existentes e atualiza somente assinaturas introspectadas; reconciliar o gerador integral permanece responsabilidade da engenharia antes da estabilização de 11/12/2026.

Fontes verificadas: [Database Functions](https://supabase.com/docs/guides/database/functions), [Postgres locks](https://www.postgresql.org/docs/current/explicit-locking.html). Changelog consultado em 25/10: alterações de TLS e extensões não exigem mudança desta migração. Resultado final, implantação e gates serão registrados após execução. Nenhum dado real de cliente foi usado como fixture.

Registro de validação: uma execução local de tipos coincidiu com o rebase da branch e reportou arquivo temporariamente ausente (TS6053). Repetir o gate com a árvore estável; essa execução não conta como aprovação. A correção ANA-015 (#144) da main foi preservada.
