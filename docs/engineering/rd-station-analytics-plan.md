# RD Station Marketing e CRM — escopo confirmado

O usuário confirmou em 29/10/2026 que usa os dois produtos. A Análise 360 fornece apresentação de agregados CRM existentes e informa a ausência do pipeline real. O conector rd_station permanece foundation; esta entrega não o promove a integrado/homologado.

## Contratos oficiais consultados

- [Autenticação CRM v2](https://developers.rdstation.com/reference/crm-v2-authentication): credenciais/tokens próprios por produto; não reutilizar Marketing no CRM. Tokens CRM de duas horas e renovação com rotação de refresh token exigem persistência atômica no servidor.
- [CRM v2](https://developers.rdstation.com/reference/crm-v2-introduction) e [pipelines](https://developers.rdstation.com/reference/crm-v2-list-pipelines): base https://api.rd.services/crm/v2/, pipelines/etapas/negócios como fontes de leitura.
- [Marketing](https://developers.rdstation.com/reference/introducao-rdsm): consultas via OAuth2. API Key para enviar conversões não substitui consentimento de leitura para analytics.
- [Conversões Marketing](https://developers.rdstation.com/reference/get_platform-analytics-conversions): Pro/Advanced, janela histórica Pro de 45 dias e atualização até 24 horas; confirmar plano e cobertura da conta.
- [Funil Marketing](https://developers.rdstation.com/reference/get_platform-analytics-funnel): Advanced, filtros start_date/end_date/grouped_by. Não fabricar essa fonte quando plano não disponibilizar.

## Ordem de implementação e aceite

1. Reconciliar histórico de migrações (#211) antes de schema/ingestão. Definir conexão separada por tenant/produto/conta com credenciais distintas, consentimento da agência e armazenamento privado de tokens. O enum rd_station atual sozinho não representa as duas conexões.
2. OAuth exclusivo de administradores autorizados; state assinado de uso único e tenant vinculado antes da sincronização. Validar callback, expiração, revogação e refresh atômico sem exposição de tokens a viewers/logs.
3. CRM: modelos de pipelines, etapas, negócios, movimentos, responsáveis por ID, ganhos/perdas/motivos e datas. Identidades estáveis, paginação integral, idempotência, cobertura, moeda/timezone e RLS. Snapshot atual e coorte histórica devem ter semânticas diferentes e auditáveis. Agregados existentes metrics_crm não contêm esse histórico.
4. Marketing: leitura de conversões/funil apenas conforme plano e autorização; freshness/limites/erros explícitos. Não adicionar gravações de conversão ou pixels para cumprir uma solicitação de analytics.
5. Comparações atuais/anteriores, funis comerciais por pipeline e demografia recebida. Negócios e eventos de marketing não são somados como pessoas únicas. Atribuição entre anúncios e CRM exige vínculo verificável. Evitar nomes/e-mails de contatos nos payloads de viewers.
6. Testes unitários e integração com fontes sintéticas; Auth/RLS entre dois tenants, refresh concorrente, backfill/retries/duplicatas e credenciais revogadas. Homologar depois em contas autorizadas dos dois produtos, confirmando plano/cobertura; gates CI/Vercel e evidência de produção.

Nenhum OAuth foi autorizado, app RD criado, chave criada/revogada ou segredo alterado neste ciclo. Não considerar integração real concluída. SMTP segue adiado pelo usuário. Prazo final planejado 18/12/2026 depende dessas autorizações e homologações; sem evidência para prometer conclusão antecipada.
