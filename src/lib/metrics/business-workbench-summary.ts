import {finiteRatio} from './aggregation';
import {computeDelta} from './delta';

/** The workbench only reports a total when every campaign supplied the metric. */
export type WorkbenchMetric = 'spend' | 'impressions' | 'clicks' | 'leads' | 'cpl' | 'ctr';
export type WorkbenchSummaryRow = {
  spend: number;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
};

/** Counts and paid investment cannot be negative; an observed zero remains valid. */
function observed(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Single-day and campaign display metrics share the aggregate's validation rules. */
export function getWorkbenchDayMetric(row: WorkbenchSummaryRow | undefined, metric: WorkbenchMetric): number | null {
  if (!row) return null;
  if (metric === 'cpl') return finiteRatio(observed(row.spend), observed(row.leads));
  if (metric === 'ctr') return finiteRatio(observed(row.clicks), observed(row.impressions), 100);
  return observed(row[metric]);
}

function completeSum(rows: readonly WorkbenchSummaryRow[], key: keyof WorkbenchSummaryRow): number | null {
  if (!rows.length) return null;
  let total = 0;
  for (const row of rows) {
    const value = observed(row[key]);
    if (value == null) return null;
    total += value;
    if (!Number.isFinite(total)) return null;
  }
  return total;
}

export function getWorkbenchSummary(rows: readonly WorkbenchSummaryRow[]) {
  const spend = completeSum(rows, 'spend');
  const leads = completeSum(rows, 'leads');
  const impressions = completeSum(rows, 'impressions');
  const clicks = completeSum(rows, 'clicks');
  return {
    spend,
    leads,
    impressions,
    clicks,
    cpl: finiteRatio(spend, leads),
    ctr: finiteRatio(clicks, impressions, 100),
  };
}

/** A comparison without a finite positive baseline must remain unavailable. */
export function compareWorkbenchPeriods(current: number | null, previous: number | null, lowerBetter = false) {
  if (current == null || !Number.isFinite(current) || current < 0 || previous == null || !Number.isFinite(previous) || previous <= 0) return null;
  const delta = computeDelta(current, previous);
  if (!delta) return null;
  return {delta: delta.change, positive: lowerBetter ? delta.change <= 0 : delta.change >= 0};
}
