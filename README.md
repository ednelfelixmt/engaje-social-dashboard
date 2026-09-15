# Engaje Mídia Hub

Next.js 14 App Router, TypeScript, Tailwind, componentes shadcn/ui, Recharts e Supabase. Tema escuro com destaque amarelo. Sem métricas fictícias.

## Executar

```sh
npm ci
npm run dev
npm run typecheck
npm run build
node --import tsx scripts/verify-schema.ts
```

Node 22 ou superior. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para outro projeto; `src/lib/supabase/config.ts` contém a configuração pública do Engaje. Nunca coloque service_role ou tokens de provedores no frontend.

## Banco novo

Execute em ordem `supabase/schema.sql`, `supabase/services.sql` e `supabase/token-vault.sql` no Supabase. O bootstrap não é idempotente e não deve ser executado sobre tabelas existentes. São 11 tabelas com RLS, vínculos compostos por organização, Storage privado e Vault para tokens.

Crie o primeiro usuário no Supabase Auth, uma organização com `is_agency=true` e membership `super_admin` usando o UUID real desse usuário. Não use user_metadata para atribuir permissões. Depois o painel `/admin` cria e gerencia clientes. Usuários precisam existir no Auth antes de associar o UUID em Usuários.

## Implementado

- Login por senha, sessão SSR, autorização no servidor e isolamento RLS.
- Administração de clientes, pausa e vínculos de usuários existentes.
- Branding por organização e uploads privados de logo, favicon e fundos. A imagem de login fica disponível por slug antes da autenticação.
- Visão geral, tráfego pago, funil, orgânico, galeria e receita externa; filtros de datas, moeda e Não comparar.
- Abas de plataformas com dados; Facebook e Instagram filtrados separadamente.
- Configuração de páginas, métricas e ordem dos quatro blocos principais.
- CSV transacional para receita real, validação e detecção de arquivo duplicado. Modelo em `public/modelo-receita.csv`.
- Meta OAuth, seleção de conta pela sincronização individual, Ads por anúncio/dia e criativos. Facebook/Instagram importam conteúdos e imagens.
- Catálogo de integrações por cliente com estágio explícito. Meta e Windsor/Google Ads aparecem como operacionais; TikTok Ads, TikTok orgânico, HubSpot, RD Station, CRM genérico e Stract podem ter sua base registrada sem expor segredos no navegador.
- Endpoint autenticado por chave própria para cargas normalizadas de Stract e CRM genérico. Aceita anúncios, CRM, criativos e métricas orgânicas; contrato em `docs/integracoes-ingestao.md`.

## Meta

Publique `supabase/functions/engaje-integrations/index.ts` como `engaje-integrations` e `meta-auth`, com verify_jwt=false. POST valida o usuário e a organização no código; callback valida state assinado e nonce de uso único. Configure secrets `META_APP_ID`, `META_APP_SECRET`; Supabase fornece URL e service_role no runtime. O callback cadastrado no app Meta deve corresponder exatamente à constante callback. A origem padrão é `https://mediahub.engajeperformance.com.br`.

Tokens são guardados no Vault por RPC exclusiva de service_role. Contas autorizadas são criadas desabilitadas; sincronizar uma conta ativa sua importação. Ads busca os últimos 30 dias e criativos. Não há agendamento automático nesta versão. Validar OAuth e permissões com uma conta real antes de considerar o conector homologado.

## Receita

A view `daily_performance` agrega cada origem separadamente por organização/dia/moeda. Prioriza receita real completa de CRM/planilha, depois receita de anúncios. Zero é conhecido; NULL é indisponível. ROAS=receita/investimento; ROI=(receita-investimento)/investimento*100. Divisor zero fica indisponível. Não mistura moedas ou soma duplicadamente CRM com planilha. Ranking usa apenas receita atribuída à mesma campanha.

Ao importar planilha, o lote substitui atomicamente todos os registros de planilha nos dias/moedas presentes. Só confirme conciliação completa quando cobrir integralmente esses dias.

## Estágio dos integradores

- Operacionais: Meta Ads, Facebook orgânico, Instagram orgânico e Google Ads via Windsor.
- Base preparada: TikTok Ads, TikTok orgânico, HubSpot, RD Station, CRM genérico e Stract.
- Mapeamento pendente: Google Business Profile e YouTube via Windsor.

“Base preparada” cria o vínculo isolado com a organização e registra o modo e os requisitos do conector. Isso não é apresentado como conta conectada: OAuth, credenciais e adaptador de sincronização ainda precisam ser homologados.

## Limitações desta versão

Google Business, YouTube, TikTok, Stract e conectores CRM ainda precisam dos respectivos adaptadores e credenciais. Métricas orgânicas diárias não são sincronizadas pelo conector Meta atual; conteúdos e contadores acumulados de curtidas/comentários, e reações/compartilhamentos quando retornados pela API. Os acumulados são exibidos por post e não entram nas séries diárias. As metas são armazenadas, mas ainda não têm alertas de acompanhamento. Favicon enviado ainda não é aplicado aos metadados. Não há convites automáticos de usuários nem recuperação de senha na interface. URLs de imagens da Meta podem expirar e exigem nova sincronização; não são copiadas para Storage. Essas capacidades não devem ser apresentadas como prontas para produção.

## Deploy

O repositório está ligado à Vercel. `vercel.json` seleciona Next.js e build padrão. A branch main publica produção. Validar login, RLS, conta real e importação após configurar o projeto.

Em bancos já instalados antes desta atualização, execute `supabase/organic-counters.sql` uma única vez. Em novos bancos, a coluna já consta do schema.
