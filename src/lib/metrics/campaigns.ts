import type {Row} from '@/types/database.types';
import type {CampaignPerformance} from '@/types/domain';
import {finiteRatio,sum} from './aggregation';
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
      const chosen = actual.find((row) => row.source === preferred) || actual[0];
      // CRM revenue can be signed, but invalid measurements and negative
      // purchase counts must never be compensated by other days.
      const amount = chosen ? (chosen.revenue != null && Number.isFinite(chosen.revenue) ? chosen.revenue : null) : sum(daily, 'revenue');
      const rawCount = chosen ? chosen.purchases : sum(daily, 'purchases');
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
