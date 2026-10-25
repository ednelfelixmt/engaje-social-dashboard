# Evidências de continuidade — encerramento dos ciclos 01 e 02

Data: 25/10/2026 (America/Cuiaba). Repositório: ednelfelixmt/engaje-social-dashboard. Prazo de planejamento mantido em 18/12/2026.

## Entregas integradas

| Lote | PR / merge | Evidência obrigatória |
|---|---|---|
| Dependências e Quality Gate reproduzível | #131 / c5a547c69f34abf9681d63213b60ff543feb1aef | Quality Gate #181 e Vercel aprovados no head 2c14e9b; instalação limpa, lint, tipos, build e audit |
| Complemento de autorização e replay de migrações RLS | #137 / 99008d6c058faa2724a02e6ab6ce6bfc634b45a9 | Quality Gate #191: 161 testes, 135 verificações SQL, lint, tipos (incluindo Edge helper), arquitetura e build; Vercel aprovado no head 9a9fcc0 |

A implementação SSR/navegação de #133 foi reaproveitada. As correções analíticas e CSV integradas em paralelo foram preservadas, sem recriar serviços nem substituir comportamento funcional.

Vercel confirmou o deploy produtivo dpl_6UdQF3djhbAqdtS6iBShijvtYViN como READY, branch main, githubCommitSha 99008d6c058faa2724a02e6ab6ce6bfc634b45a9. Domínio de produção: mediahub.engajeperformance.com.br. Isso confirma publicação da aplicação, sem certificar OAuth ou Edge runtime.

## Sondas HTTP negativas no runtime atual

Executadas com configuração pública e entradas sintéticas, sem token válido, senha, chave de ingestão ou segredo de cron. O teste de POST de integração utilizou ação inexistente e UUID sintético; os caminhos examinados recusam antes de operações de aplicação. Não foram enviados registros de clientes ou payloads de sincronização.

| Caso | HTTP observado | Escopo confirmado |
|---|---:|---|
| meta-auth sem sessão | 400 | Mensagem de rejeição de autenticação |
| meta-auth com bearer sintético inválido | 400 | Mensagem de rejeição de autenticação |
| Callback sem state assinado | 400 | Autorização inválida recusada |
| scheduled_sync sem segredo | 401 | Cron não autorizado recusado |
| engaje-integrations sem sessão | 400 | Rejeição de autenticação no runtime atual |
| engaje-ingest sem x-engaje-key e com integration_id sintático | 400 | Chave ausente/inválida recusada antes de consulta de integração |

A primeira sonda de ingestão omitia integration_id e atingiu validação de entrada; foi corrigida para um UUID sintético antes de registrar a prova de chave ausente. A tentativa inicial pelo cliente HTTP do runtime local falhou por transporte; a execução válida usou curl do Windows. Nenhuma dessas falhas foi registrada como sucesso de autenticação.

Não inferir destes testes autorização positiva, isolamento JWT A/B, negação para viewer com JWT válido, revogação de sessão, armazenamento privado ou consentimento Meta real. Os 400 observados são do runtime legado; o código novo separa 401/403, mas ainda exige rollout Edge.

## Pendências que continuam abertas

- SEC-014 / #38 / #59: engaje-integrations v41 e meta-auth v24 ainda precisam rollout controlado das guards e escopos OAuth, com bundle de rollback, revisão do diff e provas próprias. Merge Vercel não publica Supabase Functions.
- SEC-010/011 / #37/#57 e UX-002/#50: login real A/B, REST/RPC/Storage com identidades distintas, revogação, fluxo de admin e viewer e revisão visual desktop/mobile. Os testes SQL e doubles não fecham a homologação.
- #54/#65: atomicidade de membership/convites e cliente/funil.
- #130: três alertas moderados na cadeia Tailwind/PostCSS selector parser; nenhum crítico/alto no audit após o ciclo 01. Migração com aceite técnico e visual planejada até 11/12/2026.
- Revisão do Advisor: pg_net em public e proteção de senhas vazadas; sem mudança arriscada de extensão ou abertura de grants por conveniência.

Referências: auditoria em 15-continuity-audit-2026-10-25.md; contrato de autorização, limites e rollback em 16-agency-admin-boundaries.md; backlog e dependências em 04-roadmap-continuous-delivery.md. O sistema não está declarado homologado comercialmente.
