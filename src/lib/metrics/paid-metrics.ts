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
export type PaidMetricInput = Omit<PaidFact, 'spend'> & {spend: number | null};
export type PaidTotals = PaidMetricInput & {ctr: number | null; cpc: number | null; cpm: number | null; cpl: number | null};

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

/** Missing, negative or non-finite observations are unavailable, not zero. */
function nonnegativeOrNull(value: number | null): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Ratios must never leak negative, NaN or Infinity to charts. */
function finiteRatio(numerator: number, denominator: number, multiplier = 1): number | null {
  if (!Number.isFinite(numerator) || numerator < 0 || !Number.isFinite(denominator) || denominator <= 0) return null;
  const result = numerator / denominator * multiplier;
  return Number.isFinite(result) ? result : null;
}

/** A weighted ratio of aggregate numerators/denominators, never an average of ratios. */
export function paidMetric(row: PaidMetricInput, metric: PaidMetricKey): number | null {
  switch (metric) {
    case 'spend': return nonnegativeOrNull(row.spend);
    case 'impressions':
    case 'clicks':
    case 'leads': return nonnegativeOrNull(row[metric]);
    case 'ctr': return row.impressions != null && row.clicks != null
      ? finiteRatio(row.clicks, row.impressions, 100) : null;
    case 'cpc': return row.spend != null && row.spend >= 0 && row.clicks != null ? finiteRatio(row.spend, row.clicks) : null;
    case 'cpm': return row.spend != null && row.spend >= 0 && row.impressions != null ? finiteRatio(row.spend, row.impressions, 1000) : null;
    case 'cpl': return row.spend != null && row.spend >= 0 && row.leads != null ? finiteRatio(row.spend, row.leads) : null;
  }
}

export function paidTotals<T extends PaidFact>(rows: readonly T[]): PaidTotals {
  // Empty, invalid or overflowing spend must remain unknown, never fabricated as zero.
  const spend = sumKnown(rows, row => nonnegativeOrNull(row.spend));
  const impressions = sumKnown(rows, row => nonnegativeOrNull(row.impressions));
  const clicks = sumKnown(rows, row => nonnegativeOrNull(row.clicks));
  const leads = sumKnown(rows, row => nonnegativeOrNull(row.leads));
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
