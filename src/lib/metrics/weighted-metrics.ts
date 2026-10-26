/** Non-additive provider metrics: an impression-weighted estimate, never a sum. */
export const weightedMetricKeys = ['search_impression_share', 'search_top_impression_share', 'search_absolute_top_impression_share', 'quality_score'] as const;
export type WeightedMetricKey = typeof weightedMetricKeys[number];
/** Provider display units: search shares are percentages (0..100) and quality score is 0..10. */
export const providerWeightedMetricBounds: Record<WeightedMetricKey, Readonly<{min:number;max:number}>> = {
  search_impression_share: {min:0,max:100},
  search_top_impression_share: {min:0,max:100},
  search_absolute_top_impression_share: {min:0,max:100},
  quality_score: {min:0,max:10},
};

export type WeightedMetricSummary = Readonly<{
  value: number | null;
  rows: number;
  includedRows: number;
  missingValues: number;
  invalidWeights: number;
  weight: number;
  weightedTotal: number;
  overflow: boolean;
  status: 'complete' | 'partial' | 'unavailable';
}>;
export type WeightedMetricSummaries = Record<WeightedMetricKey, WeightedMetricSummary>;

function finalize(summary: Omit<WeightedMetricSummary, 'value' | 'status'>): WeightedMetricSummary {
  const quotient = summary.weight > 0 ? summary.weightedTotal / summary.weight : null;
  const value = !summary.overflow && quotient != null && Number.isFinite(quotient) ? quotient : null;
  return {...summary, value, status: value == null ? 'unavailable' : summary.includedRows === summary.rows ? 'complete' : 'partial'};
}

export function summarizeWeightedMetric(observations: readonly {value: number | null | undefined; weight: number | null | undefined}[], bounds?: Readonly<{min:number;max:number}>): WeightedMetricSummary {
  let includedRows = 0, missingValues = 0, invalidWeights = 0, weight = 0, weightedTotal = 0, overflow = false;
  for (const observation of observations) {
    if (observation.value == null || !Number.isFinite(observation.value) || (bounds != null && (observation.value < bounds.min || observation.value > bounds.max))) {missingValues++; continue;}
    if (observation.weight == null || !Number.isFinite(observation.weight) || observation.weight <= 0) {invalidWeights++; continue;}
    includedRows++;
    weight += observation.weight;
    weightedTotal += observation.value * observation.weight;
    if (!Number.isFinite(weight) || !Number.isFinite(weightedTotal)) overflow = true;
  }
  // Never carry Infinity or NaN into props, serialization or a second aggregation.
  return finalize({rows: observations.length, includedRows, missingValues, invalidWeights, weight: overflow ? 0 : weight, weightedTotal: overflow ? 0 : weightedTotal, overflow});
}

/** Merge sufficient statistics, preserving excluded days and their original weights. */
export function mergeWeightedMetrics(summaries: readonly WeightedMetricSummary[]): WeightedMetricSummary {
  let rows = 0, includedRows = 0, missingValues = 0, invalidWeights = 0, weight = 0, weightedTotal = 0, overflow = false;
  for (const summary of summaries) {
    rows += summary.rows; includedRows += summary.includedRows;
    missingValues += summary.missingValues; invalidWeights += summary.invalidWeights;
    weight += summary.weight; weightedTotal += summary.weightedTotal;
    overflow ||= summary.overflow || !Number.isFinite(weight) || !Number.isFinite(weightedTotal);
  }
  return finalize({rows, includedRows, missingValues, invalidWeights, weight: overflow ? 0 : weight, weightedTotal: overflow ? 0 : weightedTotal, overflow});
}

/** Compatibility for callers supplying one already-aggregated observation per campaign. */
export function paidWeightedMetrics(rows: readonly {impressions: number | null; metricValues: Record<string, number | null>; weightedMetrics?: WeightedMetricSummaries}[]): WeightedMetricSummaries {
  return Object.fromEntries(weightedMetricKeys.map(key => [key, mergeWeightedMetrics(rows.map(row =>
    row.weightedMetrics?.[key] ?? summarizeWeightedMetric([{value: row.metricValues[key], weight: row.impressions}], providerWeightedMetricBounds[key]),
  ))])) as WeightedMetricSummaries;
}
