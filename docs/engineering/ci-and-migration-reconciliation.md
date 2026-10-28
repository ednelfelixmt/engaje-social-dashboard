# Correção de automação e reconciliação de migrações

Levantamento em 28/10/2026 sobre main e1d2fb56501f220aeca6648365d9b13dd1cd43a9. Este registro não homologa jornadas autenticadas.

## Correções implementadas neste ciclo

- Os quatro workflows usam checkout v7.0.1 (3d3c42e5aac5ba805825da76410c181273ba90b1) e setup-node v7.1.0 (949feb2413d6458794dcd2491c4babbbce0c15c1), resolvidos pelos tags oficiais e action.yml conferidos: ambos executam em Node 24. O aplicativo continua em Node 22. Fontes: https://github.com/actions/checkout/releases/tag/v7.0.1 e https://github.com/actions/setup-node/releases/tag/v7.1.0.
- Runner explicitamente ubuntu-24.04 para evitar mudança involuntária do ambiente ubuntu-latest para Ubuntu 26. Checkout não persiste credenciais; permissões contents:read e gates permanecem.
- Upload privilegiado de fixtures no Phase 02 Final Auth Gate passa a opt-in (default false). O caminho comum usa cinco PHASE02 secrets e exige que os arquivos privados já existam. Opt-in continua disponível e requer o secret adicional PHASE02_SERVICE_ROLE_KEY; não foi executado. Falta de fixture continua NOT PROVEN, sem aprovação falsa.
- No workflow alternativo, credenciais MEDIAHUB ficam somente nas etapas de conferir configuração e executar o verificador. Checkout, setup-node e npm ci não recebem esses secrets. Nenhum valor de segredo foi consultado ou alterado.

## OPS-MIGRATION-RECON-002 — diagnóstico seguro de #211

O histórico remoto contém 95 versões, contra 42 arquivos locais. Persistem 90 versões somente remotas, 37 arquivos somente locais, cinco pares versão/nome iguais e a colisão local conhecida em 20260930230000. Não foram renomeados arquivos, adicionados placeholders ou escritos registros de histórico.

Foi comparado o fingerprint MD5 de SQL local com fingerprints calculados no servidor sobre statements históricos: somente nomes, versões, quantidades, tamanhos e hashes saíram do banco. Normalização limitada a CRLF para LF e espaços externos. **27 arquivos locais** encontram fingerprint compatível com algum registro remoto; **15 não encontram**. MD5 é triagem de conteúdo, não assinatura, prova de equivalência semântica ou autorização para marcar uma migração como aplicada.

Dos 15 sem correspondência, dez têm o mesmo nome no remoto com SQL diferente e cinco não têm o mesmo nome. Casos de mesmo nome/diferença: index_spreadsheet_uploads_uploaded_by, expand_platform_metric_storage, keep_reach_out_of_funnels, restore_reach_to_funnels, move_ingest_key_hash, integrations_strip_ingest_key_hash_trigger, expand_funnel_models, user_dashboard_layouts, organization_niche_sales_model e scheduled_sync_history_days. Sem o mesmo nome: scheduled_sync, meta_login_config_setting, client_user_invitations, agency_user_invitations e fix_platform_asset_rls_join. Coincidência por outro nome já está incluída entre os 27.

### Plano para encerrar a divergência

1. Responsável de banco cria e verifica backup de schema e histórico; arquiva snapshot cifrado fora do Git, com acesso restrito. Exportar apenas metadados/hashes para revisão. Não coletar dados reais de clientes como fixtures.
2. Recuperar fontes históricas de DDL em ambiente controlado; separar migrações antigas de carga de dados e resets. Não copiar SQL com dados reais, tokens ou operações destrutivas para o repositório como forma de preencher versões.
3. Revisar individualmente os 15 casos sem correspondência, os históricos remotos ausentes e a colisão. Conferir dependências, funções, grants e RLS; nomes e hashes isolados não decidem o histórico correto.
4. Preparar proposta de baseline ou recuperação, com lista exata de arquivos/versões, diff de schema, pré-condições, rollback e alterações de histórico necessárias. Ensaiar somente em banco descartável sem dados reais, incluindo criação limpa e upgrade, mais 140 verificações SQL e testes HTTP/JWT pertinentes. O banco descartável atual da suíte não reproduz sozinho as 95 versões históricas.
5. Revisão independente e aprovação explícita do plano concreto antes de qualquer alteração no histórico remoto. O requisito já consta do roadmap e da issue #211. Não executar repair, reset ou db push de forma automática.
6. Só encerrar #211 depois de inventários coerentes, schema/grants/RLS verificados e Supabase Preview aprovado no SHA exato. Snapshot/backup não foi criado neste ciclo e o plano ainda não está liberado para execução.

## Revisão de segurança sem mutações no banco

Os quatro avisos INFO de RLS sem policy correspondem a tabelas de convites, chaves e auditoria. Metadados confirmam RLS ativo e ausência de grants SELECT/INSERT/UPDATE/DELETE para authenticated e de SELECT para anon; criar policies apenas para eliminar o aviso ampliaria acesso. Preservados os contratos administrativos.

pg_net está em public e extrelocatable=false; ALTER EXTENSION SET SCHEMA não é uma correção aplicável. Recriar extensão pode afetar cron/HTTP e exige plano próprio. Proteção contra senhas vazadas permanece desativada no Auth: configurar no painel conforme disponibilidade do plano e validar recuperação/login; não mudar billing, senhas ou autorizações como atalho. SMTP permanece adiado pelo usuário.

npm audit sobre o lockfile retornou zero vulnerabilidades conhecidas (inclusive dev); isso não prova ausência de falhas de aplicação. Nenhum pacote ou lockfile foi alterado.

## Aceite e rollback

Validar YAML, revisar diff, executar testes/tipos/lint/SQL/arquitetura e exigir Quality Gate completo mais Vercel READY/success no mesmo head antes do merge. O sucesso de quality.yml só executa aquele workflow; os três manuais ainda dependem de ensaio protegido com credenciais/fixtures sintéticas. Não os declarar homologados por parsing. Após merge conferir CI main e deploy separadamente. Rollback restrito às Actions/runner/configuração padrão deste pacote, sem relaxar proteção ou alterar banco.

## Validação local e revisão

736 testes e 140 verificações SQL sintéticas aprovados; tipos, lint, arquitetura e inventário local passaram. Os quatro workflows foram parseados com js-yaml em Node, conferindo pins, runner, permissões, escopo de secrets e opt-in. Claude Code 2.1.302, sessão existente e ferramentas desativadas, revisou o diff estaticamente sem apontar defeito concreto. Os pontos de contexto ausente foram conferidos pelo Codex nos arquivos completos e nos action.yml dos commits oficiais: somente a etapa condicional de upload recebe service role; três workflows manuais; sem git autenticado após checkout; pins são commits e declaram Node 24. Não se trata de execução de CI ou dos workflows manuais.
