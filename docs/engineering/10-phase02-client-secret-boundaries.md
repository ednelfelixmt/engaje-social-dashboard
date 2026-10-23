# Fase 02 — Proteção de limites do código executado no navegador

A extensão de `scripts/check-architecture.ts` verifica arquivos `src/**/*.{ts,tsx}` marcados com `'use client'` e rejeita:
- imports estáticos ou dinâmicos de `@/lib/auth/session`, `@/lib/supabase/server`, `@/lib/supabase/admin` e `server-only`;
- acesso direto a variáveis de ambiente com segredo administrativo (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL`, `META_APP_SECRET`, `WINDSOR_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `TIKTOK_APP_SECRET`).

Preserva o uso de `NEXT_PUBLIC_*` e o acesso legítimo a credenciais somente em módulos de servidor. Casos positivos e negativos em `tests/architecture.test.ts`; `npm run check:architecture` continua obrigatório no CI.

Limites: verificação estática não substitui revisão dos chunks do bundle, testes de request/response, RLS, gestão de secrets no Vercel/Supabase nem audita acesso transitivo por imports relativos. Esses itens seguem no roadmap de segurança #38 e #57.
