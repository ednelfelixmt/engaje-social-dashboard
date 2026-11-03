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
  /** Pelo que o dado chega hoje, quando não é a conexão direta do conector. */
  via?: string;
  /** Pendências conhecidas do integrador, conferidas com o código de sincronização. */
  pending?: string[];
};

export const connectorCatalog: ConnectorDefinition[] = [
  {provider: 'meta_ads', name: 'Meta', description: 'Uma única conexão para Facebook, Instagram e todos os ativos de mídia paga.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['contas de anúncio', 'Páginas e Instagram', 'pixels e formulários', 'catálogos e conversões'], requiredSecrets: ['META_APP_ID', 'META_APP_SECRET'], pending: []},
  {provider: 'google_ads', name: 'Google Ads', description: 'Campanhas, anúncios, investimento e conversões do Google Ads.', group: 'official', stage: 'live', mode: 'extractor', via: 'Windsor.ai', capabilities: ['campanhas e anúncios', 'investimento e conversões'], requiredSecrets: ['WINDSOR_API_KEY'], pending: ['Conexão direta pela API oficial do Google Ads: exige developer token aprovado pelo Google e cliente OAuth', 'Hoje os dados chegam pelo Windsor.ai e dependem da chave WINDSOR_API_KEY']},
  {provider: 'tiktok_ads', name: 'TikTok Ads', description: 'Estrutura para campanhas, investimento e conversões.', group: 'official', stage: 'foundation', mode: 'oauth', capabilities: ['métricas de anúncios', 'criativos'], requiredSecrets: ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET'], pending: ['Autorização OAuth e coleta de métricas ainda não implementadas', 'Segredos TIKTOK_APP_ID e TIKTOK_APP_SECRET a configurar']},
  {provider: 'windsor', name: 'Windsor.ai', description: 'Extrator de dados. Hoje alimenta o Google Ads; as demais fontes dependem de adaptador.', group: 'extractor', stage: 'live', mode: 'extractor', capabilities: ['Google Ads'], requiredSecrets: ['WINDSOR_API_KEY'], pending: ['Meta e TikTok pelo Windsor.ai: adaptador pendente']},
  {provider: 'stract', name: 'Stract', description: 'Extrator alternativo com destino no Supabase.', group: 'extractor', stage: 'foundation', mode: 'extractor', capabilities: ['múltiplas plataformas', 'cargas programadas'], requiredSecrets: [], pending: ['Adaptador de coleta pendente']},
  {provider: 'hubspot', name: 'HubSpot', description: 'Receita real, negócios, leads e etapas do funil.', group: 'crm', stage: 'foundation', mode: 'oauth', capabilities: ['receita real', 'funil de vendas'], requiredSecrets: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET'], pending: ['Autorização OAuth e adaptador de coleta pendentes', 'Segredos HUBSPOT_CLIENT_ID e HUBSPOT_CLIENT_SECRET a configurar']},
  {provider: 'rd_station', name: 'RD Station', description: 'Conversões, oportunidades e vendas conciliadas.', group: 'crm', stage: 'foundation', mode: 'oauth', capabilities: ['leads', 'oportunidades', 'vendas'], requiredSecrets: ['RD_CLIENT_ID', 'RD_CLIENT_SECRET'], pending: ['RD Station Marketing e CRM precisam de autorização e adaptadores de coleta', 'O cadastro de base não importa contatos nem negócios']},
  {provider: 'generic_crm', name: 'CRM genérico', description: 'Base para API, webhook ou importação personalizada.', group: 'crm', stage: 'foundation', mode: 'api', capabilities: ['receita real', 'funil personalizado'], requiredSecrets: [], pending: ['Envio de dados depende do endpoint de ingestão configurado em cada cliente']},
];

export const connectorByProvider = new Map(connectorCatalog.map((connector) => [connector.provider, connector]));
