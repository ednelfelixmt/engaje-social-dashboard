import type {CampaignPerformance} from '@/types/domain';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const currencyCode = /^[A-Z]{3}$/;

/**
 * A measured zero is not an empty catalog campaign. Ad-derived campaign rows
 * carry metricValues (including observed zero spend), while catalog-only
 * placeholders have no facts. Retain the previous scalar checks for legacy
 * measured projections that omit metricValues.
 */
export function hasWorkspaceMeasurements(row: CampaignPerformance): boolean {
  return (row.metricValues != null && Object.keys(row.metricValues).length > 0)
    || row.spend > 0
    || (row.impressions ?? 0) > 0
    || (row.clicks ?? 0) > 0
    || row.leads != null
    || row.revenue != null
    || row.purchases != null;
}

/**
 * Validate the entire input before filtering. An out-of-tenant catalog row or
 * a currency mismatch must fail closed instead of silently disappearing from
 * workspace KPIs, period comparisons, rankings, and exports.
 */
export function scopedWorkspaceMeasurements(
  rows: readonly CampaignPerformance[],
  authorizedOrganizationId: string,
  selectedCurrency: string,
): CampaignPerformance[] {
  if (!uuid.test(authorizedOrganizationId) || !currencyCode.test(selectedCurrency)
    || rows.some(row => row.organizationId !== authorizedOrganizationId
      || (hasWorkspaceMeasurements(row)
        ? row.currency !== selectedCurrency
        : row.currency !== '' && row.currency !== selectedCurrency))) {
    throw new Error('Workspace campaigns require authorized organization and currency');
  }
  return rows.filter(hasWorkspaceMeasurements);
}
