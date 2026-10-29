import type {Row} from '@/types/database.types';
import type {CampaignPerformance} from '@/types/domain';
import {finiteRatio,sum} from './aggregation';
import {isRfcOrganizationUuid} from './organization-scope';
import {summarizeWeightedMetric, weightedMetricKeys, providerWeightedMetricBounds, type WeightedMetricSummaries} from './weighted-metrics';

/** Only Meta defines act_ as an alias for the same advertising account. */
function normalizedAccountId(value: string, platform: string) {
  return platform === 'meta_ads' ? value.replace(/^act_/, '') : value;
}

/** A provider's distinct audience/clickers cannot be summed across daily facts. */
function knownUnique(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

const primitiveMetricKeys = [
  'conversion_value','impressions','reach','clicks','link_clicks','outbound_clicks','unique_clicks','page_views',
  'video_views','video_2s_views','video_3s_views','video_6s_views','thruplays','video_25','video_50','video_75','video_95','video_100',
  'leads','registration_leads','message_leads','phone_calls','form_starts','form_completions','content_views','add_to_cart',
  'checkouts','purchases','catalog_sales','subscriptions','conversions','all_conversions','view_through_conversions',
] as const;

export function campaigns(
  ads: Row<'metrics_ads'>[],
  crm: Row<'metrics_crm'>[],
  preferred: 'crm' | 'spreadsheet',
  catalog: Row<'ad_campaigns'>[] = [],
): CampaignPerformance[] {
  const groups = new Map<string, Row<'metrics_ads'>[]>();
  for (const ad of ads) {
    const key = JSON.stringify([ad.organization_id,ad.platform,normalizedAccountId(ad.account_id,ad.platform),ad.campaign_id,ad.currency]);
    const group=groups.get(key);
    if(group)group.push(ad);else groups.set(key,[ad]);
  }

  const crmByCampaignDay=new Map<string,Row<'metrics_crm'>[]>();
  for(const row of crm){
    const key=JSON.stringify([row.organization_id,row.metric_date,row.channel,normalizedAccountId(row.account_id,row.channel),row.campaign_id,row.currency]);
    const group=crmByCampaignDay.get(key);
    if(group)group.push(row);else crmByCampaignDay.set(key,[row]);
  }

  const performance: CampaignPerformance[] = [...groups.values()].map((rows) => {
    const first = rows[0];
    const spend = sum(rows, 'spend');
    if(spend===null)throw new Error('Invalid campaign spend aggregation');
    const byDay = new Map<string, Row<'metrics_ads'>[]>();
    for(const row of rows){const group=byDay.get(row.metric_date);if(group)group.push(row);else byDay.set(row.metric_date,[row]);}

    let revenue: number | null = 0;
    let purchases: number | null = 0;
    const sources = new Set<string>();

    for (const [day, daily] of byDay) {
      const actual = (crmByCampaignDay.get(JSON.stringify([first.organization_id,day,first.platform,normalizedAccountId(first.account_id,first.platform),first.campaign_id,first.currency]))||[])
        .filter((row)=>row.is_complete&&row.revenue!=null);
      const preferredRows = actual.filter((row) => row.source === preferred);
      const eligible = preferredRows.length ? preferredRows : actual;
      // Meta act_ aliases can bypass the raw account-id uniqueness constraint.
      // More than one complete record for the same source/campaign/day is ambiguous:
      // never silently select the first row based on database result order.
      const ambiguous = eligible.length > 1;
      const chosen = eligible.length === 1 ? eligible[0] : null;
      // CRM revenue can be signed, but invalid measurements and negative
      // purchase counts must never be compensated by other days.
      const amount = ambiguous ? null : chosen
        ? (chosen.revenue != null && Number.isFinite(chosen.revenue) ? chosen.revenue : null)
        : sum(daily, 'revenue');
      const rawCount = ambiguous ? null : chosen ? chosen.purchases : sum(daily, 'purchases');
      const count = rawCount != null && Number.isFinite(rawCount) && rawCount >= 0 ? rawCount : null;
      const nextRevenue:number|null=amount == null || revenue == null ? null : revenue + amount;
      const nextPurchases:number|null=count == null || purchases == null ? null : purchases + count;
      revenue=nextRevenue!=null&&Number.isFinite(nextRevenue)?nextRevenue:null;
      purchases=nextPurchases!=null&&Number.isFinite(nextPurchases)?nextPurchases:null;
      sources.add(chosen?.source || 'ads');
    }

    const impressions = sum(rows, 'impressions');
    // Reach and unique clickers require source-level deduplication across days.
    const reach = rows.length === 1 ? knownUnique(rows[0].reach) : null;
    const clicks = sum(rows, 'clicks');
    const pageViews = sum(rows, 'page_views');
    const leads = sum(rows, 'leads');
    const messageLeads = sum(rows, 'message_leads');
    // Registration leads must be observed from the source. Lead categories may overlap
    // or be absent independently; subtraction from total/message leads fabricates data.
    const registrationLeads = sum(rows, 'registration_leads');
    const checkouts = sum(rows, 'checkouts');
    const metricValues:Record<string,number|null>={};
    for(const key of primitiveMetricKeys)metricValues[key]=sum(rows,key);
    metricValues.reach = reach;
    metricValues.unique_clicks = rows.length === 1 ? knownUnique(rows[0].unique_clicks) : null;
    const weightedMetrics = Object.fromEntries(weightedMetricKeys.map(key => [key, summarizeWeightedMetric(rows.map(row => ({value: row[key], weight: row.impressions})), providerWeightedMetricBounds[key])])) as WeightedMetricSummaries;
    for (const key of weightedMetricKeys) metricValues[key] = weightedMetrics[key].value;
    metricValues.spend=spend;metricValues.revenue=revenue;metricValues.registration_leads=registrationLeads;

    return {
      organizationId: first.organization_id,
      platform: first.platform,
      accountId: first.account_id,
      campaignId: first.campaign_id,
      campaignName: first.campaign_name,
      campaignStatus: [...rows].sort((a, b) => b.metric_date.localeCompare(a.metric_date)).find((row) => row.campaign_status)?.campaign_status ?? null,
      currency: first.currency,
      spend,
      revenue,
      impressions,
      reach,
      clicks,
      pageViews,
      leads,
      registrationLeads,
      messageLeads,
      checkouts,
      revenueSource: revenue == null
        ? 'unavailable'
        : sources.size === 1
          ? [...sources][0] as CampaignPerformance['revenueSource']
          : 'mixed',
      purchases,
      roas: finiteRatio(revenue,spend),
      // Ad spend alone omits operating costs, so business ROI is unknown.
      roi: null,
      cpm: finiteRatio(spend,impressions,1000),
      cpc: finiteRatio(spend,clicks),
      cpl: finiteRatio(spend,leads),
      costPerRegistration: finiteRatio(spend,registrationLeads),
      costPerMessage: finiteRatio(spend,messageLeads),
      cpa: finiteRatio(spend,purchases),
      ctr: finiteRatio(clicks,impressions,100),
      conversionRate: finiteRatio(purchases,clicks,100),
      metricValues,
      weightedMetrics,
    };
  });

  const known = new Set(performance.map((row) => JSON.stringify([row.organizationId,row.platform,normalizedAccountId(row.accountId,row.platform),row.campaignId])));
  for (const campaign of catalog) {
    const key = JSON.stringify([campaign.organization_id,campaign.platform,normalizedAccountId(campaign.account_id,campaign.platform),campaign.external_id]);
    if (known.has(key)) continue;
    performance.push({
      organizationId: campaign.organization_id,
      platform: campaign.platform,
      accountId: campaign.account_id,
      campaignId: campaign.external_id,
      campaignName: campaign.name,
      campaignStatus: campaign.status,
      currency: '',
      spend: 0,
      revenue: null,
      impressions: null,
      reach: null,
      clicks: null,
      pageViews: null,
      leads: null,
      registrationLeads: null,
      messageLeads: null,
      checkouts: null,
      revenueSource: 'unavailable',
      purchases: null,
      roas: null,
      roi: null,
      cpm: null,
      cpc: null,
      cpl: null,
      costPerRegistration: null,
      costPerMessage: null,
      ctr: null,
      cpa: null,
      conversionRate: null,
      metricValues: {},
    });
  }
  return performance;
}

/** Provider identifiers are opaque: validate them without normalizing or trimming them. */
function validScopedSourceId(value: unknown, optional = false): value is string {
  return typeof value === 'string' && (optional && value === '' || value.length > 0 && value.trim() === value);
}

/** CRM can be unattributed; paid facts and campaign catalog entries cannot. */
function validScopedAccountId(value: unknown, provider: unknown, optional = false): boolean {
  if (!validScopedSourceId(value, optional)) return false;
  if (value === '') return optional;
  // A syntactically valid act_ prefix must not conceal an empty/padded Meta ID.
  if (provider !== 'meta_ads') return true;
  const canonical = value.replace(/^act_/, '');
  // Only one leading Meta act_ prefix is a valid account alias.
  // A doubled prefix would produce an inconsistent campaign/revenue grain.
  return validScopedSourceId(canonical) && !canonical.startsWith('act_');
}

// Fail closed if an API query returns a row outside the tenant/currency selected
// by the authenticated route. Validate *all* sources, including unused CRM facts
// and catalog-only campaigns, before projecting any figures.
export function scopedCampaigns(
  ads: Row<'metrics_ads'>[],
  crm: Row<'metrics_crm'>[],
  preferred: 'crm' | 'spreadsheet',
  catalog: Row<'ad_campaigns'>[],
  authorizedOrganizationId: string,
  selectedCurrency: string,
): CampaignPerformance[] {
  if (!isRfcOrganizationUuid(authorizedOrganizationId)
    || !/^[A-Z]{3}$/.test(selectedCurrency)
    || ads.some(row => row.organization_id !== authorizedOrganizationId || row.currency !== selectedCurrency)
    || crm.some(row => row.organization_id !== authorizedOrganizationId || row.currency !== selectedCurrency)
    || catalog.some(row => row.organization_id !== authorizedOrganizationId)) {
    throw new Error('Campaign aggregation requires authorized organization and currency');
  }
  // Validate every source, including CRM rows that do not match a paid campaign
  // and catalog-only entries, before grouping or excluding any data.
  if (ads.some(row => !validScopedSourceId(row.platform)
      || !validScopedAccountId(row.account_id, row.platform)
      || !validScopedSourceId(row.campaign_id))
    || crm.some(row => !validScopedSourceId(row.channel, true)
      || !validScopedAccountId(row.account_id, row.channel, true)
      || !validScopedSourceId(row.campaign_id, true))
    || catalog.some(row => !validScopedSourceId(row.platform)
      || !validScopedAccountId(row.account_id, row.platform)
      || !validScopedSourceId(row.external_id))) {
    throw new Error('Campaign aggregation requires valid source identifiers');
  }
  return campaigns(ads, crm, preferred, catalog);
}
