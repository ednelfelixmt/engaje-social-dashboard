import type {Row} from '@/types/database.types';
import {paidTotals} from './paid-metrics';

/** Read-only projection of the already tenant/currency/period-scoped ads query. */
export type IntelligenceDailyFact = Readonly<Pick<Row<'metrics_ads'>, 'metric_date' | 'spend' | 'impressions' | 'clicks' | 'leads'>>;
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
export function buildIntelligenceTimeline(rows: readonly IntelligenceDailyFact[]): IntelligenceDailyPoint[] {
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
