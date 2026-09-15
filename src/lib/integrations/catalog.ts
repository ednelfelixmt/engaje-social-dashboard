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
  {provider: 'meta_ads', name: 'Meta Ads', description: 'Campanhas, custos, conversões e criativos.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['métricas de anúncios', 'criativos'], requiredSecrets: ['META_APP_ID', 'META_APP_SECRET']},
  {provider: 'facebook_organic', name: 'Facebook orgânico', description: 'Posts, imagens e engajamento das páginas.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['conteúdo publicado', 'contadores orgânicos'], requiredSecrets: ['META_APP_ID', 'META_APP_SECRET']},
  {provider: 'instagram_organic', name: 'Instagram orgânico', description: 'Publicações, vídeos e desempenho orgânico.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['conteúdo publicado', 'contadores orgânicos'], requiredSecrets: ['META_APP_ID', 'META_APP_SECRET']},
  {provider: 'tiktok_ads', name: 'TikTok Ads', description: 'Estrutura para campanhas, investimento e conversões.', group: 'official', stage: 'foundation', mode: 'oauth', capabilities: ['métricas de anúncios', 'criativos'], requiredSecrets: ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET']},
  {provider: 'tiktok_organic', name: 'TikTok orgânico', description: 'Estrutura para vídeos e métricas orgânicas.', group: 'official', stage: 'foundation', mode: 'oauth', capabilities: ['conteúdo publicado', 'métricas orgânicas'], requiredSecrets: ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET']},
  {provider: 'windsor', name: 'Windsor.ai', description: 'Camada de dados para os serviços Google.', group: 'extractor', stage: 'live', mode: 'extractor', capabilities: ['Google Ads', 'Google Business', 'YouTube'], requiredSecrets: ['WINDSOR_API_KEY']},
  {provider: 'stract', name: 'Stract', description: 'Extrator alternativo com destino no Supabase.', group: 'extractor', stage: 'foundation', mode: 'extractor', capabilities: ['múltiplas plataformas', 'cargas programadas'], requiredSecrets: []},
  {provider: 'hubspot', name: 'HubSpot', description: 'Receita real, negócios, leads e etapas do funil.', group: 'crm', stage: 'foundation', mode: 'oauth', capabilities: ['receita real', 'funil de vendas'], requiredSecrets: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET']},
  {provider: 'rd_station', name: 'RD Station', description: 'Conversões, oportunidades e vendas conciliadas.', group: 'crm', stage: 'foundation', mode: 'oauth', capabilities: ['leads', 'oportunidades', 'vendas'], requiredSecrets: ['RD_CLIENT_ID', 'RD_CLIENT_SECRET']},
  {provider: 'generic_crm', name: 'CRM genérico', description: 'Base para API, webhook ou importação personalizada.', group: 'crm', stage: 'foundation', mode: 'api', capabilities: ['receita real', 'funil personalizado'], requiredSecrets: []},
];

export const connectorByProvider = new Map(connectorCatalog.map((connector) => [connector.provider, connector]));
