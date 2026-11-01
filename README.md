# Engaje Mídia Hub

Next.js 16 App Router, TypeScript, Tailwind, componentes shadcn/ui, Recharts e Supabase. Studio de relatórios claro, tema escuro opcional e gráficos com cores por fonte e variação semântica. Sem métricas fictícias.

Aceitação autenticada das páginas: `npm run verify:authenticated-http`, somente com configuração protegida dos dois usuários sintéticos conhecidos. Procedimento e limites em [authenticated-http-acceptance.md](docs/engineering/authenticated-http-acceptance.md). Não colocar senhas em comandos ou logs.

## Executar

```sh
npm ci
npm run dev
npm run typecheck
npm run build
node --import tsx scripts/verify-schema.ts
```

Após o build, inicie `npm run start` e execute `npm run verify:http` para verificar
login, recuperação de senha e negação de acesso administrativo sem sessão. O CI
executa essa checagem contra o próprio build. Para verificar o domínio publicado,
defina `SMOKE_BASE_URL=https://mediahub.engajeperformance.com.br`. Em previews que
redirecionam a recuperação para produção, defina também `SMOKE_CALLBACK_ORIGIN`
com a origem canônica configurada no servidor. A checagem faz somente GETs anônimos;
não substitui login A/B, entrega de e-mail, testes visuais ou integrações reais.

Node 22 ou superior. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para outro projeto; `src/lib/supabase/config.ts` contém a configuração pública do Engaje. Nunca coloque service_role ou tokens de provedores no frontend.

## Banco novo

Em um banco novo, execute em ordem `supabase/schema.sql`, `supabase/services.sql` e `supabase/token-vault.sql`. Antes de conceder acesso a clientes, aplique também as quatro migrações de autorização de 23–24/10: `20261023183000_client_dashboard_readonly.sql`, `20261023215000_client_profiles_layouts_readonly.sql`, `20261023223000_csv_import_storage_admin_only.sql` e `20261024040500_storage_update_admin_only.sql`, nesta ordem. O bootstrap histórico sozinho ainda contém permissões legadas de escrita; não o considere configuração final segura. O bootstrap não é idempotente e não deve ser executado sobre tabelas existentes. O banco descartável de teste reproduz também as migrações de métricas primitivas, metas, convites e administração atômica, com 25 tabelas públicas e auditoria privada. Para a administração atômica em banco novo, aplique antes `20261021150000_client_user_invitations.sql` e `20261021170000_agency_user_invitations.sql`, depois `20261025230609_atomic_client_administration.sql`. Isso não substitui testes JWT/Storage HTTP. Há RLS, vínculos compostos por organização, Storage privado e Vault para tokens.

Crie o primeiro usuário no Supabase Auth, uma organização com `is_agency=true` e membership `super_admin` usando o UUID real desse usuário. Não use user_metadata para atribuir permissões. Depois o painel `/admin` cria e gerencia clientes. Usuários precisam existir no Auth antes de associar o UUID em Usuários.

## Implementado

- Login por senha, sessão SSR, autorização no servidor e isolamento RLS. Recuperação de senha com PKCE, sessão verificada e resposta sem enumeração de contas.
- Administração de clientes, pausa e vínculos de usuários existentes. Criação/edição com funil e alteração de acesso usam RPCs transacionais exclusivas da agência. Histórico por cliente em `/admin/organizations/<id>/activity`; consulte o plano de rollout em `docs/engineering/19-atomic-client-administration.md`.
- Branding por organização e uploads privados de logo, favicon e fundos. A imagem de login fica disponível por slug antes da autenticação.
- Visão geral, tráfego pago, funil, galeria e receita externa; filtros de datas, moeda e Não comparar.
- Páginas dedicadas de mídia paga: Meta Ads, Google Ads e TikTok Ads, com estados explícitos quando não há dados. Os módulos orgânicos existentes ainda precisam de reativação e homologação das próprias rotas; atualmente essas URLs redirecionam para tráfego pago.
- Comparação por período também nas páginas específicas, com KPIs próprios, ranking de campanhas, linha do tempo e galeria filtrada.
- Configuração de páginas, métricas e ordem dos quatro blocos principais.
- Dashboard personalizável por usuário: botão "Personalizar" em cada tela (arrastar e ocultar cards, reordenar e ocultar blocos), salvo na conta em `user_dashboard_layouts` (RLS: cada pessoa só acessa o próprio layout). Somente superadministradores autorizados da agência podem personalizar ou promover a própria visão a padrão do cliente (`dashboard_configs.default_layouts`). A ordem antiga salva no navegador é importada uma única vez.
- CSV transacional para receita real, validação e detecção de arquivo duplicado. Modelo em `public/modelo-receita.csv`.
- Meta OAuth, seleção de conta pela sincronização individual, Ads por anúncio/dia e criativos. Facebook/Instagram importam conteúdos e imagens.
- Catálogo de integrações por cliente com estágio explícito. Meta e Windsor/Google Ads aparecem como operacionais; TikTok Ads, TikTok orgânico, HubSpot, RD Station, CRM genérico e Stract podem ter sua base registrada sem expor segredos no navegador.
- Endpoint autenticado por chave própria para cargas normalizadas de Stract e CRM genérico. Aceita anúncios, CRM, criativos e métricas orgânicas; contrato em `docs/integracoes-ingestao.md`.
- Diagnóstico operacional por cliente, verificando no backend a presença das credenciais, contas configuradas e registros recebidos sem revelar chaves ou tokens.

## Meta

Publique `supabase/functions/engaje-integrations/index.ts` como `engaje-integrations` com verify_jwt=true. Publique `supabase/functions/meta-auth/index.ts` como `meta-auth` com verify_jwt=false, incluindo a implementação de integrações e os módulos de `_shared` no bundle. O wrapper garante a mesma implementação nas duas funções; o callback e o cron usam meta-auth, com autenticação própria no código. POST valida o usuário e a organização no código; callback valida state assinado e nonce de uso único. Configure secrets `META_APP_ID`, `META_APP_SECRET` e, opcionalmente, `META_STATE_SECRET` (chave própria para assinar o state do OAuth; sem ela usa `META_APP_SECRET`); Supabase fornece URL e service_role no runtime. O callback cadastrado no app Meta deve corresponder exatamente à constante callback. A origem padrão é `https://mediahub.engajeperformance.com.br`.

Tokens são guardados no Vault por RPC exclusiva de service_role. Contas autorizadas são criadas desabilitadas; sincronizar uma conta ativa sua importação. Ads busca os últimos 30 dias e criativos. Não há agendamento automático nesta versão. Validar OAuth e permissões com uma conta real antes de considerar o conector homologado.

## Receita

A view `daily_performance` agrega cada origem separadamente por organização/dia/moeda. Prioriza receita real completa de CRM/planilha, depois receita de anúncios. Zero é conhecido; NULL é indisponível. ROAS=receita/investimento. A interface mantém ROI e lucro indisponíveis sem custos financeiros completos. A migração `20261025232744_withhold_unverified_financial_roi.sql` estende a mesma regra à view SQL sem alterar a política de receita de cada instalação; ver `docs/engineering/20-financial-roi-view-contract.md` para rollout. Divisor zero fica indisponível. Não mistura moedas ou soma duplicadamente CRM com planilha. Ranking usa apenas receita atribuída à mesma campanha.

Ao importar planilha, o lote substitui atomicamente todos os registros de planilha nos dias/moedas presentes. Só confirme conciliação completa quando cobrir integralmente esses dias.

Datas explicitamente inválidas nos filtros são recusadas com orientação e recuperação do período padrão por clique; não são trocadas silenciosamente por outro recorte. Filtros conhecidos de campanha, plataforma, fonte e moeda são preservados na recuperação. Contrato em `docs/engineering/strict-date-filters.md`.

## Relatórios privados

As páginas de público/dispositivos Meta e Google oferecem CSV com período, fonte, moeda, cobertura por indicador e registros de origem. Campos ausentes ficam vazios; cada dimensão é independente. O download é local e mantém a autorização de leitura do cliente, sem criar links públicos. Consulte `docs/engineering/audience-reports-and-csv.md` para limites e homologação pendente.

O relatório executivo oferece comparação, impressão e CSV local. A análise de receita externa separa CRM/planilha e exibe conciliação por dia, com CSV local por fonte e período. A consulta de metas e referências em `reports/targets` compara quatro indicadores de anúncios com o cadastro da agência, preserva ausências e não presume vigência mensal; referências ainda sem base compatível ficam explícitas. O CSV local inclui unidades, diferenças, estados e cobertura. O relatório também oferece impressão e salvamento local em PDF, preservando o contexto e os avisos; a paginação e o salvamento real ainda exigem homologação visual. Veja `docs/engineering/target-references.md`.

No executivo, o nome da campanha abre o detalhamento privado por conta e plataforma, com tabela diária, filtros, comparação, impressão/PDF e CSV local de valores recebidos, cobertura e calendário. Lacunas permanecem indisponíveis e valores observados são distinguidos de coleta completa; veja `docs/engineering/campaign-detail.md`.

O relatório privado de conteúdos orgânicos em `reports/organic-content` lista publicações recebidas de Facebook e Instagram, por data de publicação UTC, com contadores acumulados por conteúdo e coleta identificada. Inclui CSV local, distingue zero de indisponibilidade e sinaliza o limite de 500 linhas; não apresenta os contadores como atividade do período. Requer a página organic habilitada. Contrato em `docs/engineering/organic-content.md`.

O relatório privado de dados recebidos por conta em `reports/organic-accounts` consulta registros de Facebook/Instagram com presença de datas e campos aceitos e CSV local. A janela original de medição não está confirmada: o rótulo diário armazenado pode conter totais de vários dias. Não oferece somas, taxas ou crescimento; seguidores são estoque e alcance pode se sobrepor. Requer organic habilitado. Veja `docs/engineering/organic-accounts.md`.

Os dois relatórios orgânicos oferecem impressão e salvamento local em PDF, preservando contexto e avisos e ocultando filtros/controles. Paginação e salvamento real ainda exigem homologação visual; contrato em `docs/engineering/organic-print.md`.

O guia privado em reports/methodology permite consultar as79 definições do catálogo com busca, filtros, condições de cálculo e limites por contexto pago, orgânico e CRM. Acesso exige overview habilitado. Seleção no catálogo não comprova recebimento ou homologação. Veja docs/engineering/metric-methodology.md.

## Estágio dos integradores

- Operacionais: Meta Ads, Facebook orgânico, Instagram orgânico e Google Ads via Windsor.
- Base preparada: TikTok Ads, TikTok orgânico, HubSpot, RD Station, CRM genérico e Stract.
- Mapeamento pendente: Google Business Profile e YouTube via Windsor.

“Base preparada” cria o vínculo isolado com a organização e registra o modo e os requisitos do conector. Isso não é apresentado como conta conectada: OAuth, credenciais e adaptador de sincronização ainda precisam ser homologados.

## Limitações desta versão

Google Business, YouTube, TikTok, Stract e conectores CRM ainda precisam dos respectivos adaptadores e credenciais. O conector Meta recebe registros de contas e conteúdos com contadores acumulados de curtidas/comentários, e reações/compartilhamentos quando retornados pela API. O rótulo diário dos registros de contas não comprova a janela de medição; totais sem pontos temporais podem estar associados à data de sincronização (DATA-ORG-PERIOD-001). Os acumulados são exibidos por post e não entram nas séries diárias. As metas são armazenadas, mas ainda não têm alertas de acompanhamento. Favicon enviado ainda não é aplicado aos metadados. Convites e recuperação de senha possuem fluxos implementados; entrega de e-mail, expiração e jornada autenticada exigem homologação protegida. Configuração de recuperação em `docs/engineering/21-password-recovery.md`. URLs de imagens da Meta podem expirar e exigem nova sincronização; não são copiadas para Storage. Essas capacidades não devem ser apresentadas como prontas para produção.

## Deploy

O repositório está ligado à Vercel. `vercel.json` seleciona Next.js e build padrão. A branch main publica produção. Validar login, RLS, conta real e importação após configurar o projeto.

Em bancos já instalados antes desta atualização, execute `supabase/organic-counters.sql` uma única vez. Em novos bancos, a coluna já consta do schema.

Em bancos já instalados, execute também `supabase/migrations/20260930000000_move_ingest_key_hash.sql` (move o hash da chave de ingestão para `integration_ingest_keys`, inacessível ao navegador) e republique as funções `engaje-ingest`, `engaje-integrations` e `meta-auth`. Cargas externas (Stract) para Meta Ads, Google Ads, Facebook e Instagram orgânico são recusadas enquanto o cliente tiver o conector nativo ativo.

Em bancos já instalados, execute também `supabase/migrations/20260930120000_expand_funnel_models.sql` e `supabase/migrations/20260930200000_user_dashboard_layouts.sql`.

## Sincronização automática

Um job do `pg_cron` (`engaje-scheduled-sync`) roda às 09:00 e 21:00 UTC (06:00 e 18:00 em Brasília) e dispara uma chamada por integração (Meta Ads, Facebook e Instagram orgânico, Windsor) para a função `meta-auth`, que executa a mesma sincronização do botão manual. A chamada é autenticada pelo segredo `engaje_cron_secret` guardado no Vault do banco (validado por `verify_cron_secret`), sem secrets de Edge Function. Contas com token expirado ou revogado passam a `expired` e exigem reconexão; falhas passageiras (limite da Meta, timeout) mantêm a conta ativa e são tentadas de novo na janela seguinte. Para testar uma conta: `select private.run_scheduled_syncs('<id da integração>');`. Migração: `supabase/migrations/20260930210000_scheduled_sync.sql` (ajuste a URL em `engaje_functions_url` ao adaptar para outro projeto).

## Login da Meta com configuração (opcional)

O ID fica no Vault do banco (segredo `meta_login_config_id`, lido por `public.meta_login_config_id()`); o secret `META_LOGIN_CONFIG_ID` da função, se existir, tem prioridade. Para voltar ao login por permissões: `delete from vault.secrets where name = 'meta_login_config_id';`. Quando há ID, o login usa o ID da configuração de Login do Facebook para Empresas (`config_id`, com `override_default_response_type=true`) em vez de `scope`. Sem ele, nada muda. `engaje-integrations` e `meta-auth` devem ser publicadas com o mesmo código.

O diagnóstico de qualidade em `settings/data-quality` é restrito à agência. Distingue datas futuras/inválidas de ausência de histórico e mostra sincronizações com horários, cronologia e contador final registrado, sem presumir zero processado em trabalhos incompletos. Veja `docs/engineering/data-quality-diagnostics.md`.

## Engenharia e implantação por fases

Consulte [docs/engineering/02-architecture-and-gates.md](docs/engineering/02-architecture-and-gates.md) para a arquitetura, regras de segurança e gate de qualidade; [docs/engineering/04-roadmap-continuous-delivery.md](docs/engineering/04-roadmap-continuous-delivery.md) para o roadmap vivo e as pendências rastreáveis. O CI GitHub Actions em `.github/workflows/quality.yml` executa testes, tipos e build. CI aprovado **não** substitui teste de autorização entre empresas nem homologação visual autenticada.

## Tipos de RPCs

Use `npm run types:generate:functions` para atualizar RPCs por introspecção do banco descartável sem apagar contratos existentes de tabelas e views. O gerador integral ainda depende de reconciliar todas as migrações históricas e refinamentos de tipos; não substituir os tipos atuais por uma geração incompleta.

A central privada em `/[organizationSlug]/reports` reúne os relatórios habilitados. O novo `reports/funnel` usa as etapas cadastradas pela agência, filtros de plataforma/período, CSV e impressão local, com cobertura e limites explícitos. Veja [o contrato e as evidências](docs/engineering/report-center-and-funnel.md). O lint incremental pode ser executado no Windows/Linux com `npm run lint`; os alvos revisados estão em `scripts/lint-files.json`.

A área privada /[organizationSlug]/reports/analytics oferece Análise 360 com datas livres, comparativos, mídia, funil, demografia, CSV e apresentação em TV. Consulte [contrato e limites](docs/engineering/analytics-bi-workspace.md) e [plano dos dois produtos RD Station](docs/engineering/rd-station-analytics-plan.md). País e pipeline RD reais continuam pendentes de ingestão/conexão e homologação.

Análise 360, central e relatório de funil incluem o novo [Studio de relatórios](docs/engineering/report-studio-design.md): aparência clara, tema noturno opcional, KPIs selecionáveis, minisséries, gráficos alternáveis, busca/categorias e funil visual com detalhes.

A Análise 360 agora inclui a Visão BI de campanhas, inspirada na estrutura de um PBIX fornecido pelo usuário. Consulte [análise, paridade e pendências](docs/engineering/marketing-bi-pbix-reference.md).
