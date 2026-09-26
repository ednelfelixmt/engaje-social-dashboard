export const funnelMetricDefinitions = [
  {key:'impressions',label:'Impressões',costLabel:'CPM'},
  {key:'clicks',label:'Cliques',costLabel:'CPC'},
  {key:'page_views',label:'Visitas',costLabel:'CPV'},
  {key:'leads',label:'Leads',costLabel:'CPL'},
  {key:'registration_leads',label:'Cadastros',costLabel:'CPCad'},
  {key:'message_leads',label:'Mensagens',costLabel:'CPMsg'},
  {key:'checkouts',label:'Checkouts',costLabel:'CPCO'},
  {key:'purchases',label:'Compras',costLabel:'CPA'},
] as const;

export type FunnelMetricKey=typeof funnelMetricDefinitions[number]['key'];
export type FunnelStepConfig={metric:FunnelMetricKey;label:string};
export type FunnelModel='lead_generation'|'messages'|'ecommerce'|'local_business'|'custom';

export const funnelPresets:{id:FunnelModel;label:string;description:string;steps:FunnelStepConfig[]}[]=[
  {id:'lead_generation',label:'Geração de leads',description:'Serviços, educação, saúde, imóveis e B2B.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'leads',label:'Leads'}]},
  {id:'messages',label:'Conversas e WhatsApp',description:'Campanhas cujo resultado principal é uma conversa.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'message_leads',label:'Conversas iniciadas'}]},
  {id:'ecommerce',label:'E-commerce',description:'Da descoberta até a compra confirmada.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'checkouts',label:'Checkouts'},{metric:'purchases',label:'Compras'}]},
  {id:'local_business',label:'Negócio local',description:'Visibilidade, visita digital e contato direto.',steps:[{metric:'impressions',label:'Alcance de mídia'},{metric:'clicks',label:'Interações'},{metric:'page_views',label:'Visitas'},{metric:'message_leads',label:'Contatos'}]},
  {id:'custom',label:'Personalizado',description:'Escolha, renomeie e ordene as etapas.',steps:[{metric:'impressions',label:'Impressões'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'leads',label:'Leads'}]},
];

export function parseFunnelSteps(value:unknown):FunnelStepConfig[]{
  if(!Array.isArray(value))return funnelPresets[0].steps;
  const allowed=new Set(funnelMetricDefinitions.map((item)=>item.key));
  const parsed=value.flatMap((item)=>{if(!item||typeof item!=='object'||Array.isArray(item))return [];const row=item as Record<string,unknown>;const metric=String(row.metric||'') as FunnelMetricKey;const label=String(row.label||'').trim();return allowed.has(metric)&&label.length>=1&&label.length<=40?[{metric,label}]:[];});
  return parsed.length>=2&&parsed.length<=8&&new Set(parsed.map((item)=>item.metric)).size===parsed.length?parsed:funnelPresets[0].steps;
}
