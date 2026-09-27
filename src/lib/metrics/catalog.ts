export const dashboardMetricGroups = [
  {id:'results',title:'Investimento e resultado',description:'Custos, receita, retorno e conversões comerciais.',metrics:[
    {key:'spend',label:'Investimento',description:'Custo total de mídia.',scopes:['paid'],platforms:['Meta','Google','TikTok'],availability:'current'},
    {key:'revenue',label:'Receita',description:'Receita atribuída ou conciliada.',scopes:['paid','sales'],platforms:['Plataformas','CRM'],availability:'current'},
    {key:'conversion_value',label:'Valor de conversão',description:'Valor atribuído às conversões pela plataforma.',scopes:['paid'],platforms:['Google','Meta','TikTok'],availability:'source'},
    {key:'profit',label:'Lucro atribuído',description:'Receita menos investimento de mídia.',scopes:['paid','sales'],platforms:['Calculada'],availability:'source'},
    {key:'roas',label:'ROAS',description:'Receita dividida pelo investimento.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'roi',label:'ROI',description:'Retorno líquido percentual sobre o investimento.',scopes:['paid','sales'],platforms:['Calculada'],availability:'current'},
    {key:'purchases',label:'Compras',description:'Compras ou conversões de venda.',scopes:['paid','sales'],platforms:['Meta','Google','TikTok','CRM'],availability:'current'},
    {key:'cpa',label:'CPA / custo por compra',description:'Investimento dividido pelas compras.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'conversion_rate',label:'Taxa de conversão',description:'Compras divididas pelos cliques.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'cost_per_conversion',label:'Custo por conversão',description:'Custo médio por conversão configurada.',scopes:['paid'],platforms:['Google','Meta','TikTok'],availability:'source'},
  ]},
  {id:'delivery',title:'Entrega e tráfego',description:'Distribuição, alcance, frequência e navegação.',metrics:[
    {key:'impressions',label:'Impressões',description:'Quantidade de exibições.',scopes:['paid','organic'],platforms:['Todas'],availability:'current'},
    {key:'reach',label:'Alcance',description:'Pessoas ou contas únicas alcançadas.',scopes:['paid','organic'],platforms:['Meta','TikTok'],availability:'current'},
    {key:'frequency',label:'Frequência',description:'Média de impressões por pessoa alcançada.',scopes:['paid'],platforms:['Meta','TikTok'],availability:'source'},
    {key:'cpm',label:'CPM',description:'Custo por mil impressões.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'clicks',label:'Cliques',description:'Cliques informados pela plataforma.',scopes:['paid','organic'],platforms:['Todas'],availability:'current'},
    {key:'link_clicks',label:'Cliques no link',description:'Cliques que direcionam para um destino.',scopes:['paid','organic'],platforms:['Meta','TikTok'],availability:'source'},
    {key:'outbound_clicks',label:'Cliques de saída',description:'Cliques que levam para fora da plataforma.',scopes:['paid','organic'],platforms:['Meta','TikTok'],availability:'source'},
    {key:'unique_clicks',label:'Cliques únicos',description:'Pessoas únicas que clicaram.',scopes:['paid'],platforms:['Meta'],availability:'source'},
    {key:'ctr',label:'CTR',description:'Cliques divididos pelas impressões.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'unique_ctr',label:'CTR único',description:'Cliques únicos divididos pelo alcance.',scopes:['paid'],platforms:['Meta'],availability:'source'},
    {key:'cpc',label:'CPC',description:'Investimento dividido pelos cliques.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'page_views',label:'Visitas à página',description:'Visualizações da página de destino.',scopes:['paid','organic'],platforms:['Meta','Orgânico'],availability:'current'},
    {key:'cost_per_page_view',label:'Custo por visita',description:'Investimento dividido pelas visitas.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
  ]},
  {id:'video',title:'Vídeo e atenção',description:'Consumo de vídeo e profundidade de visualização.',metrics:[
    {key:'video_views',label:'Visualizações de vídeo',description:'Reproduções informadas pela plataforma.',scopes:['paid','organic'],platforms:['Meta','TikTok','YouTube'],availability:'current'},
    {key:'video_2s_views',label:'Visualizações de 2 segundos',description:'Vídeos assistidos por pelo menos 2 segundos.',scopes:['paid','organic'],platforms:['TikTok'],availability:'source'},
    {key:'video_3s_views',label:'Visualizações de 3 segundos',description:'Vídeos assistidos por pelo menos 3 segundos.',scopes:['paid','organic'],platforms:['Meta'],availability:'source'},
    {key:'video_6s_views',label:'Visualizações de 6 segundos',description:'Vídeos assistidos por pelo menos 6 segundos.',scopes:['paid','organic'],platforms:['TikTok'],availability:'source'},
    {key:'thruplays',label:'ThruPlays',description:'Vídeos vistos por 15 segundos ou até o fim.',scopes:['paid'],platforms:['Meta'],availability:'source'},
    {key:'video_25',label:'Vídeo assistido 25%',description:'Reproduções que chegaram a 25%.',scopes:['paid','organic'],platforms:['Meta','TikTok','YouTube'],availability:'source'},
    {key:'video_50',label:'Vídeo assistido 50%',description:'Reproduções que chegaram a 50%.',scopes:['paid','organic'],platforms:['Meta','TikTok','YouTube'],availability:'source'},
    {key:'video_75',label:'Vídeo assistido 75%',description:'Reproduções que chegaram a 75%.',scopes:['paid','organic'],platforms:['Meta','TikTok','YouTube'],availability:'source'},
    {key:'video_95',label:'Vídeo assistido 95%',description:'Reproduções que chegaram a 95%.',scopes:['paid','organic'],platforms:['Meta','TikTok'],availability:'source'},
    {key:'video_100',label:'Vídeo concluído',description:'Reproduções completas.',scopes:['paid','organic'],platforms:['Meta','TikTok','YouTube'],availability:'source'},
    {key:'cost_per_thruplay',label:'Custo por ThruPlay',description:'Investimento dividido pelos ThruPlays.',scopes:['paid'],platforms:['Meta'],availability:'source'},
  ]},
  {id:'leads',title:'Leads e contatos',description:'Captação, formulários, mensagens e ligações.',metrics:[
    {key:'leads',label:'Todos os leads',description:'Cadastros mais conversas iniciadas.',scopes:['paid','sales'],platforms:['Meta','Google','TikTok','CRM'],availability:'current'},
    {key:'registration_leads',label:'Cadastros de formulário/site',description:'Formulários instantâneos e cadastros no site.',scopes:['paid','sales'],platforms:['Meta','Google','TikTok'],availability:'current'},
    {key:'message_leads',label:'Mensagens iniciadas',description:'Conversas em WhatsApp, Messenger ou Instagram.',scopes:['paid','sales'],platforms:['Meta'],availability:'current'},
    {key:'phone_calls',label:'Ligações',description:'Chamadas geradas pelos anúncios ou perfil.',scopes:['paid','organic','sales'],platforms:['Google','Meta Business'],availability:'source'},
    {key:'form_starts',label:'Formulários iniciados',description:'Pessoas que começaram um formulário.',scopes:['paid'],platforms:['Meta','Google','TikTok'],availability:'source'},
    {key:'form_completions',label:'Formulários concluídos',description:'Formulários enviados com sucesso.',scopes:['paid','sales'],platforms:['Meta','Google','TikTok'],availability:'source'},
    {key:'cpl',label:'CPL',description:'Investimento dividido por todos os leads.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'cost_per_registration',label:'Custo por cadastro',description:'Investimento dividido pelos cadastros.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'cost_per_message',label:'Custo por mensagem',description:'Investimento dividido pelas conversas.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'cost_per_call',label:'Custo por ligação',description:'Investimento dividido pelas ligações.',scopes:['paid'],platforms:['Calculada'],availability:'source'},
  ]},
  {id:'commerce',title:'E-commerce e recorrência',description:'Jornada do produto, carrinho, checkout e assinatura.',metrics:[
    {key:'content_views',label:'Visualizações de conteúdo',description:'Visualizações de produto ou conteúdo-chave.',scopes:['paid'],platforms:['Meta','TikTok'],availability:'source'},
    {key:'add_to_cart',label:'Adições ao carrinho',description:'Produtos adicionados ao carrinho.',scopes:['paid'],platforms:['Meta','Google','TikTok'],availability:'source'},
    {key:'cost_per_add_to_cart',label:'Custo por carrinho',description:'Investimento dividido pelas adições ao carrinho.',scopes:['paid'],platforms:['Calculada'],availability:'source'},
    {key:'checkouts',label:'Checkouts iniciados',description:'Inícios de checkout.',scopes:['paid'],platforms:['Meta','Google','TikTok'],availability:'current'},
    {key:'cost_per_checkout',label:'Custo por checkout',description:'Investimento dividido pelos checkouts.',scopes:['paid'],platforms:['Calculada'],availability:'current'},
    {key:'catalog_sales',label:'Vendas do catálogo',description:'Compras atribuídas a anúncios de catálogo.',scopes:['paid'],platforms:['Meta','TikTok'],availability:'source'},
    {key:'subscriptions',label:'Assinaturas',description:'Novas assinaturas atribuídas.',scopes:['paid','sales'],platforms:['Meta','Google','TikTok','CRM'],availability:'source'},
    {key:'cost_per_subscription',label:'Custo por assinatura',description:'Investimento dividido pelas assinaturas.',scopes:['paid'],platforms:['Calculada'],availability:'source'},
  ]},
  {id:'organic',title:'Conteúdo e comunidade',description:'Interação, audiência e ações nos perfis orgânicos.',metrics:[
    {key:'interactions',label:'Interações',description:'Curtidas, comentários, compartilhamentos e salvamentos.',scopes:['organic'],platforms:['Meta','TikTok','YouTube'],availability:'current'},
    {key:'engagement_rate',label:'Taxa de interação',description:'Interações divididas pelo alcance.',scopes:['organic'],platforms:['Calculada'],availability:'current'},
    {key:'likes',label:'Curtidas e reações',description:'Curtidas ou reações recebidas.',scopes:['organic'],platforms:['Meta','TikTok','YouTube'],availability:'current'},
    {key:'comments',label:'Comentários',description:'Comentários recebidos.',scopes:['organic'],platforms:['Meta','TikTok','YouTube'],availability:'current'},
    {key:'shares',label:'Compartilhamentos',description:'Compartilhamentos registrados.',scopes:['organic'],platforms:['Meta','TikTok','YouTube'],availability:'current'},
    {key:'saves',label:'Salvamentos',description:'Conteúdos salvos.',scopes:['organic'],platforms:['Instagram','TikTok'],availability:'current'},
    {key:'followers',label:'Seguidores',description:'Total de seguidores da conta.',scopes:['organic'],platforms:['Meta','TikTok','YouTube'],availability:'source'},
    {key:'follower_growth',label:'Crescimento de seguidores',description:'Novos seguidores líquidos no período.',scopes:['organic'],platforms:['Meta','TikTok','YouTube'],availability:'source'},
    {key:'profile_views',label:'Visualizações do perfil',description:'Quantidade de visualizações do perfil.',scopes:['organic'],platforms:['Instagram','TikTok'],availability:'source'},
    {key:'profile_visits',label:'Visitas ao perfil',description:'Pessoas que visitaram o perfil.',scopes:['organic'],platforms:['Instagram','TikTok'],availability:'source'},
    {key:'website_clicks',label:'Cliques no site',description:'Cliques no link do perfil ou ficha local.',scopes:['organic'],platforms:['Meta','TikTok','Google Business'],availability:'source'},
  ]},
  {id:'google',title:'Google Ads e pesquisa',description:'Conversões e presença nos resultados de busca.',metrics:[
    {key:'conversions',label:'Conversões',description:'Conversões principais configuradas no Google Ads.',scopes:['paid'],platforms:['Google'],availability:'source'},
    {key:'all_conversions',label:'Todas as conversões',description:'Conversões principais e secundárias.',scopes:['paid'],platforms:['Google'],availability:'source'},
    {key:'view_through_conversions',label:'Conversões de visualização',description:'Conversões após visualização sem clique.',scopes:['paid'],platforms:['Google','Meta'],availability:'source'},
    {key:'search_impression_share',label:'Parcela de impressões',description:'Percentual das impressões elegíveis obtidas.',scopes:['paid'],platforms:['Google'],availability:'source'},
    {key:'search_top_impression_share',label:'Parcela no topo',description:'Participação de impressões no topo da página.',scopes:['paid'],platforms:['Google'],availability:'source'},
    {key:'search_absolute_top_impression_share',label:'Parcela no topo absoluto',description:'Participação na primeira posição dos anúncios.',scopes:['paid'],platforms:['Google'],availability:'source'},
    {key:'quality_score',label:'Índice de qualidade',description:'Qualidade estimada de palavras-chave e anúncios.',scopes:['paid'],platforms:['Google'],availability:'source'},
  ]},
  {id:'sales',title:'CRM e vendas',description:'Qualificação, pipeline e fechamento comercial.',metrics:[
    {key:'qualified_leads',label:'Leads qualificados',description:'Leads aprovados pelos critérios comerciais.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'mql',label:'MQL',description:'Leads qualificados pelo marketing.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'sql',label:'SQL',description:'Leads aceitos e qualificados por vendas.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'opportunities',label:'Oportunidades',description:'Negócios abertos no pipeline.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'meetings',label:'Reuniões e agendamentos',description:'Reuniões ou atendimentos realizados.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'proposals',label:'Propostas enviadas',description:'Propostas comerciais apresentadas.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'sales',label:'Vendas fechadas',description:'Negócios ganhos e conciliados.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'lost_sales',label:'Negócios perdidos',description:'Oportunidades encerradas como perdidas.',scopes:['sales'],platforms:['CRM'],availability:'source'},
    {key:'close_rate',label:'Taxa de fechamento',description:'Vendas divididas pelas oportunidades.',scopes:['sales'],platforms:['Calculada'],availability:'source'},
  ]},
] as const;

type DashboardMetricDefinition = typeof dashboardMetricGroups[number]['metrics'][number];
export type DashboardMetricKey = DashboardMetricDefinition['key'];
export type DashboardMetricScope = DashboardMetricDefinition['scopes'][number];
const allDashboardMetrics = dashboardMetricGroups.reduce<DashboardMetricDefinition[]>((metrics,group)=>{
  metrics.push(...(group.metrics as unknown as readonly DashboardMetricDefinition[]));return metrics;
},[]);
export const dashboardMetricKeys:DashboardMetricKey[] = allDashboardMetrics.map((metric)=>metric.key);

export const dashboardMetricLabels = Object.fromEntries(dashboardMetricGroups.flatMap((group) => group.metrics.map((metric) => [metric.key, metric.label]))) as Record<DashboardMetricKey,string>;
export const paidMetricKeys = allDashboardMetrics.filter((metric)=>metric.scopes.includes('paid' as never)).map((metric)=>metric.key);
export const organicMetricKeys = allDashboardMetrics.filter((metric)=>metric.scopes.includes('organic' as never)).map((metric)=>metric.key);
