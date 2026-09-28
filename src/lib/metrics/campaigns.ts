import type {Row} from '@/types/database.types';
import type {CampaignPerformance} from '@/types/domain';
import {sum} from './query';

function normalizedAccountId(value: string) {
  return value.replace(/^act_/, '');
}

const primitiveMetricKeys = [
  'conversion_value','impressions','reach','clicks','link_clicks','outbound_clicks','unique_clicks','page_views',
  'video_views','video_2s_views','video_3s_views','video_6s_views','thruplays','video_25','video_50','video_75','video_95','video_100',
  'leads','registration_leads','message_leads','phone_calls','form_starts','form_completions','content_views','add_to_cart',
  'checkouts','purchases','catalog_sales','subscriptions','conversions','all_conversions','view_through_conversions',
  'search_impression_share','search_top_impression_share','search_absolute_top_impression_share','quality_score',
] as const;

export function campaigns(
  ads: Row<'metrics_ads'>[],
  crm: Row<'metrics_crm'>[],
  preferred: 'crm' | 'spreadsheet',
  catalog: Row<'ad_campaigns'>[] = [],
): CampaignPerformance[] {
  const groups = new Map<string, Row<'metrics_ads'>[]>();
  for (const ad of ads) {
    const key = [ad.platform, normalizedAccountId(ad.account_id), ad.campaign_id].join(':');
    groups.set(key, [...(groups.get(key) || []), ad]);
  }

  const performance = [...groups.values()].map((rows) => {
    const first = rows[0];
    const spend = sum(rows, 'spend') || 0;
    const byDay = new Map<string, Row<'metrics_ads'>[]>();
    rows.forEach((row) => byDay.set(row.metric_date, [...(byDay.get(row.metric_date) || []), row]));

    let revenue: number | null = 0;
    let purchases: number | null = 0;
    const sources = new Set<string>();

    for (const [day, daily] of byDay) {
      const actual = crm.filter((row) => row.metric_date === day
        && row.channel === first.platform
        && row.account_id === first.account_id
        && row.campaign_id === first.campaign_id
        && row.is_complete
        && row.revenue != null);
      const chosen = actual.find((row) => row.source === preferred) || actual[0];
      const amount = chosen ? chosen.revenue : sum(daily, 'revenue');
      const count = chosen ? chosen.purchases : sum(daily, 'purchases');
      revenue = amount == null || revenue == null ? null : revenue + amount;
      purchases = count == null || purchases == null ? null : purchases + count;
      sources.add(chosen?.source || 'ads');
    }

    const impressions = sum(rows, 'impressions');
    const clicks = sum(rows, 'clicks');
    const pageViews = sum(rows, 'page_views');
    const leads = sum(rows, 'leads');
    const messageLeads = sum(rows, 'message_leads');
    const storedRegistrationLeads = sum(rows, 'registration_leads');
    const registrationLeads = storedRegistrationLeads ?? (leads != null && messageLeads != null
      ? Math.max(0, leads - messageLeads)
      : null);
    const checkouts = sum(rows, 'checkouts');
    const metricValues:Record<string,number|null>={};
    for(const key of primitiveMetricKeys)metricValues[key]=sum(rows,key);
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
      roas: spend && revenue != null ? revenue / spend : null,
      roi: spend && revenue != null ? (revenue - spend) / spend * 100 : null,
      cpm: impressions ? spend / impressions * 1000 : null,
      cpc: clicks ? spend / clicks : null,
      cpl: leads ? spend / leads : null,
      costPerRegistration: registrationLeads ? spend / registrationLeads : null,
      costPerMessage: messageLeads ? spend / messageLeads : null,
      cpa: purchases ? spend / purchases : null,
      ctr: impressions && clicks != null ? clicks / impressions * 100 : null,
      conversionRate: clicks && purchases != null ? purchases / clicks * 100 : null,
      metricValues,
    };
  });

  const known = new Set(performance.map((row) => [row.platform, normalizedAccountId(row.accountId), row.campaignId].join(':')));
  for (const campaign of catalog) {
    const key = [campaign.platform, normalizedAccountId(campaign.account_id), campaign.external_id].join(':');
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
