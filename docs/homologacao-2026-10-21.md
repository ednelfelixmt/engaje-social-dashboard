# Homologação técnica — Engaje Mídia Hub
Data: 21/10/2026. Escopo: aplicação Next.js/Vercel, isolamento lógico Supabase, dados, módulos comerciais.

## Evidências verificadas
- Produção Vercel: último deploy identificado como READY na inspeção de infraestrutura.
- Rotas detectadas na compilação Next: /, /[organizationSlug]/[section], /[organizationSlug]/intelligence, /[organizationSlug]/reports/[report], /[organizationSlug]/settings/{integrations,data-quality,dashboard,branding}, /[organizationSlug]/sharing, /admin.
- Banco: organizações, métricas e atribuições de ativos com RLS habilitado.
- Teste SQL sem identidade (role authenticated sem sessão) devolveu 0 organizações, 0 linhas de ads e 0 vínculos de ativos; **não substitui testes multiusuário com contas reais**.
- Testes automatizados e TypeScript aprovados no preview desta entrega. O script prebuild passa a ser bloqueante para deployments.
- Dados por cliente: DVL 4 campanhas até 01/10/2026; INAC 9 até 01/10; Náutica 2 até 01/10; Park View 2 até 20/10; Reserva das Aroeiras sem métricas.
- Integrações: 3 tokens Meta Ads expirados, 1 integração Meta Ads em erro e 1 Meta Ads conectada; não é possível homologar ingestão de todas as contas.
- Alertas Supabase Security Advisor: proteção contra senhas vazadas desativada; pg_net em public; RLS sem políticas em integration_ingest_keys (verificar intencionalidade).

## Matriz de aceite e pendências
| Área | Evidência | Situação |
| --- | --- | --- |
| Deploy e rotas | Vercel build READY | Validado tecnicamente |
| Tipagem e testes unitários | npm run test && npm run typecheck no prebuild | Validado tecnicamente |
| Exatidão básica KPI | testes CPL, CTR, nulos, denominador zero | Validado em testes |
| Isolamento sem sessão | RLS consultado sem identidade | Validado caso negativo |
| Isolamento entre clientes reais | usuários distintos e tentativas cruzadas | Pendente |
| Visão Geral 2.0 | compilação da rota dinâmica | Pendente inspeção gráfica e interação autenticada |
| Meta Ads — campanhas / público | interface existente; dados históricos | Pendente comparação com Meta atual |
| Google Ads | sem ingestão homologada | Bloqueado |
| Google Analytics 4 | sem fonte de comportamento homologada | Bloqueado |
| Funil, criativos, relatórios | páginas compiladas | Pendente QA autenticado |
| Compartilhamento e convites | páginas compiladas | Pendente teste de destinatário e revogação |
| Gestão de usuários | interface compilada | Pendente testar perfis e convite real |
| Integrações e jobs | tabelas e scheduler existentes | Parcial, tokens expirados |
| Exportação CSV/PDF | código implementado | Pendente validação browser |
| Mobile, tablet, TV | CSS responsivo definido | Pendente verificação visual |
| Senhas e segurança operacional | advisor encontrou avisos | Pendente remediação |
| Carga, disponibilidade e recuperação | sem evidência de testes | Pendente |

## Critérios para declarar homologação integral
1. Abrir cada rota com super admin, client_admin, editor e viewer; capturar screenshots em 1440x900, 1024x768 e 390x844.
2. Garantir que viewer não veja área administrativa nem consiga editar APIs; validar tentativas de acesso de cliente A a B.
3. Comparar por amostragem Meta Ads, Google Ads e GA4 com métricas das plataformas no mesmo período, fuso, conta, moeda e modelo de atribuição.
4. Forçar credencial inválida em ambiente de testes: erro visível apenas em Integrações, sem exposição de segredo; restaurar e validar backfill.
5. Testar convite, criação de senha, revogação, link compartilhado e expiração de sessão.
6. Confirmar exportação e impressão corretas, estados vazios, seletores de métricas e comparação temporal.
7. Executar verificação de vulnerabilidades, proteção de senhas, backups, alertas e recuperação.
8. Medir p95 de carregamento, erros de APIs e atualização por cliente; estabelecer metas e monitorar.

Não usar esta matriz para afirmar que fluxos pendentes foram homologados. Nenhuma credencial foi modificada neste trabalho.
