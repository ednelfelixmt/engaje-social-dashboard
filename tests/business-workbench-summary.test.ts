import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWorkbenchPeriods, getWorkbenchSummary, getWorkbenchDayMetric, selectWorkbenchTimeline, type WorkbenchSummaryRow} from '../src/lib/metrics/business-workbench-summary';

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


test('workbench rejects negative paid investment and counts without contaminating unaffected indicators', () => {
  const result = getWorkbenchSummary([campaign(), campaign({spend: -1, impressions: -2, clicks: -3, leads: -4})]);
  assert.deepEqual(result, {spend: null, leads: null, impressions: null, clicks: null, cpl: null, ctr: null});
  const spendOnly = getWorkbenchSummary([campaign({spend: -1})]);
  assert.equal(spendOnly.spend, null);
  assert.equal(spendOnly.cpl, null);
  assert.equal(spendOnly.ctr, 5);
});

test('workbench accepts legitimate zero and attributed fractions', () => {
  assert.deepEqual(getWorkbenchSummary([campaign({spend: 0, leads: 0.5, clicks: 0, impressions: 2.5})]), {
    spend: 0, leads: 0.5, impressions: 2.5, clicks: 0, cpl: 0, ctr: 0,
  });
});

test('daily chart and CSV scalar contract omits negative and non-finite facts', () => {
  const row = campaign({spend: -12, leads: 5, clicks: -2, impressions: 100});
  assert.equal(getWorkbenchDayMetric(row, 'spend'), null);
  assert.equal(getWorkbenchDayMetric(row, 'cpl'), null);
  assert.equal(getWorkbenchDayMetric(row, 'clicks'), null);
  assert.equal(getWorkbenchDayMetric(row, 'ctr'), null);
  assert.equal(getWorkbenchDayMetric(row, 'leads'), 5);
  assert.equal(getWorkbenchDayMetric(campaign({spend: 0, clicks: 0, leads: 2}), 'cpl'), 0);
  assert.equal(getWorkbenchDayMetric(campaign({impressions: 0}), 'ctr'), null);
  assert.equal(getWorkbenchDayMetric(campaign({clicks: Infinity}), 'clicks'), null);
  assert.equal(getWorkbenchDayMetric(undefined, 'spend'), null);
});

test('comparisons never characterize negative current counts or costs as improvement', () => {
  assert.equal(compareWorkbenchPeriods(-10, 100, true), null);
  assert.equal(compareWorkbenchPeriods(-1, 100), null);
});


test('unchanged metrics and budget adjustments are neutral, not improvements', () => {
  assert.deepEqual(compareWorkbenchPeriods(100, 100), {delta: 0, positive: null});
  assert.deepEqual(compareWorkbenchPeriods(100, 100, true), {delta: 0, positive: null});
  assert.deepEqual(compareWorkbenchPeriods(120, 100, false, true), {delta: 20, positive: null});
  assert.deepEqual(compareWorkbenchPeriods(80, 100, false, true), {delta: -20, positive: null});
  assert.deepEqual(compareWorkbenchPeriods(120, 100, true), {delta: 20, positive: false});
  assert.deepEqual(compareWorkbenchPeriods(80, 100, true), {delta: -20, positive: true});
});

test('neutral classification still rejects a missing or invalid comparison baseline', () => {
  assert.equal(compareWorkbenchPeriods(10, 0, false, true), null);
  assert.equal(compareWorkbenchPeriods(null, 10, false, true), null);
  assert.equal(compareWorkbenchPeriods(Number.POSITIVE_INFINITY, 10, false, true), null);
});

test('channel chart selection never silently reuses portfolio totals or the wrong comparison', () => {
  const overall = Object.freeze([{date: '2026-10-25', spend: 900}]);
  const meta = Object.freeze([{date: '2026-10-25', spend: 100}]);
  const google = Object.freeze([{date: '2026-10-25', spend: 800}]);
  const byChannel = Object.freeze({meta_ads: meta, google_ads: google});
  assert.equal(selectWorkbenchTimeline('all', overall, byChannel), overall);
  assert.equal(selectWorkbenchTimeline('meta_ads', overall, byChannel), meta);
  assert.equal(selectWorkbenchTimeline('google_ads', overall, byChannel), google);
  assert.deepEqual(selectWorkbenchTimeline('tiktok_ads', overall, byChannel), []);
  assert.deepEqual(selectWorkbenchTimeline('invalid', overall, byChannel), []);
  assert.deepEqual(overall, [{date: '2026-10-25', spend: 900}]);
});
