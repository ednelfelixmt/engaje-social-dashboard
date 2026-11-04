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
  /** Conector implementado que ainda depende de credenciais da plataforma para funcionar. */
  setup?: string;
};

export const connectorCatalog: ConnectorDefinition[] = [
  {provider: 'meta_ads', name: 'Meta', description: 'Uma única conexão para Facebook, Instagram e todos os ativos de mídia paga.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['contas de anúncio', 'Páginas e Instagram', 'pixels e formulários', 'catálogos e conversões'], requiredSecrets: ['META_APP_ID', 'META_APP_SECRET'], pending: []},
  {provider: 'google_ads', name: 'Google Ads', description: 'Campanhas, anúncios, investimento e conversões do Google Ads.', group: 'official', stage: 'live', mode: 'extractor', via: 'Windsor.ai', capabilities: ['campanhas e anúncios', 'investimento e conversões'], requiredSecrets: ['WINDSOR_API_KEY'], pending: ['Conexão direta pela API oficial do Google Ads: exige developer token aprovado pelo Google e cliente OAuth', 'Hoje os dados chegam pelo Windsor.ai e dependem da chave WINDSOR_API_KEY']},
  {provider: 'tiktok_ads', name: 'TikTok Ads', description: 'Campanhas, anúncios, investimento e conversões pela Marketing API do TikTok.', group: 'official', stage: 'live', mode: 'oauth', capabilities: ['métricas diárias de anúncios', 'campanhas'], requiredSecrets: ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET'], setup: 'Aguarda TIKTOK_APP_ID e TIKTOK_APP_SECRET (app aprovado na Marketing API)', pending: ['Criar o app na Marketing API do TikTok for Business e aguardar a aprovação', 'Cadastrar TIKTOK_APP_ID e TIKTOK_APP_SECRET nos Secrets do Supabase', 'Leads e receita não vêm no relatório básico do TikTok e aparecem sem dado']},
  {provider: 'windsor', name: 'Windsor.ai', description: 'Extrator de dados. Hoje alimenta o Google Ads; as demais fontes dependem de adaptador.', group: 'extractor', stage: 'live', mode: 'extractor', capabilities: ['Google Ads'], requiredSecrets: ['WINDSOR_API_KEY'], pending: ['Meta e TikTok pelo Windsor.ai: adaptador pendente']},
  {provider: 'hubspot', name: 'HubSpot', description: 'Negócios ganhos (receita e vendas) e contatos criados (leads) por canal de origem.', group: 'crm', stage: 'live', mode: 'oauth', capabilities: ['receita real', 'vendas', 'leads'], requiredSecrets: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET'], setup: 'Aguarda HUBSPOT_CLIENT_ID e HUBSPOT_CLIENT_SECRET', pending: ['Criar o app na conta de desenvolvedor da HubSpot com a URL de retorno do Mídia Hub', 'Cadastrar HUBSPOT_CLIENT_ID e HUBSPOT_CLIENT_SECRET nos Secrets do Supabase']},
  {provider: 'rd_station', name: 'RD Station CRM', description: 'Negócios vendidos (receita e vendas) por fonte, conectados pelo token de API da conta.', group: 'crm', stage: 'live', mode: 'api', capabilities: ['receita real', 'vendas'], requiredSecrets: [], pending: ['Informar o token de API do RD Station CRM de cada cliente na página de integrações dele', 'RD Station Marketing (leads e conversões) ainda não tem conector']},
];

export const connectorByProvider = new Map(connectorCatalog.map((connector) => [connector.provider, connector]));
