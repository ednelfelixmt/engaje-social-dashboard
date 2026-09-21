import type {Row} from '@/types/database.types';
import type {CampaignPerformance} from '@/types/domain';
import {sum} from './query';

export function campaigns(
  ads: Row<'metrics_ads'>[],
  crm: Row<'metrics_crm'>[],
  preferred: 'crm' | 'spreadsheet',
): CampaignPerformance[] {
  const groups = new Map<string, Row<'metrics_ads'>[]>();
  for (const ad of ads) {
    const key = [ad.platform, ad.account_id, ad.campaign_id].join(':');
    groups.set(key, [...(groups.get(key) || []), ad]);
  }

  return [...groups.values()].map((rows) => {
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
    const registrationLeads = leads != null && messageLeads != null
      ? Math.max(0, leads - messageLeads)
      : null;
    const checkouts = sum(rows, 'checkouts');

    return {
      organizationId: first.organization_id,
      platform: first.platform,
      accountId: first.account_id,
      campaignId: first.campaign_id,
      campaignName: first.campaign_name,
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
    };
  });
}
