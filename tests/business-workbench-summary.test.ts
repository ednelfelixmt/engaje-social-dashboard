import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWorkbenchPeriods, getWorkbenchSummary, type WorkbenchSummaryRow} from '../src/lib/metrics/business-workbench-summary';

const campaign = (overrides: Partial<WorkbenchSummaryRow> = {}): WorkbenchSummaryRow =>
  ({spend: 100, impressions: 1000, clicks: 50, leads: 10, ...overrides});

test('workbench sums complete campaign metrics and derives ratios', () => {
  assert.deepEqual(getWorkbenchSummary([campaign(), campaign({spend: 50, impressions: 500, clicks: 25, leads: 5})]), {
    spend: 150, leads: 15, impressions: 1500, clicks: 75, cpl: 10, ctr: 5,
  });
});

test('workbench does not misrepresent partially missing metrics as zero', () => {
  assert.deepEqual(getWorkbenchSummary([campaign(), campaign({leads: null, clicks: null})]), {
    spend: 200, leads: null, impressions: 2000, clicks: null, cpl: null, ctr: null,
  });
});

test('zero reported by every campaign remains a known zero, unlike missing data', () => {
  assert.deepEqual(getWorkbenchSummary([campaign({leads: 0, clicks: 0})]), {
    spend: 100, leads: 0, impressions: 1000, clicks: 0, cpl: null, ctr: 0,
  });
  assert.deepEqual(getWorkbenchSummary([]), {
    spend: null, leads: null, impressions: null, clicks: null, cpl: null, ctr: null,
  });
});

test('workbench rejects nonfinite and overflowing totals', () => {
  const result = getWorkbenchSummary([campaign({spend: 1e308}), campaign({spend: 1e308})]);
  assert.equal(result.spend, null);
  assert.equal(result.cpl, null);
  assert.equal(getWorkbenchSummary([campaign({impressions: Infinity})]).impressions, null);
});

test('workbench comparisons are finite and require a positive baseline', () => {
  assert.deepEqual(compareWorkbenchPeriods(80, 100, true), {delta: -20, positive: true});
  assert.deepEqual(compareWorkbenchPeriods(120, 100), {delta: 20, positive: true});
  assert.equal(compareWorkbenchPeriods(1e308, 1e-308), null);
  assert.equal(compareWorkbenchPeriods(10, 0), null);
  assert.equal(compareWorkbenchPeriods(null, 10), null);
});
