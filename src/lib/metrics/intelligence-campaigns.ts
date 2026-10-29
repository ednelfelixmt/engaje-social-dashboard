import type {CampaignPerformance} from '@/types/domain';
import {isRfcOrganizationUuid} from './organization-scope';

/** Provider identifiers are opaque. Never trim or rewrite them during projection. */
function validSourceId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value
    && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}

/** Only Meta treats one initial act_ as an account alias. */
function accountIdentity(platform: string, value: unknown): string | null {
  if (!validSourceId(value)) return null;
  if (platform !== 'meta_ads') return value;
  const canonical = value.replace(/^act_/, '');
  return validSourceId(canonical) && !canonical.startsWith('act_') ? canonical : null;
}

/**
 * Catalog-only campaigns are placeholders without an observed ad fact.
 * A recorded zero spend is still a measured fact and must not be discarded.
 * Scope is verified before selecting records to avoid partial cross-tenant output.
 */
export function intelligenceCampaignShape(
  rows: readonly CampaignPerformance[],
  authorizedOrganizationId: string,
  selectedCurrency: string,
) {
  // Even an empty response must have the scope of the authenticated tenant.
  if (!isRfcOrganizationUuid(authorizedOrganizationId)
    || !/^[A-Z]{3}$/.test(selectedCurrency)) {
    throw new Error('Intelligence campaigns require authorized organization and currency');
  }
  const observed = (row: CampaignPerformance) =>
    row.metricValues != null && Object.hasOwn(row.metricValues, 'spend');

  // Validate all rows before selecting observed facts. Catalog-only rows are
  // deliberately currency-less; any nonempty currency must still match.
  // A measured campaign must always carry the selected source currency.
  if (rows.some(row => row.organizationId !== authorizedOrganizationId
    || (observed(row) ? row.currency !== selectedCurrency
      : row.currency !== '' && row.currency !== selectedCurrency))) {
    throw new Error('Intelligence campaigns require authorized organization and currency');
  }
  // Validate catalog placeholders too: a malformed row must not disappear
  // silently while the rest of the tenant's campaign table is shown.
  if (rows.some(row => !validSourceId(row.platform)
    || accountIdentity(row.platform, row.accountId) === null || !validSourceId(row.campaignId))) {
    throw new Error('Intelligence campaigns require valid source identifiers');
  }
  const measured = rows.filter(observed);
  // Use the same canonical Meta grain for every period. Different raw aliases
  // cannot create duplicate cards or unstable React identities.
  const keys = measured.map(row => JSON.stringify([
    row.organizationId, row.platform, accountIdentity(row.platform, row.accountId), row.campaignId,
  ]));
  if (new Set(keys).size !== keys.length) {
    throw new Error('Intelligence campaigns require unique source identities');
  }
  return measured.map((row, index) => ({
      // JSON tuples keep opaque IDs with punctuation unambiguous.
      // This key is presentation-only, never an external or persisted ID.
      id: keys[index]!,

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
