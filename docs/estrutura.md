# Estrutura App Router — Engaje Mídia Hub

Os diretórios abaixo estão reservados no pacote. Nesta etapa os arquivos implementados são o schema, os tipos, os scripts de geração/teste e a documentação. As páginas TSX, clientes Supabase e middleware serão implementados na próxima etapa; não há telas simuladas.

| Diretório | Responsabilidade / arquivos da próxima etapa |
|---|---|
| `src/app/` | `layout.tsx`, `globals.css`, `error.tsx`, `not-found.tsx` |
| `src/app/(auth)/login/` | `page.tsx`: login da agência |
| `src/app/(auth)/login/[organizationSlug]/` | `page.tsx`: login com branding do cliente |
| `src/app/auth/callback/` | `route.ts`: callback Supabase Auth |
| `src/app/(agency)/admin/` | `layout.tsx`, `page.tsx`: exige super_admin |
| `src/app/(agency)/admin/organizations/` | `page.tsx`: listagem/criação/pausa |
| `src/app/(agency)/admin/organizations/[organizationId]/` | `page.tsx`: edição |
| `src/app/(agency)/admin/users/` | `page.tsx`: membros e roles |
| `src/app/(agency)/admin/integrations/` | `page.tsx`: alertas gerais |
| `src/app/(tenant)/[organizationSlug]/` | `layout.tsx`: resolve organização e valida membership |
| `src/app/(tenant)/[organizationSlug]/overview/` | `page.tsx`: visão geral |
| `src/app/(tenant)/[organizationSlug]/paid/` | `page.tsx`: ranking e investimento consolidado |
| `src/app/(tenant)/[organizationSlug]/paid/[platform]/` | `page.tsx`: Meta Ads / Google Ads / TikTok Ads |
| `src/app/(tenant)/[organizationSlug]/funnel/` | `page.tsx`: funil unificado |
| `src/app/(tenant)/[organizationSlug]/organic/` | `page.tsx`: visão orgânica |
| `src/app/(tenant)/[organizationSlug]/organic/[platform]/` | `page.tsx`: Facebook e Instagram separados |
| `src/app/(tenant)/[organizationSlug]/creatives/` | `page.tsx`: galeria e métricas |
| `src/app/(tenant)/[organizationSlug]/external/` | `page.tsx`: CRM e planilhas |
| `src/app/(tenant)/[organizationSlug]/settings/branding/` | `page.tsx`: identidade visual |
| `src/app/(tenant)/[organizationSlug]/settings/dashboard/` | `page.tsx`: metas, widgets, páginas |
| `src/app/(tenant)/[organizationSlug]/settings/integrations/` | `page.tsx`: OAuth e contas |
| `src/app/api/branding/[organizationSlug]/` | `route.ts`: projeção pública mínima do login |
| `src/app/api/integrations/[provider]/connect/` | `route.ts`: inicia OAuth com state assinado |
| `src/app/api/integrations/[provider]/callback/` | `route.ts`: troca código e grava segredo no Vault |
| `src/app/api/integrations/[integrationId]/sync/` | `route.ts`: sincronização autorizada |
| `src/app/api/organizations/[organizationId]/uploads/` | `route.ts`: valida e importa CSV/XLSX |
| `src/components/ui/` | componentes shadcn/ui |
| `src/components/auth/` | formulário de login |
| `src/components/dashboard/` | KPI, funil, ranking, gráficos Recharts, filtros, galeria |
| `src/components/branding/` | upload/seletor de cores/ordenação |
| `src/components/integrations/` | conexão, seleção de contas, resultado de sync |
| `src/lib/supabase/` | browser.ts, server.ts, admin.ts (server-only) |
| `src/lib/auth/` | sessão e autorização por role |
| `src/lib/tenancy/` | resolução de slug e tenant |
| `src/lib/queries/` | consultas Server Components filtradas por organization_id |
| `src/lib/integrations/` | adaptadores Meta / Google / TikTok / Windsor / CRM |
| `src/lib/metrics/` | agregações e formatação; nenhuma média simples de ROAS |
| `src/lib/validation/` | validação de datas, upload, OAuth e configurações |
| `src/types/` | database.types.ts (gerado), domain.ts |
| `supabase/` | schema.sql completo |
| `supabase/functions/` | reservado para jobs assíncronos |
| `scripts/` | geração de tipos e testes PostgreSQL |
| `public/` | somente assets públicos não sensíveis |

O `src/middleware.ts` validará sessão e encaminhamento inicial, mas cada Server Action/Route Handler também fará autorização. RLS é a barreira final. Slug/organization_id vindos de URL ou formulário não concedem acesso.

Após login: super_admin → `/admin`; membro de um cliente → `/{slug}/overview`; membro de vários → seleção de organização. A lista é calculada no servidor com memberships ativos. A página atual deve ser preservada ao mudar filtros/cliente quando a nova organização permitir a página.
