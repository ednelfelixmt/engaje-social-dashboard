export const funnelMetricGroups = [
  {id:'awareness',label:'Reconhecimento e entrega'},
  {id:'consideration',label:'Interesse e consideração'},
  {id:'lead',label:'Captação de leads'},
  {id:'sales',label:'Qualificação e vendas'},
  {id:'commerce',label:'E-commerce'},
  {id:'local',label:'Negócio local e aplicativos'},
] as const;

export type FunnelDataKey='impressions'|'reach'|'clicks'|'pageViews'|'leads'|'registrationLeads'|'messageLeads'|'checkouts'|'purchases';

export const funnelMetricDefinitions = [
  {key:'impressions',label:'Impressões',costLabel:'CPM',group:'awareness',dataKey:'impressions',costMultiplier:1000},
  {key:'reach',label:'Alcance',costLabel:'Custo por pessoa alcançada',group:'awareness',dataKey:'reach'},
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
export const funnelIconKeys=['eye','users','click','globe','form','user-plus','message','phone','cart','card','bag','calendar','pin','download','star','target','handshake','receipt','play','heart','repeat','home','health','school','food','navigation'] as const;
export type FunnelIconKey=typeof funnelIconKeys[number];
export const funnelIconLabels:Record<FunnelIconKey,string>={eye:'Visibilidade',users:'Pessoas',click:'Clique',globe:'Site',form:'Formulário','user-plus':'Novo contato',message:'Conversa',phone:'Telefone',cart:'Carrinho',card:'Pagamento',bag:'Compra',calendar:'Agenda',pin:'Local',download:'Instalação',star:'Destaque',target:'Meta',handshake:'Negócio',receipt:'Proposta',play:'Vídeo',heart:'Engajamento',repeat:'Recompra',home:'Imóvel',health:'Saúde',school:'Educação',food:'Alimentação',navigation:'Rota'};
export const defaultFunnelIcons:Record<string,FunnelIconKey>={impressions:'eye',reach:'users',video_views:'play',engagements:'heart',clicks:'click',page_views:'globe',content_views:'eye',form_starts:'form',leads:'user-plus',registration_leads:'form',message_leads:'message',phone_calls:'phone',qualified_leads:'star',mql:'star',sql:'target',opportunities:'handshake',meetings:'calendar',proposals:'receipt',add_to_cart:'cart',checkouts:'card',purchases:'bag',repeat_purchases:'repeat',store_visits:'pin',directions:'navigation',app_installs:'download',subscriptions:'star'};
/** Cores padrão: do vermelho ao verde, distribuídas pelo número de etapas do funil. */
export function funnelAutoColor(index:number,count:number){
  const hue=count<=1?0:2+(index/(count-1))*126;
  const s=0.82,l=0.5;
  const a=s*Math.min(l,1-l);
  const channel=(n:number)=>{const k=(n+hue/30)%12;const value=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*value).toString(16).padStart(2,'0');};
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}
export const funnelColorPattern=/^#[0-9a-fA-F]{6}$/;
export type FunnelStepConfig={metric:FunnelMetricKey;label:string;color?:string;icon?:FunnelIconKey;target?:number|null};
export const funnelModelIds=['lead_generation','messages','ecommerce','local_business','inside_sales','appointments','real_estate','clinic','education','delivery','infoproduct','custom'] as const;
export type FunnelModel=typeof funnelModelIds[number];

export const funnelPresets:{id:FunnelModel;label:string;description:string;steps:FunnelStepConfig[]}[]=[
  {id:'lead_generation',label:'Geração de leads',description:'Serviços, educação, saúde, imóveis e B2B.',steps:[{metric:'impressions',label:'Impressões'},{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'registration_leads',label:'Cadastros'}]},
  {id:'messages',label:'Conversas e WhatsApp',description:'Campanhas cujo resultado principal é uma conversa.',steps:[{metric:'impressions',label:'Impressões'},{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Cliques'},{metric:'message_leads',label:'Conversas iniciadas'}]},
  {id:'ecommerce',label:'E-commerce',description:'Da descoberta até a compra confirmada.',steps:[{metric:'impressions',label:'Impressões'},{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'content_views',label:'Produtos visualizados'},{metric:'add_to_cart',label:'Carrinhos'},{metric:'checkouts',label:'Checkouts'},{metric:'purchases',label:'Compras'}]},
  {id:'local_business',label:'Negócio local',description:'Visibilidade, contato, rota e visita ao estabelecimento.',steps:[{metric:'impressions',label:'Impressões'},{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Interações'},{metric:'message_leads',label:'Contatos'},{metric:'directions',label:'Rotas'},{metric:'store_visits',label:'Visitas à loja'}]},
  {id:'inside_sales',label:'Inside Sales',description:'Aquisição, qualificação, oportunidade, proposta e venda.',steps:[{metric:'leads',label:'Leads'},{metric:'qualified_leads',label:'Leads qualificados'},{metric:'mql',label:'MQL'},{metric:'sql',label:'SQL'},{metric:'opportunities',label:'Oportunidades'},{metric:'meetings',label:'Reuniões'},{metric:'proposals',label:'Propostas'},{metric:'purchases',label:'Vendas'}]},
  {id:'appointments',label:'Agendamentos',description:'Clínicas, consultorias, serviços e atendimento comercial.',steps:[{metric:'impressions',label:'Impressões'},{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'leads',label:'Leads'},{metric:'qualified_leads',label:'Qualificados'},{metric:'meetings',label:'Agendamentos'}]},
  {id:'real_estate',label:'Imobiliária',description:'Do anúncio ao lead e à venda fechada, com as etapas que as integrações já fornecem.',steps:[{metric:'impressions',label:'Impressões',icon:'eye'},{metric:'clicks',label:'Cliques no anúncio',icon:'click'},{metric:'page_views',label:'Visitas ao portfólio',icon:'home'},{metric:'leads',label:'Interessados',icon:'user-plus'},{metric:'purchases',label:'Vendas fechadas',icon:'handshake'}]},
  {id:'clinic',label:'Clínica e saúde',description:'Da divulgação à conversa no WhatsApp e ao paciente fechado.',steps:[{metric:'impressions',label:'Impressões',icon:'eye'},{metric:'clicks',label:'Cliques',icon:'click'},{metric:'message_leads',label:'Conversas no WhatsApp',icon:'message'},{metric:'purchases',label:'Pacientes fechados',icon:'health'}]},
  {id:'education',label:'Escola e cursos',description:'Interessados, visita à página do curso e matrículas.',steps:[{metric:'impressions',label:'Impressões',icon:'eye'},{metric:'clicks',label:'Cliques',icon:'click'},{metric:'page_views',label:'Página do curso',icon:'school'},{metric:'leads',label:'Interessados',icon:'user-plus'},{metric:'purchases',label:'Matrículas',icon:'bag'}]},
  {id:'delivery',label:'Delivery e restaurantes',description:'Cardápio, carrinho, pedido iniciado e pedido concluído.',steps:[{metric:'impressions',label:'Impressões',icon:'eye'},{metric:'clicks',label:'Cliques',icon:'click'},{metric:'page_views',label:'Cardápio visto',icon:'food'},{metric:'add_to_cart',label:'Itens no carrinho',icon:'cart'},{metric:'checkouts',label:'Pedidos iniciados',icon:'card'},{metric:'purchases',label:'Pedidos concluídos',icon:'bag'}]},
  {id:'infoproduct',label:'Infoprodutos e lançamentos',description:'Tráfego, página de vendas, checkout e venda.',steps:[{metric:'impressions',label:'Impressões',icon:'eye'},{metric:'clicks',label:'Cliques',icon:'click'},{metric:'page_views',label:'Página de vendas',icon:'globe'},{metric:'checkouts',label:'Checkouts',icon:'card'},{metric:'purchases',label:'Vendas',icon:'bag'}]},
  {id:'custom',label:'Personalizado',description:'Escolha qualquer etapa, renomeie e ordene a jornada.',steps:[{metric:'impressions',label:'Impressões'},{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Cliques'},{metric:'page_views',label:'Visitas'},{metric:'leads',label:'Leads'}]},
];

/** Nichos e modelos de venda informados no cadastro do cliente; definem o funil inicial. */
export const businessNiches = [
  {id: 'real_estate', label: 'Imobiliária e construção'},
  {id: 'health', label: 'Clínica, saúde e laboratório'},
  {id: 'education', label: 'Educação e cursos'},
  {id: 'food', label: 'Restaurante, bar e delivery'},
  {id: 'retail', label: 'Varejo e loja virtual'},
  {id: 'beauty', label: 'Beleza, barbearia e estética'},
  {id: 'automotive', label: 'Automotivo, motos e veículos'},
  {id: 'leisure', label: 'Náutica, turismo e lazer'},
  {id: 'services', label: 'Serviços profissionais (advocacia, contabilidade…)'},
  {id: 'b2b', label: 'Indústria e B2B'},
  {id: 'digital', label: 'Infoprodutos e lançamentos'},
  {id: 'other', label: 'Outro nicho'},
] as const;
export type BusinessNiche = typeof businessNiches[number]['id'];

export const salesModels = [
  {id: 'online_store', label: 'Loja virtual (compra direta no site)'},
  {id: 'whatsapp', label: 'Conversa no WhatsApp ou Direct'},
  {id: 'lead_form', label: 'Formulário de captação de leads'},
  {id: 'appointments', label: 'Agendamento de horário ou visita'},
  {id: 'physical_store', label: 'Loja física (visita presencial)'},
  {id: 'consultative', label: 'Venda consultiva com time comercial/CRM'},
  {id: 'digital_launch', label: 'Produto digital ou lançamento'},
  {id: 'other', label: 'Outro modelo'},
] as const;
export type SalesModel = typeof salesModels[number]['id'];

const nicheSpecificFunnel: Partial<Record<BusinessNiche, FunnelModel>> = {
  real_estate: 'real_estate',
  health: 'clinic',
  education: 'education',
  food: 'delivery',
  digital: 'infoproduct',
};

const salesModelFunnel: Record<SalesModel, FunnelModel> = {
  online_store: 'ecommerce',
  whatsapp: 'messages',
  lead_form: 'lead_generation',
  appointments: 'appointments',
  physical_store: 'local_business',
  consultative: 'inside_sales',
  digital_launch: 'infoproduct',
  other: 'custom',
};

/**
 * Escolhe o funil inicial. O lançamento digital sempre usa o funil de infoprodutos; nichos com modelo
 * próprio (imobiliária, saúde, educação, delivery) usam o dele; nos demais, vale o modelo de vendas.
 */
export function suggestFunnelModel(niche: BusinessNiche | null | undefined, salesModel: SalesModel | null | undefined): FunnelModel {
  if (salesModel === 'digital_launch') return 'infoproduct';
  const byNiche = niche ? nicheSpecificFunnel[niche] : undefined;
  if (byNiche) return byNiche;
  return salesModel ? salesModelFunnel[salesModel] : 'lead_generation';
}

export function funnelPresetFor(model: FunnelModel) {
  return funnelPresets.find((preset) => preset.id === model) ?? funnelPresets[0];
}

export function parseFunnelSteps(value:unknown):FunnelStepConfig[]{
  if(!Array.isArray(value))return funnelPresets[0].steps;
  const allowed=new Set(funnelMetricDefinitions.map((item)=>item.key));
  const icons=new Set<string>(funnelIconKeys);
  const parsed=value.flatMap((item)=>{
    if(!item||typeof item!=='object'||Array.isArray(item))return [];
    const row=item as Record<string,unknown>;
    const metric=String(row.metric||'') as FunnelMetricKey;
    const label=String(row.label||'').trim();
    if(!allowed.has(metric)||label.length<1||label.length>40)return [];
    const step:FunnelStepConfig={metric,label};
    if(typeof row.color==='string'&&funnelColorPattern.test(row.color))step.color=row.color.toUpperCase();
    if(typeof row.icon==='string'&&icons.has(row.icon))step.icon=row.icon as FunnelIconKey;
    const target=row.target==null||row.target===''?null:Number(row.target);
    if(target!=null&&Number.isFinite(target)&&target>=0)step.target=target;
    return [step];
  });
  return parsed.length>=2&&parsed.length<=12&&new Set(parsed.map((item)=>item.metric)).size===parsed.length?parsed:funnelPresets[0].steps;
}
