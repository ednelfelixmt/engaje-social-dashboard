# Ciclo 02 — Fronteiras de administração da agência
Data: 25/10/2026. Escopo: SEC-014/015/016 da auditoria de continuidade. Alteração reversível de código e testes; nenhuma migração aplicada em produção.

## Comportamento entregue para validação

- agencyTenant autoriza configurações do tenant somente após sessão válida, organização visível por RLS e confirmação explícita de superadmin. Branding, dashboard, integrações, diagnóstico e compartilhamento usam o gate antes das consultas de configuração.
- A navegação do cliente mantém dashboards/relatórios e remove todo o grupo administrativo. Ocultar links complementa, sem substituir, a autorização server-side.
- session só aceita is_super_admin === true. Resultados truthy malformados ou falha de RPC não concedem acesso.
- O helper Edge requireAgencyAdministrator valida o bearer com Auth e exige autorização positiva do banco. O caminho POST usa esse helper antes das ações; o callback exige membership super_admin ativo em agência ativa, sem fallback para editor/client_admin. Falhas de sessão/permissão retornam 401/403. State assinado, expiração, nonce, replay e o segredo próprio de scheduled_sync são preservados.
- O bootstrap descartável agora aplica as quatro migrações admin-only já existentes. O teste anterior aceitava gravações de clientes; o teste atual exige negação de branding, configurações, perfil, layouts, RPC CSV e Storage para viewer/editor/client_admin, e confirma operações permitidas ao administrador.
- README informa que o bootstrap histórico sozinho não é instalação final segura. Não executar bootstrap sobre banco existente. As migrações de autorização já aplicadas em produção não precisam ser reaplicadas por este PR.

## Evidências locais

- 159 testes automatizados passaram, incluindo execução real dos gates SSR/Edge com serviços sintéticos, negação por URL direta antes de carregar configurações e renderização da navegação com React.
- 135 verificações PostgreSQL WASM passaram, com canários de leitura próprios/cruzados A/B, escrita negada para três papéis clientes, revogação/pausa no contexto SQL e caminhos positivos da agência, incluindo importação transacional de receita sintética.
- Lint incremental ampliado aos gates/testes novos, tipos, arquitetura e build Next 16.4.3 aprovados. O helper Edge também possui verificação de tipos específica incorporada a npm run typecheck.
- Revisão React: autorização ocorre no servidor antes do fetching; não há novo segredo/consulta privilegiada em Client Component, estado compartilhado entre usuários ou mudança na ordem dos hooks. Não foram criadas permissões de edição para clientes.

Essas provas usam doubles explícitos para Auth/framework e um banco descartável de 23 tabelas do bootstrap + quatro upgrades, sem rede nem credenciais reais. Não são JWT real, API Storage real, OAuth Meta real, pentest ou revisão visual autenticada desktop/mobile.

## Produção e dependências de rollout

Inspeção read-only da função engaje-integrations v41 confirmou o fallback legado de escrita e ausência do helper de escopos OAuth já versionado (#59). O conteúdo publicado não é igual à fonte do repositório antes deste PR. meta-auth v24 e engaje-integrations v41 tinham o mesmo hash de bundle no inventário. Merge/deploy Vercel não publica Supabase Edge Functions.

Contenção atual observada no catálogo de memberships: 1 superadmin ativo e 2 viewers ativos; nenhum editor/client_admin. Não criar papéis legados ou ampliar acessos para contornar o gate.

**SEC-014 continua pendente no runtime**, vinculado a #38/#59. Antes de publicar ambas as funções: exportar os bundles vigentes para rollback em ambiente protegido, revisar todo o diff com a fonte, conferir os dois novos módulos compartilhados e o wrapper meta-auth, testar JWT inválido/ausente, viewer, admin e revogação durante callback em staging Engaje e registrar versões/hashes implantados. Sem origem autorizada, permissões ou credenciais de teste, não declarar o conector homologado.

SEC-010/011, UX-002 e #57 continuam abertos. Nenhum usuário Auth, arquivo Storage, conta de cliente ou credencial produtiva foi criado/alterado neste ciclo.

## Rollback

Aplicação: reverter este lote e acompanhar CI/Vercel; isso reabre controles administrativos na UI, embora as políticas do banco permaneçam restritivas. Não reverter as quatro migrações de autorização para acompanhar o código legado. Edge: não houve publicação neste ciclo; um rollout futuro exige o bundle anterior e plano de reversão próprios.

Atualização de base: PR #133 integrou o gate agencyTenant e as cinco páginas durante este ciclo. Este lote reaproveita essa implementação e acrescenta confirmação booleana estrita, testes comportamentais SSR/React, autorização Edge e replay das migrações. PR #134 de exportação CSV também foi preservado. Não atribuir a este lote a implementação independente de #133/#134.
