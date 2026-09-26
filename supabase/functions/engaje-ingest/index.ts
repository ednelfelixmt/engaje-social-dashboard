import {createClient} from 'npm:@supabase/supabase-js@2.76.1';

const base = Deno.env.get('SUPABASE_URL')!;
const service = createClient(base, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth: {persistSession: false}});
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
const adsPlatforms = new Set(['meta_ads', 'google_ads', 'tiktok_ads']);
const organicPlatforms = new Set(['facebook_organic', 'instagram_organic', 'tiktok_organic', 'youtube', 'google_business']);
const creativePlatforms = new Set([...adsPlatforms, ...organicPlatforms]);
const channels = new Set(['meta_ads', 'google_ads', 'tiktok_ads', 'organic', 'direct', 'unattributed']);
const kinds = new Set(['image', 'video', 'carousel', 'text']);
const dimensions = new Set(['audience', 'creative', 'gender', 'age', 'device', 'state', 'city']);

type Row = Record<string, unknown>;

function text(value: unknown, field: string, max = 240) {
  const result = String(value ?? '').trim();
  if (!result || result.length > max) throw new Error(`Campo ${field} inválido.`);
  return result;
}
function optionalText(value: unknown, max = 2000) {
  if (value === null || value === undefined || value === '') return null;
  const result = String(value).trim();
  if (result.length > max) throw new Error('Texto excede o limite permitido.');
  return result;
}
function date(value: unknown) {
  const result = text(value, 'metric_date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new Error('metric_date deve usar YYYY-MM-DD.');
  return result;
}
function currency(value: unknown) {
  const result = text(value ?? 'BRL', 'currency', 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(result)) throw new Error('Moeda inválida.');
  return result;
}
function numberValue(value: unknown, field: string, nullable = true, nonnegative = true) {
  if ((value === null || value === undefined || value === '') && nullable) return null;
  const result = Number(value);
  if (!Number.isFinite(result) || (nonnegative && result < 0)) throw new Error(`Campo ${field} inválido.`);
  return result;
}
function integer(value: unknown, field: string) {
  const result = numberValue(value, field);
  if (result !== null && !Number.isInteger(result)) throw new Error(`Campo ${field} deve ser inteiro.`);
  return result;
}
function url(value: unknown) {
  const result = optionalText(value, 2048);
  if (!result) return null;
  const parsed = new URL(result);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('URL de mídia inválida.');
  return parsed.href;
}
function timestamp(value: unknown) {
  const result = optionalText(value, 40);
  if (!result) return null;
  const parsed = new Date(result);
  if (Number.isNaN(parsed.getTime())) throw new Error('Data de publicação inválida.');
  return parsed.toISOString();
}
async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('');
}
function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
async function upsert(table: string, rows: Row[], onConflict: string) {
  const {error} = await service.from(table).upsert(rows, {onConflict});
  if (error) throw new Error(`O Supabase recusou o lote de ${table}.`);
}

Deno.serve(async (request: Request) => {
  let integrationId = '';
  let authenticated = false;
  try {
    if (request.method !== 'POST') return json({message: 'Use POST.'}, 405);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 2_000_000) return json({message: 'Carga maior que 2 MB.'}, 413);
    integrationId = new URL(request.url).searchParams.get('integration_id') || '';
    if (!/^[0-9a-f-]{36}$/.test(integrationId)) throw new Error('integration_id inválido.');
    const key = request.headers.get('x-engaje-key') || '';
    if (key.length !== 64) throw new Error('Chave de ingestão ausente ou inválida.');

    const {data: integration, error: integrationError} = await service.from('integrations').select('id,organization_id,provider,is_enabled,config').eq('id', integrationId).single();
    if (integrationError || !integration || !['stract', 'generic_crm'].includes(integration.provider) || !integration.is_enabled) throw new Error('Integração indisponível.');
    const expected = String(integration.config?.ingest_key_hash || '');
    if (!expected || !safeEqual(await hash(key), expected)) throw new Error('Chave de ingestão inválida.');
    authenticated = true;

    const body = await request.json();
    const dataset = String(body.dataset || '');
    const sourceRows = Array.isArray(body.rows) ? body.rows as Row[] : [];
    if (!['ads', 'ads_breakdowns', 'crm', 'creatives', 'organic'].includes(dataset)) throw new Error('dataset inválido.');
    if (!sourceRows.length || sourceRows.length > 1000) throw new Error('Envie entre 1 e 1000 linhas.');
    const now = new Date().toISOString();

    if (dataset === 'ads') {
      const rows = sourceRows.map((row) => {
        const platform = text(row.platform, 'platform', 40);
        if (!adsPlatforms.has(platform)) throw new Error('Plataforma de anúncios inválida.');
        const campaignId = text(row.campaign_id, 'campaign_id');
        const campaignStatus = optionalText(row.campaign_status, 64)?.toUpperCase().replace(/[^A-Z0-9_]/g, '_') ?? null;
        return {organization_id: integration.organization_id, integration_id: integration.id, metric_date: date(row.metric_date), platform, account_id: text(row.account_id, 'account_id'), campaign_id: campaignId, campaign_name: text(row.campaign_name ?? campaignId, 'campaign_name'), campaign_status: campaignStatus, adset_id: optionalText(row.adset_id, 240), ad_id: text(row.ad_id ?? `${campaignId}:aggregate`, 'ad_id'), currency: currency(row.currency), spend: numberValue(row.spend, 'spend', false), revenue: numberValue(row.revenue, 'revenue', true, false), impressions: integer(row.impressions, 'impressions'), clicks: integer(row.clicks, 'clicks'), page_views: integer(row.page_views, 'page_views'), leads: integer(row.leads, 'leads'), message_leads: integer(row.message_leads, 'message_leads'), checkouts: integer(row.checkouts, 'checkouts'), purchases: integer(row.purchases, 'purchases'), attribution_window: text(row.attribution_window ?? 'source_default', 'attribution_window', 80), synced_at: now};
      });
      await upsert('metrics_ads', rows, 'organization_id,platform,account_id,campaign_id,ad_id,metric_date,currency');
      const campaigns = [...new Map(rows.map((row) => [`${row.platform}:${row.account_id}:${row.campaign_id}`, {organization_id: integration.organization_id, integration_id: integration.id, platform: row.platform, account_id: row.account_id, external_id: row.campaign_id, name: row.campaign_name, status: row.campaign_status, last_seen_at: now}])).values()];
      await upsert('ad_campaigns', campaigns, 'organization_id,platform,account_id,external_id');
    }

    if (dataset === 'ads_breakdowns') {
      const rows = sourceRows.map((row) => {
        const platform = text(row.platform, 'platform', 40);
        const dimensionType = text(row.dimension_type, 'dimension_type', 20);
        if (!adsPlatforms.has(platform) || !dimensions.has(dimensionType)) throw new Error('Plataforma ou dimensão inválida.');
        const campaignId = text(row.campaign_id, 'campaign_id');
        const dimensionValue = text(row.dimension_value, 'dimension_value');
        return {organization_id: integration.organization_id, integration_id: integration.id, metric_date: date(row.metric_date), platform, account_id: text(row.account_id, 'account_id'), campaign_id: campaignId, campaign_name: text(row.campaign_name ?? campaignId, 'campaign_name'), dimension_type: dimensionType, dimension_value: dimensionValue, dimension_label: text(row.dimension_label ?? dimensionValue, 'dimension_label'), currency: currency(row.currency), spend: numberValue(row.spend, 'spend', false), revenue: numberValue(row.revenue, 'revenue', true, false), impressions: integer(row.impressions, 'impressions'), clicks: integer(row.clicks, 'clicks'), leads: integer(row.leads, 'leads'), message_leads: integer(row.message_leads, 'message_leads'), checkouts: integer(row.checkouts, 'checkouts'), purchases: integer(row.purchases, 'purchases'), attribution_window: text(row.attribution_window ?? 'source_default', 'attribution_window', 80), synced_at: now};
      });
      await upsert('metrics_ads_breakdowns', rows, 'organization_id,platform,account_id,campaign_id,dimension_type,dimension_value,metric_date,currency');
    }

    if (dataset === 'crm') {
      const rows = sourceRows.map((row) => {
        const channel = text(row.channel ?? 'unattributed', 'channel', 40);
        if (!channels.has(channel)) throw new Error('Canal de CRM inválido.');
        return {organization_id: integration.organization_id, integration_id: integration.id, spreadsheet_upload_id: null, source: 'crm', metric_date: date(row.metric_date), currency: currency(row.currency), channel, account_id: optionalText(row.account_id, 240) ?? '', campaign_id: optionalText(row.campaign_id, 240) ?? '', revenue: numberValue(row.revenue, 'revenue', true, false), purchases: integer(row.purchases, 'purchases'), leads: integer(row.leads, 'leads'), checkouts: integer(row.checkouts, 'checkouts'), is_complete: row.is_complete === true, synced_at: now};
      });
      await upsert('metrics_crm', rows, 'organization_id,source,metric_date,currency,channel,account_id,campaign_id');
    }

    if (dataset === 'creatives') {
      const rows = sourceRows.map((row) => {
        const platform = text(row.platform, 'platform', 40);
        const kind = text(row.kind ?? 'other', 'kind', 20);
        if (!creativePlatforms.has(platform) || !kinds.has(kind)) throw new Error('Plataforma ou tipo de criativo inválido.');
        return {organization_id: integration.organization_id, integration_id: integration.id, platform, account_id: text(row.account_id, 'account_id'), external_id: text(row.external_id, 'external_id'), campaign_id: optionalText(row.campaign_id, 240), ad_id: optionalText(row.ad_id, 240), kind, caption: optionalText(row.caption, 5000), media_url: url(row.media_url), thumbnail_url: url(row.thumbnail_url), permalink: url(row.permalink), published_at: timestamp(row.published_at), lifetime_metrics: row.lifetime_metrics && typeof row.lifetime_metrics === 'object' && !Array.isArray(row.lifetime_metrics) ? row.lifetime_metrics : {}, synced_at: now};
      });
      await upsert('creatives', rows, 'organization_id,platform,account_id,external_id');
    }

    if (dataset === 'organic') {
      const creativeIds = [...new Set(sourceRows.map((row) => text(row.creative_external_id, 'creative_external_id')))];
      const {data: creatives, error: creativesError} = await service.from('creatives').select('id,platform,account_id,external_id').eq('organization_id', integration.organization_id).eq('integration_id', integration.id).in('external_id', creativeIds);
      if (creativesError) throw new Error('Não foi possível localizar os criativos do lote.');
      const creativeMap = new Map((creatives ?? []).map((creative) => [`${creative.platform}:${creative.account_id}:${creative.external_id}`, creative.id]));
      const rows: Row[] = sourceRows.map((row) => {
        const platform = text(row.platform, 'platform', 40);
        if (!organicPlatforms.has(platform)) throw new Error('Plataforma orgânica inválida.');
        const accountId = text(row.account_id, 'account_id');
        const externalId = text(row.creative_external_id, 'creative_external_id');
        const creativeId = creativeMap.get(`${platform}:${accountId}:${externalId}`);
        if (!creativeId) throw new Error(`Criativo ${externalId} precisa ser importado antes das métricas orgânicas.`);
        return {organization_id: integration.organization_id, integration_id: integration.id, creative_id: creativeId, metric_date: date(row.metric_date), platform, impressions: integer(row.impressions, 'impressions'), reach: integer(row.reach, 'reach'), clicks: integer(row.clicks, 'clicks'), page_views: integer(row.page_views, 'page_views'), likes: integer(row.likes, 'likes'), comments: integer(row.comments, 'comments'), shares: integer(row.shares, 'shares'), saves: integer(row.saves, 'saves'), video_views: integer(row.video_views, 'video_views'), synced_at: now};
      });
      await upsert('metrics_organic', rows, 'organization_id,creative_id,metric_date');
    }

    await service.from('integrations').update({status: 'connected', is_enabled: true, last_synced_at: now, last_error: null}).eq('id', integration.id);
    return json({status: 'success', dataset, rows_received: sourceRows.length, integration_id: integration.id, synced_at: now});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na ingestão.';
    if (authenticated && integrationId) await service.from('integrations').update({status: 'error', last_error: message.slice(0, 300)}).eq('id', integrationId);
    return json({status: 'error', message}, 400);
  }
});
