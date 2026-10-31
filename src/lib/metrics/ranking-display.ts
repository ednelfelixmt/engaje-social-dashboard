import type {RankedPerformance} from './rankings';

export type RankingCriterion = 'results' | 'efficiency' | 'spend' | 'ctr';
export type RankingResultKey = 'purchases' | 'leads' | 'clicks';

/** Use one observed result type per ranking, without making missing counts zero. */
export function rankingResultMetric(rows: readonly RankedPerformance[]): {key: RankingResultKey; label: string} {
  if (rows.some(row => row.purchases != null && Number.isFinite(row.purchases) && row.purchases > 0)) {
    return {key: 'purchases', label: 'compras'};
  }
  if (rows.some(row => row.leads != null && Number.isFinite(row.leads) && row.leads > 0)) {
    return {key: 'leads', label: 'leads'};
  }
  return {key: 'clicks', label: 'cliques'};
}

export function rankingCtr(row: RankedPerformance): number | null {
  if (row.impressions == null || row.clicks == null ||
      !Number.isFinite(row.impressions) || !Number.isFinite(row.clicks) ||
      row.impressions <= 0 || row.clicks < 0) return null;
  const percentage = row.clicks / row.impressions * 100;
  return Number.isFinite(percentage) ? percentage : null;
}

/** An observed zero investment is eligible; a zero or absent result is not an efficiency measurement. */
export function rankingUnitCost(spend: number, count: number | null): number | null {
  if (!Number.isFinite(spend) || spend < 0 || count == null ||
      !Number.isFinite(count) || count <= 0) return null;
  const cost = spend / count;
  // Avoid presenting an underflowed positive cost as a genuinely free result.
  return Number.isFinite(cost) && (cost > 0 || spend === 0) ? cost : null;
}

/** Zero observations must not be represented by a minimum-width colored bar. */
export function rankingBarWidth(value: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || value <= 0 || maximum <= 0) return 0;
  return Math.min(100, Math.max(3, value / maximum * 100));
}

/** Scale the audience bars against the largest finite, non-negative observation, not a synthetic floor of one. */
export function rankingObservedMaximum(values: readonly (number | null | undefined)[]): number {
  let maximum = 0;
  for (const value of values) {
    if (value != null && Number.isFinite(value) && value > maximum) maximum = value;
  }
  return maximum;
}

function compareNumbers(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Pure projection over already authorized, single-tenant/currency ranking rows. */
export function rankPerformanceRows(rows: readonly RankedPerformance[], criterion: RankingCriterion): RankedPerformance[] {
  const result = rankingResultMetric(rows);
  const eligible = rows.filter(row => {
    if (criterion === 'spend') return Number.isFinite(row.spend) && row.spend >= 0;
    if (criterion === 'ctr') return rankingCtr(row) !== null;
    if (criterion === 'efficiency') return rankingUnitCost(row.spend, row[result.key]) !== null;
    const count = row[result.key];
    return count != null && Number.isFinite(count) && count >= 0;
  });

  return [...eligible].sort((a, b) => {
    if (criterion === 'spend') return compareNumbers(b.spend, a.spend);
    if (criterion === 'ctr') return compareNumbers(rankingCtr(b)!, rankingCtr(a)!);
    if (criterion === 'efficiency') {
      return compareNumbers(rankingUnitCost(a.spend, a[result.key])!, rankingUnitCost(b.spend, b[result.key])!) ||
        compareNumbers(b[result.key]!, a[result.key]!);
    }
    return compareNumbers(b[result.key]!, a[result.key]!) || compareNumbers(b.spend, a.spend);
  }).slice(0, 5);
}
