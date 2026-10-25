/**
 * Canonical, presentation-independent paid media metrics.
 *
 * The input is a single homogeneous fact grain. Cross-platform deduplication,
 * attribution and currency normalization must occur upstream.
 */
export type PaidFact = {
  spend: number;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
};
export type PaidMetricKey = 'spend' | 'impressions' | 'clicks' | 'leads' | 'ctr' | 'cpc' | 'cpm' | 'cpl';
export type PaidTotals = PaidFact & {ctr: number | null; cpc: number | null; cpm: number | null; cpl: number | null};

/** Missing component values make a sum unknown, not zero. */
export function sumKnown<T>(rows: readonly T[], selector: (row: T) => number | null | undefined): number | null {
  if (rows.length === 0) return null;
  let total = 0;
  for (const row of rows) {
    const value = selector(row);
    if (value == null || !Number.isFinite(value)) return null;
    total += value;
  }
  return Number.isFinite(total) ? total : null;
}

/** Ratios must never leak NaN or Infinity to charts, even for malformed facts. */
function finiteRatio(numerator: number, denominator: number, multiplier = 1): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  const result = numerator / denominator * multiplier;
  return Number.isFinite(result) ? result : null;
}

/** A weighted ratio of aggregate numerators/denominators, never an average of ratios. */
export function paidMetric(row: PaidFact, metric: PaidMetricKey): number | null {
  switch (metric) {
    case 'spend': return Number.isFinite(row.spend) ? row.spend : null;
    case 'impressions':
    case 'clicks':
    case 'leads': return row[metric] != null && Number.isFinite(row[metric]) ? row[metric] : null;
    case 'ctr': return row.impressions != null && row.clicks != null
      ? finiteRatio(row.clicks, row.impressions, 100) : null;
    case 'cpc': return row.clicks != null ? finiteRatio(row.spend, row.clicks) : null;
    case 'cpm': return row.impressions != null ? finiteRatio(row.spend, row.impressions, 1000) : null;
    case 'cpl': return row.leads != null ? finiteRatio(row.spend, row.leads) : null;
  }
}

export function paidTotals<T extends PaidFact>(rows: readonly T[]): PaidTotals {
  // Spend is only meaningful when there are actual fact rows.
  const spend = sumKnown(rows, row => row.spend) ?? 0;
  const impressions = sumKnown(rows, row => row.impressions);
  const clicks = sumKnown(rows, row => row.clicks);
  const leads = sumKnown(rows, row => row.leads);
  const aggregate = {spend, impressions, clicks, leads};
  return {
    ...aggregate,
    ctr: paidMetric(aggregate, 'ctr'),
    cpc: paidMetric(aggregate, 'cpc'),
    cpm: paidMetric(aggregate, 'cpm'),
    cpl: paidMetric(aggregate, 'cpl'),
  };
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const change = (current / previous - 1) * 100;
  return Number.isFinite(change) ? change : null;
}
