import type {Row} from '@/types/database.types';
import {paidMetric, paidTotals} from './paid-metrics';
import {isRfcOrganizationUuid} from './organization-scope';

/**
 * Facts shown to agency administrators. Portfolio totals may span multiple
 * organizations, but monetary amounts require a single verified currency.
 * Customer cards must additionally verify their expected tenant.
 */
export type AgencyAdRow = Pick<Row<'metrics_ads'>,
  'organization_id' | 'currency' | 'spend' | 'impressions' | 'reach' | 'clicks' | 'leads'
>;

export function summarizeAgencyAds(rows: readonly AgencyAdRow[], expectedCurrency?: string) {
  // A portfolio may aggregate authorized tenants, never facts with an unknown
  // tenant identity. Reject the whole projection rather than summing a subset.
  if (rows.some(row => !isRfcOrganizationUuid(row.organization_id))) {
    return {spend: null, impressions: null, reach: null, leads: null, cpl: null, currency: null};
  }
  const currencies = new Set(rows.map(row => row.currency));
  const candidate = currencies.size === 1 ? rows[0].currency : null;
  const currency = candidate && /^[A-Z]{3}$/.test(candidate) &&
    (expectedCurrency === undefined || candidate === expectedCurrency) ? candidate : null;

  // Each additive metric requires complete, finite, non-negative observations.
  // One malformed fact cannot be cancelled by another observation.
  const totals = paidTotals(rows);
  const spend = currency === null ? null : totals.spend;

  // Distinct persons are not additive across dates, accounts or organizations.
  // Even a single row is usable only when its source represents a single grain.
  const observedReach = rows.length === 1 ? rows[0].reach : null;
  const reach = observedReach != null && Number.isFinite(observedReach) && observedReach >= 0
    ? observedReach : null;

  return {
    spend,
    impressions: totals.impressions,
    reach,
    leads: totals.leads,
    cpl: paidMetric({...totals, spend}, 'cpl'),
    currency,
  };
}

/** A client card requires an actual tenant UUID, including when no facts were ingested. */
export function summarizeClientAds(organizationId: string, currency: string, rows: readonly AgencyAdRow[]) {
  // A missing or malformed expected identity must never authenticate itself by
  // equality with an equally malformed record (or by the vacuous empty array).
  if (!isRfcOrganizationUuid(organizationId) || rows.some(row => row.organization_id !== organizationId)) {
    throw new Error('Client summary requires a single matching organization');
  }
  // Agency portfolio counts may span currencies, but a client's card cannot
  // present leads, impressions or reach from a source currency other than its
  // configured currency. Fail closed for the entire card, not just spend/CPL,
  // while keeping the other clients' admin overview available.
  if (!/^[A-Z]{3}$/.test(currency) || rows.some(row => row.currency !== currency)) {
    return {spend: null, impressions: null, reach: null, leads: null, cpl: null, currency: null};
  }
  return summarizeAgencyAds(rows, currency);
}
