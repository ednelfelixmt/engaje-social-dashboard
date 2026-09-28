export const funnelMetricGroups = [
  {id:'awareness',label:'Reconhecimento e entrega'},
  {id:'consideration',label:'Interesse e consideração'},
  {id:'lead',label:'Captação de leads'},
  {id:'sales',label:'Qualificação e vendas'},
  {id:'commerce',label:'E-commerce'},
  {id:'local',label:'Negócio local e aplicativos'},
] as const;

export type FunnelDataKey='impressions'|'clicks'|'pageViews'|'leads'|'registrationLeads'|'messageLeads'|'checkouts'|'purchases';

export const funnelMetricDefinitions = [
  {key:'impressions',label:'Impressões',costLabel:'CPM',group:'awareness',dataKey:'impressions',costMultiplier:1000},
  {key:'video_views',label:'Visualizações de vídeo',costLabel:'CPV',group:'awareness'},
  {key:'engagements',label:'Engajamentos',costLabel:'CPE',group:'awareness'},
  {key:'clicks',label:'Cliques',costLabel:'CPC',group:'consideration',dataKey:'clicks'},
  {key:'page_views',label:'Visitas à página',costLabel:'CPV',group:'consideration',dataKey:'pageViews'},
  {key:'content_views',label:'Visualizações de conteúdo',costLabel:'CPVC',group:'consideration'},
  {key:'form_starts',label:'Formulários iniciados',costLabel:'CPFI',group:'lead'},
  {key:'leads',label:'Todos os leads',costLabel:'CPL',group:'lead',dataKey:'leads'},
  {key:'registration_leads',label:'Cadastros e formulários',costLabel:'CPCad',group:'lead',dataKey:'registrationLeads'},
  {key:'message_leads',label:'Conversas iniciadas',costLabel:'CPMsg',group:'lead',dataKey:'messageLeads'},
  {key:'phone_calls',label:'Ligações',costLabel:'CPLig',group:'lead'},
  {key:'qualified_leads',label:'Leads qualificados',costLabel:'CPQL',group:'sales'},
  {key:'mql',label:'MQL',costLabel:'CPMQL',group:'sales'},
  {key:'sql',label:'SQL',costLabel:'CPSQL',group:'sales'},
  {key:'opportunities',label:'Oportunidades',costLabel:'CPOp',group:'sales'},
  {key:'meetings',label:'Reuniões e agendamentos',costLabel:'CPAgen',group:'sales'},
  {key:'proposals',label:'Propostas enviadas',costLabel:'CPP',group:'sales'},
  {key:'add_to_cart',label:'Adições ao carrinho',costLabel:'CPAC',group:'commerce'},
  {key:'checkouts',label:'Checkouts iniciados',costLabel:'CPCO',group:'commerce',dataKey:'checkouts'},
  {key:'purchases',label:'Compras e vendas',costLabel:'CPA',group:'commerce',dataKey:'purchases'},
  {key:'repeat_purchases',label:'Recompras',costLabel:'CPR',group:'commerce'},
  {key:'store_visits',label:'Visitas à loja',costLabel:'CPVL',group:'local'},
  {key:'directions',label:'Rotas solicitadas',costLabel:'CPRota',group:'local'},
  {key:'app_installs',label:'Instalações do aplicativo',costLabel:'CPI',group:'local'},
  {key:'subscriptions',label:'Assinaturas',costLabel:'CPAss',group:'local'},
] as const satisfies ReadonlyArray<{key:string;label:string;costLabel:string;group:string;dataKey?:FunnelDataKey;costMultiplier?:number}>;

export type FunnelMetricKey=typeof funnelMetricDefinitions[number]['key'];
export type FunnelStepConfig={metric:FunnelMetricKey;label:string};
export type FunnelModel='lead_generation'|'messages'|'ecommerce'|'local_business'|'inside_sales'|'appointments'|'custom';

export const funnelPresets:{id:FunnelModel;label:string;description:string;steps:FunnelStepConfig[]}[]=[
  {id:'lead_generation',label:'Geração de leads',description:'Serviços, educação, saúde, imóveis e B2B.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'registration_leads',label:'Cadastros'}]},
  {id:'messages',label:'Conversas e WhatsApp',description:'Campanhas cujo resultado principal é uma conversa.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'message_leads',label:'Conversas iniciadas'}]},
  {id:'ecommerce',label:'E-commerce',description:'Da descoberta até a compra confirmada.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'content_views',label:'Produtos visualizados'},{metric:'add_to_cart',label:'Carrinhos'},{metric:'checkouts',label:'Checkouts'},{metric:'purchases',label:'Compras'}]},
  {id:'local_business',label:'Negócio local',description:'Visibilidade, contato, rota e visita ao estabelecimento.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Interações'},{metric:'message_leads',label:'Contatos'},{metric:'directions',label:'Rotas'},{metric:'store_visits',label:'Visitas à loja'}]},
  {id:'inside_sales',label:'Inside Sales',description:'Aquisição, qualificação, oportunidade, proposta e venda.',steps:[{metric:'leads',label:'Leads'},{metric:'qualified_leads',label:'Leads qualificados'},{metric:'mql',label:'MQL'},{metric:'sql',label:'SQL'},{metric:'opportunities',label:'Oportunidades'},{metric:'meetings',label:'Reuniões'},{metric:'proposals',label:'Propostas'},{metric:'purchases',label:'Vendas'}]},
  {id:'appointments',label:'Agendamentos',description:'Clínicas, consultorias, serviços e atendimento comercial.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'leads',label:'Leads'},{metric:'qualified_leads',label:'Qualificados'},{metric:'meetings',label:'Agendamentos'}]},
  {id:'custom',label:'Personalizado',description:'Escolha qualquer etapa, renomeie e ordene a jornada.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'leads',label:'Leads'}]},
];

export function parseFunnelSteps(value:unknown):FunnelStepConfig[]{
  if(!Array.isArray(value))return funnelPresets[0].steps;
  const allowed=new Set(funnelMetricDefinitions.map((item)=>item.key));
  const parsed=value.flatMap((item)=>{if(!item||typeof item!=='object'||Array.isArray(item))return [];const row=item as Record<string,unknown>;const metric=String(row.metric||'') as FunnelMetricKey;const label=String(row.label||'').trim();return allowed.has(metric)&&label.length>=1&&label.length<=40?[{metric,label}]:[];});
  return parsed.length>=2&&parsed.length<=12&&new Set(parsed.map((item)=>item.metric)).size===parsed.length?parsed:funnelPresets[0].steps;
}
