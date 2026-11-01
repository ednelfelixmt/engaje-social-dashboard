import {calendarDays,isValidCalendarDay} from './calendar';
import {isRfcOrganizationUuid} from './organization-scope';
import type {Row} from '@/types/database.types';
import {paidTotals} from './paid-metrics';
import {platformDashboards} from './platforms';

/** Read-only projection of the already tenant/currency/period-scoped ads query. */
export type IntelligenceDailyFact = Readonly<Pick<Row<'metrics_ads'>, 'organization_id' | 'currency' | 'platform' | 'metric_date' | 'spend' | 'impressions' | 'clicks' | 'leads'>>;
export type IntelligenceDailyPoint = Readonly<{
  date: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
}>;

/** Never mix unsupported provider facts into an all-channel paid timeline. */
function isSupportedPaidPlatform(value: unknown): value is string {
  return typeof value === 'string' && platformDashboards.some(item => item.platform === value);
}

/**
 * A day is complete for a metric only when every fact that day reports a
 * finite, nonnegative value. A missing/invalid item cannot be offset or
 * represented as zero by a different ad. Other metrics remain independent.
 * Explicit calendar periods retain every day, including dates with no facts,
 * to preserve ordinal comparisons without inventing zero observations.
 */
export function buildIntelligenceTimeline(
  rows: readonly IntelligenceDailyFact[],
  authorizedOrganizationId: string,
  selectedCurrency: string,
  selectedPlatform?: string,
  period?: Readonly<{from: string; to: string}>,
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
  // Validate the whole scoped batch before selecting a channel. Invalid facts
  // in another channel must never disappear behind a filter.
  if (selectedPlatform !== undefined && !isSupportedPaidPlatform(selectedPlatform)) {
    throw new Error('Intelligence timeline requires a valid selected platform');
  }
  if (rows.some(row => !isSupportedPaidPlatform(row.platform))) {
    throw new Error('Intelligence timeline requires valid source platforms');
  }
  const byDate = new Map<string, IntelligenceDailyFact[]>();
  for (const row of rows) {
    // Keep each date's ordinal position in the full period, even when only
    // another platform reported on that day. Missing is null, never zero.
    const selected = selectedPlatform === undefined || row.platform === selectedPlatform;
    const group = byDate.get(row.metric_date);
    if (group) {
      if (selected) group.push(row);
    } else {
      byDate.set(row.metric_date, selected ? [row] : []);
    }
  }
  // A requested range is the axis of truth, not the dates returned by the
  // provider. The provider might be silent on one or all dates of the range.
  const days = period ? calendarDays(period.from, period.to) : [...byDate.keys()].sort();
  if (period && [...byDate.keys()].some(date => date < period.from || date > period.to)) {
    throw new Error('Intelligence timeline facts outside selected period');
  }
  return days.map(date => {
    const facts = byDate.get(date) ?? [];
    if (!facts.length) return {date, spend: null, impressions: null, clicks: null, leads: null};
    const {spend, impressions, clicks, leads} = paidTotals(facts);
    return {date, spend, impressions, clicks, leads};
  });
}
