export const dashboardMetricGroups = [
  {
    title: 'Investimento e resultado',
    description: 'Custos, receita e eficiência comercial.',
    metrics: [
      {key: 'spend', label: 'Investimento', description: 'Custo total de mídia.'},
      {key: 'revenue', label: 'Receita', description: 'Receita atribuída ou conciliada.'},
      {key: 'roas', label: 'ROAS', description: 'Receita dividida pelo investimento.'},
      {key: 'roi', label: 'ROI', description: 'Retorno líquido percentual sobre o investimento.'},
      {key: 'purchases', label: 'Compras', description: 'Compras ou conversões de venda.'},
      {key: 'cpa', label: 'CPA / custo por compra', description: 'Investimento dividido pelas compras.'},
      {key: 'conversion_rate', label: 'Taxa de conversão', description: 'Compras divididas pelos cliques.'},
      {key: 'checkouts', label: 'Checkouts', description: 'Inícios de checkout.'},
      {key: 'cost_per_checkout', label: 'Custo por checkout', description: 'Investimento dividido pelos checkouts.'},
    ],
  },
  {
    title: 'Entrega e tráfego pago',
    description: 'Distribuição, alcance do anúncio e navegação.',
    metrics: [
      {key: 'impressions', label: 'Impressões', description: 'Quantidade de exibições.'},
      {key: 'cpm', label: 'CPM', description: 'Custo por mil impressões.'},
      {key: 'clicks', label: 'Cliques', description: 'Cliques informados pela plataforma.'},
      {key: 'ctr', label: 'CTR', description: 'Cliques divididos pelas impressões.'},
      {key: 'cpc', label: 'CPC', description: 'Investimento dividido pelos cliques.'},
      {key: 'page_views', label: 'Visitas à página', description: 'Visualizações da página de destino.'},
      {key: 'cost_per_page_view', label: 'Custo por visita', description: 'Investimento dividido pelas visitas.'},
    ],
  },
  {
    title: 'Leads e contatos',
    description: 'Demanda total separada pela origem da conversão.',
    metrics: [
      {key: 'leads', label: 'Todos os leads', description: 'Cadastros mais conversas iniciadas.'},
      {key: 'registration_leads', label: 'Cadastros de formulário/site', description: 'Formulários instantâneos e conversões de cadastro no site.'},
      {key: 'message_leads', label: 'Mensagens iniciadas', description: 'Conversas iniciadas em WhatsApp, Messenger ou Instagram.'},
      {key: 'cpl', label: 'CPL', description: 'Investimento dividido por todos os leads.'},
      {key: 'cost_per_registration', label: 'Custo por cadastro', description: 'Investimento dividido pelos cadastros.'},
      {key: 'cost_per_message', label: 'Custo por mensagem', description: 'Investimento dividido pelas conversas iniciadas.'},
    ],
  },
  {
    title: 'Conteúdo orgânico',
    description: 'Consumo e interação com publicações e vídeos.',
    metrics: [
      {key: 'reach', label: 'Alcance', description: 'Pessoas ou contas alcançadas.'},
      {key: 'interactions', label: 'Interações', description: 'Curtidas, comentários, compartilhamentos e salvamentos.'},
      {key: 'engagement_rate', label: 'Taxa de interação', description: 'Interações divididas pelo alcance.'},
      {key: 'likes', label: 'Curtidas', description: 'Curtidas ou reações.'},
      {key: 'comments', label: 'Comentários', description: 'Comentários recebidos.'},
      {key: 'shares', label: 'Compartilhamentos', description: 'Compartilhamentos registrados.'},
      {key: 'saves', label: 'Salvamentos', description: 'Conteúdos salvos.'},
      {key: 'video_views', label: 'Visualizações de vídeo', description: 'Reproduções informadas pela plataforma.'},
    ],
  },
] as const;

export const dashboardMetricKeys = dashboardMetricGroups.flatMap((group) => group.metrics.map((metric) => metric.key));
export type DashboardMetricKey = typeof dashboardMetricKeys[number];

export const dashboardMetricLabels = Object.fromEntries(
  dashboardMetricGroups.flatMap((group) => group.metrics.map((metric) => [metric.key, metric.label])),
) as Record<DashboardMetricKey, string>;

export const paidMetricKeys = dashboardMetricKeys.filter((key) => !['reach','interactions','engagement_rate','likes','comments','shares','saves','video_views'].includes(key));
export const organicMetricKeys = dashboardMetricKeys.filter((key) => !['spend','revenue','roas','roi','purchases','cpa','conversion_rate','checkouts','cost_per_checkout','cpm','ctr','cpc','cost_per_page_view','leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message'].includes(key));
