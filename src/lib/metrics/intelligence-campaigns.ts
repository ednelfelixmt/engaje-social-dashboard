import type {CampaignPerformance} from '@/types/domain';
import type {InsightCampaign} from '@/components/dashboard/business-analytics-workbench';

/**
 * Catalog-only campaigns are placeholders without an observed ad fact.
 * A recorded zero spend is still a measured fact and must not be discarded.
 * Scope is verified before selecting records to avoid partial cross-tenant output.
 */
export function intelligenceCampaignShape(
  rows: readonly CampaignPerformance[],
  authorizedOrganizationId: string,
): InsightCampaign[] {
  if (!authorizedOrganizationId || rows.some(row => row.organizationId !== authorizedOrganizationId)) {
    throw new Error('Intelligence requires a single authorized organization');
  }
  return rows
    .filter(row => row.metricValues != null && Object.hasOwn(row.metricValues, 'spend'))
    .map(row => ({
      id: `${row.platform}:${row.accountId}:${row.campaignId}`,
      name: row.campaignName,
      platform: row.platform,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      leads: row.leads,
      revenue: row.revenue,
      purchases: row.purchases,
    }));
}
