import {isValidCalendarDay} from './calendar';
import {isRfcOrganizationUuid} from './organization-scope';
import type {Row} from '@/types/database.types';
import {paidTotals} from './paid-metrics';

/** Read-only projection of the already tenant/currency/period-scoped ads query. */
export type IntelligenceDailyFact = Readonly<Pick<Row<'metrics_ads'>, 'organization_id' | 'currency' | 'metric_date' | 'spend' | 'impressions' | 'clicks' | 'leads'>>;
export type IntelligenceDailyPoint = Readonly<{
  date: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
}>;

/**
 * A day is complete for a metric only when every fact that day reports a
 * finite, nonnegative value. A missing/invalid item cannot be offset or
 * represented as zero by a different ad. Other metrics remain independent.
 * Dates are kept in chronological order for ordinal period comparison.
 */
export function buildIntelligenceTimeline(
  rows: readonly IntelligenceDailyFact[],
  authorizedOrganizationId: string,
  selectedCurrency: string,
): IntelligenceDailyPoint[] {
  // Even an empty result must be associated with a valid authenticated scope.
  // Reject the entire result before aggregating: never produce a partial cross-tenant chart.
  if (!isRfcOrganizationUuid(authorizedOrganizationId)
    || !/^[A-Z]{3}$/.test(selectedCurrency)
    || rows.some(row => row.organization_id !== authorizedOrganizationId || row.currency !== selectedCurrency)) {
    throw new Error('Intelligence timeline requires authorized organization and currency');
  }
  // Fail closed for the entire timeline, not only the malformed daily row.
  if (rows.some(row => !isValidCalendarDay(row.metric_date))) {
    throw new Error('Intelligence timeline requires valid ISO calendar days');
  }
  const byDate = new Map<string, IntelligenceDailyFact[]>();
  for (const row of rows) {
    const group = byDate.get(row.metric_date);
    if (group) group.push(row);
    else byDate.set(row.metric_date, [row]);
  }
  return [...byDate].sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([date, facts]) => {
    const {spend, impressions, clicks, leads} = paidTotals(facts);
    return {date, spend, impressions, clicks, leads};
  });
}
