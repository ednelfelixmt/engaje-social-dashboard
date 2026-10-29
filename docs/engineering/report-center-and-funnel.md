# Central de relatórios e funil de mídia paga

## Entrega funcional

A central privada em `/[organizationSlug]/reports` reúne oito análises existentes e o novo funil, conforme `enabled_pages`. Não comprova conexão, coleta ou homologação de fornecedores. GA4 aparece em preparação, sem métricas substitutas. O menu passa a oferecer a central e o relatório de funil.

O relatório em `/[organizationSlug]/reports/funnel` usa as etapas já configuradas pela agência. Clientes podem consultar, filtrar, baixar CSV e imprimir/salvar PDF localmente. Administração continua nas rotas existentes, exclusivas da agência. Não há endpoint de escrita, schema novo ou alteração em RLS/Auth/Storage/Edge/OAuth.

## Cálculos e dados

- Fonte exclusiva: fatos diários recebidos em `metrics_ads`. Datas, moeda, tenant, provedor e grão são validados pelo relatório executivo existente antes de qualquer agregação.
- A projeção existente de campanhas e o resumo de métricas do funil calculam valores e custos. CPM usa investimento/impressoes × 1000; os demais custos usam investimento/resultado. Zero observado continua zero; ausência, cobertura incompleta e divisão por zero ficam indisponíveis.
- Alcance não se soma entre campanhas ou dias sem deduplicação na origem. Leads/compras são atribuições das plataformas, sem deduplicação de pessoas ou inferência de vendas financeiras.
- Etapas são indicadores independentes. Não há taxa de passagem de pessoas, perda causal, ROI ou CRM fabricado. Referências de metas não têm atingimento calculado sem vigência validada.
- Comparativos têm suas datas e origens separadas, sem variações percentuais que presumam atribuição equivalente. A opção sem comparação não lê o período anterior.
- Filtro de plataforma admite apenas Meta/Google/TikTok ou todas. Um erro de consulta/escopo não produz totais parciais ou arquivos, nem expõe detalhes do backend.

## Navegação e exportação

Links da central mantêm somente datas, moeda e modo de comparação compatível. Relatórios de público, metas, orgânicos e metodologia recebem `compare=none`, conforme o contrato real dessas páginas. Conta/campanha e parâmetros desconhecidos não seguem para outro relatório. Cada página reaplica sua autorização e configuração.

CSV deriva dos mesmos valores autorizados, inclui cobertura, períodos, custos, referências e atribuição. Usa o serializador compartilhado contra fórmulas de planilha; não inclui IDs de registros. Cada etapa/período tem uma linha; etapas não devem ser somadas. Impressão usa o fluxo local existente do navegador. Aceite visual de PDF multipágina continua pendente.

## Evidências locais de 29/10/2026

- 835 testes passaram; regressões novas cobrem domínio, integridade, CSV, UI, rotas e menu.
- 140 verificações SQL no banco descartável passaram; TypeScript, Edge Auth, arquitetura e lint passaram.
- Build Next passou. A primeira tentativa local teve EPERM ao criar pasta temporária de prerender; a pasta dentro do workspace foi criada e a repetição concluiu.
- Aceite HTTP do build: 24 casos autenticados com as duas contas sintéticas existentes, incluindo central/funil próprios 200, tenant oposto 404 e administração negada; 18 casos anônimos passaram. Não houve mutação de dados de clientes nem redefinição de credenciais.
- Navegador: componentes reais em demonstração isolada, valores sintéticos explicitamente identificados; central → funil, recorte Google, comparação desativada, CSV baixado e largura 390 px sem transbordamento (conteúdo 375 px). Essa demonstração não comprova navegação visual autenticada em produção.
- Claude Code foi consultado sobre proposta e revisão. O CLI retornou 401 de sessão expirada; nenhuma revisão conjunta foi presumida. A revisão e validação efetivas deste ciclo são do Codex.

Os recibos locais ficam fora do repositório em `outputs/report-center-funnel-20261029`, sem credenciais. Quality Gate/Vercel devem aprovar o mesmo head do PR antes de merge; CI e produção precisam de confirmação separada após integração.

## Próximas dependências para entrega final

1. P0: concluir SEC-010/011, RPC/Storage e expiração/revogação de sessão; reconciliar histórico de migrações (#211) com plano revisado, sem reset ou migrações fictícias.
2. P1: homologar ingestão/OAuth dos provedores reais e GA4 com fontes autorizadas. Sem credenciais/contas aprovadas, o estado permanece pendente.
3. P1: homologar navegação visual autenticada de agência e clientes, PDF multipágina, compartilhamento/TV e recuperação de acesso ponta a ponta.
4. P2: SMTP personalizado permanece adiado por decisão do usuário; tratar separadamente antes do aceite operacional dos e-mails.

O marco de relatórios é 04/12/2026 e o aceite final 18/12/2026. Esta entrega reduz pendências funcionais; não representa conclusão ou homologação de toda a plataforma.
