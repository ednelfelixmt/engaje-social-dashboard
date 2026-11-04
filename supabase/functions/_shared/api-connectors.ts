// Conectores por API (HubSpot, RD Station CRM e TikTok Ads): endereços de autorização e
// conversão das respostas das plataformas para as tabelas do Mídia Hub. Funções puras, sem
// rede nem segredos, para que a conversão seja testável fora do runtime Edge.

export type CrmChannel = 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'organic' | 'direct' | 'unattributed';
export type CrmFact = {organization_id: string; integration_id: string; spreadsheet_upload_id: null; source: 'crm'; metric_date: string; currency: string; channel: CrmChannel; account_id: string; campaign_id: string; revenue: number | null; purchases: number | null; leads: number | null; checkouts: null; is_complete: boolean; synced_at: string};

const finite = (value: unknown) => { if (value == null || String(value).trim() === '') return null; const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const isoDay = (value: unknown) => { if (value == null || value === '') return null; const t = typeof value === 'number' ? value : /^\d+$/.test(String(value)) ? Number(value) : Date.parse(String(value)); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };
const currency = (value: unknown, fallback: string) => { const c = String(value ?? '').trim().toUpperCase(); return /^[A-Z]{3}$/.test(c) ? c : fallback; };

/** Origem do negócio no CRM para os canais aceitos; sem evidência clara, fica "não atribuído". */
export function crmChannel(source: unknown, detail: unknown = ''): CrmChannel {
  const s = String(source ?? '').toUpperCase(), d = String(detail ?? '').toLowerCase();
  if (/facebook|instagram|meta/.test(d)) return 'meta_ads';
  if (/tiktok/.test(d)) return 'tiktok_ads';
  if (/google|adwords|gclid/.test(d) || s === 'PAID_SEARCH') return 'google_ads';
  if (['ORGANIC_SEARCH', 'SOCIAL_MEDIA', 'REFERRALS', 'EMAIL_MARKETING'].includes(s)) return 'organic';
  if (s === 'DIRECT_TRAFFIC') return 'direct';
  return 'unattributed';
}

function aggregateCrm(items: {day: string | null; channel: CrmChannel; currency: string; revenue?: number | null; purchase?: boolean; lead?: boolean}[], base: {organizationId: string; integrationId: string; accountId: string; now: string}): CrmFact[] {
  const map = new Map<string, CrmFact>();
  const missing = new Set<string>();
  for (const item of items) {
    if (!item.day) continue;
    const key = [item.day, item.channel, item.currency].join('|');
    let row = map.get(key);
    if (!row) { row = {organization_id: base.organizationId, integration_id: base.integrationId, spreadsheet_upload_id: null, source: 'crm', metric_date: item.day, currency: item.currency, channel: item.channel, account_id: base.accountId, campaign_id: '', revenue: null, purchases: null, leads: null, checkouts: null, is_complete: true, synced_at: base.now}; map.set(key, row); }
    if (item.purchase) { row.purchases = (row.purchases ?? 0) + 1; if (item.revenue != null) row.revenue = (row.revenue ?? 0) + item.revenue; else missing.add(key); }
    if (item.lead) row.leads = (row.leads ?? 0) + 1;
  }
  // Venda sem valor: a soma do dia seria parcial, então a receita fica sem dado e a linha, incompleta.
  for (const key of missing) { const row = map.get(key)!; row.revenue = null; row.is_complete = false; }
  return [...map.values()];
}

/* ---------------- HubSpot ---------------- */
export const HUBSPOT_SCOPES = ['oauth', 'crm.objects.deals.read', 'crm.objects.contacts.read'];
export function hubspotAuthorizeUrl(clientId: string, redirectUri: string, state: string) {
  const url = new URL('https://app.hubspot.com/oauth/authorize');
  url.search = new URLSearchParams({client_id: clientId, redirect_uri: redirectUri, scope: HUBSPOT_SCOPES.join(' '), state}).toString();
  return url.href;
}
/** Negócios ganhos viram vendas e receita no dia do fechamento; contatos criados viram leads no dia da criação. */
export function hubspotCrmFacts(input: {deals: {properties?: Record<string, unknown>}[]; contacts: {properties?: Record<string, unknown>}[]; organizationId: string; integrationId: string; portalId: string; fallbackCurrency: string; now?: string}): CrmFact[] {
  const now = input.now ?? new Date().toISOString();
  const items = [
    ...input.deals.map((d) => { const p = d.properties ?? {}; return {day: isoDay(p.closedate), channel: crmChannel(p.hs_analytics_source, p.hs_analytics_source_data_1), currency: currency(p.deal_currency_code, input.fallbackCurrency), revenue: finite(p.amount), purchase: true}; }),
    ...input.contacts.map((c) => { const p = c.properties ?? {}; return {day: isoDay(p.createdate), channel: crmChannel(p.hs_analytics_source, p.hs_analytics_source_data_1), currency: input.fallbackCurrency, lead: true}; }),
  ];
  return aggregateCrm(items, {organizationId: input.organizationId, integrationId: input.integrationId, accountId: input.portalId, now});
}

/* ---------------- RD Station CRM ---------------- */
/** Negócios vendidos (win=true) do RD Station CRM viram vendas e receita no dia do fechamento. */
export function rdCrmFacts(input: {deals: Record<string, unknown>[]; organizationId: string; integrationId: string; accountId: string; currency: string; now?: string}): CrmFact[] {
  const now = input.now ?? new Date().toISOString();
  const items = input.deals.filter((d) => d.win === true || d.win === 'true').map((d) => {
    const source = d.deal_source && typeof d.deal_source === 'object' ? (d.deal_source as Record<string, unknown>).name : d.deal_source;
    return {day: isoDay(d.closed_at), channel: crmChannel('', source), currency: input.currency, revenue: finite(d.amount_total ?? d.amount), purchase: true};
  });
  return aggregateCrm(items, {organizationId: input.organizationId, integrationId: input.integrationId, accountId: input.accountId, now});
}

/* ---------------- TikTok Ads ---------------- */
export function tiktokAuthorizeUrl(appId: string, redirectUri: string, state: string) {
  const url = new URL('https://business-api.tiktok.com/portal/auth');
  url.search = new URLSearchParams({app_id: appId, state, redirect_uri: redirectUri}).toString();
  return url.href;
}
export const TIKTOK_REPORT_METRICS = ['spend', 'impressions', 'clicks', 'conversion', 'reach', 'video_play_actions', 'campaign_id', 'campaign_name', 'ad_name'];
/** Relatório diário por anúncio do TikTok para a tabela de métricas de anúncios. Leads e receita ficam sem dado (nulo). */
export function tiktokAdFacts(input: {rows: {dimensions?: Record<string, unknown>; metrics?: Record<string, unknown>}[]; organizationId: string; integrationId: string; advertiserId: string; currency: string; now?: string}) {
  const now = input.now ?? new Date().toISOString();
  return input.rows.flatMap((row) => {
    const dim = row.dimensions ?? {}, m = row.metrics ?? {};
    const day = isoDay(dim.stat_time_day), adId = String(dim.ad_id ?? '').trim();
    if (!day || !adId) return [];
    const campaignId = String(m.campaign_id ?? '').trim() || 'sem-campanha';
    return [{organization_id: input.organizationId, integration_id: input.integrationId, platform: 'tiktok_ads', metric_date: day, currency: currency(input.currency, 'BRL'), account_id: input.advertiserId, campaign_id: campaignId, campaign_name: String(m.campaign_name ?? campaignId), campaign_status: null, adset_id: null, ad_id: adId, spend: finite(m.spend) ?? 0, revenue: null, conversion_value: null, impressions: finite(m.impressions), reach: finite(m.reach), clicks: finite(m.clicks), page_views: null, video_views: finite(m.video_play_actions), leads: null, registration_leads: null, message_leads: null, checkouts: null, purchases: null, conversions: finite(m.conversion), attribution_window: 'tiktok_default', synced_at: now}];
  });
}
