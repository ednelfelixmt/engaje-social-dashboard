import type {Platform} from '@/types/domain';

export type ConnectorStage = 'live' | 'foundation';
export type ConnectorGroup = 'official' | 'extractor' | 'crm';

export type ConnectorDefinition = {
  provider: Platform;
  name: string;
  description: string;
  group: ConnectorGroup;
  stage: ConnectorStage;
  mode: 'oauth' | 'extractor' | 'api';
  capabilities: string[];
  requiredSecrets: string[];
};

export const connectorCatalog: ConnectorDefinition[] = [
  {provider: 'meta_ads', name: 'Meta', description: 'Uma única conexão para Facebook, Instagram e todos os ativos de mídia paga.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['contas de anúncio', 'Páginas e Instagram', 'pixels e formulários', 'catálogos e conversões'], requiredSecrets: ['META_APP_ID', 'META_APP_SECRET']},
  {provider:'google_ads',name:'Google Ads',description:'Plataforma de anúncios Google. OAuth e API nativos, separados dos extratores.',group:'official',stage:'foundation',mode:'oauth',capabilities:['contas','campanhas','conversões'],requiredSecrets:['GOOGLE_ADS_CLIENT_ID','GOOGLE_ADS_CLIENT_SECRET']},
  {provider: 'tiktok_ads', name: 'TikTok Ads', description: 'Estrutura para campanhas, investimento e conversões.', group: 'official', stage: 'foundation', mode: 'oauth', capabilities: ['métricas de anúncios', 'criativos'], requiredSecrets: ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET']},
  {provider: 'windsor', name: 'Windsor.ai', description: 'Extrator intermediário; plataforma de origem e conta são escolhidas separadamente.', group: 'extractor', stage: 'live', mode: 'extractor', capabilities: ['Google Ads'], requiredSecrets: ['WINDSOR_API_KEY']},
  {provider: 'stract', name: 'Stract', description: 'Extrator alternativo com destino no Supabase.', group: 'extractor', stage: 'foundation', mode: 'extractor', capabilities: ['múltiplas plataformas', 'cargas programadas'], requiredSecrets: []},
  {provider: 'hubspot', name: 'HubSpot', description: 'Receita real, negócios, leads e etapas do funil.', group: 'crm', stage: 'foundation', mode: 'oauth', capabilities: ['receita real', 'funil de vendas'], requiredSecrets: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET']},
  {provider: 'rd_station', name: 'RD Station', description: 'Conversões, oportunidades e vendas conciliadas.', group: 'crm', stage: 'foundation', mode: 'oauth', capabilities: ['leads', 'oportunidades', 'vendas'], requiredSecrets: ['RD_CLIENT_ID', 'RD_CLIENT_SECRET']},
  {provider: 'generic_crm', name: 'CRM genérico', description: 'Base para API, webhook ou importação personalizada.', group: 'crm', stage: 'foundation', mode: 'api', capabilities: ['receita real', 'funil personalizado'], requiredSecrets: []},
];

export const connectorByProvider = new Map(connectorCatalog.map((connector) => [connector.provider, connector]));
