import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIntelligenceTimeline, type IntelligenceDailyFact} from '../src/lib/metrics/intelligence-daily';
import {getWorkbenchDayMetric} from '../src/lib/metrics/business-workbench-summary';

const fact = (overrides: Partial<IntelligenceDailyFact> = {}): IntelligenceDailyFact => ({
  metric_date: '2026-10-25', spend: 100, impressions: 1000, clicks: 50, leads: 10, ...overrides,
});

test('daily timeline remains empty when no ad facts are returned', () => {
  assert.deepEqual(buildIntelligenceTimeline([]), []);
});

test('daily timeline groups each date once, sorts and sums fully observed measures', () => {
  assert.deepEqual(buildIntelligenceTimeline([
    fact({metric_date: '2026-10-26', spend: 0, impressions: 0, clicks: 0, leads: 0}),
    fact({metric_date: '2026-10-25', spend: 25, impressions: 200, clicks: 4, leads: 0.5}),
    fact({metric_date: '2026-10-25', spend: 50, impressions: 400, clicks: 6, leads: 0}),
  ]), [
    {date: '2026-10-25', spend: 75, impressions: 600, clicks: 10, leads: 0.5},
    {date: '2026-10-26', spend: 0, impressions: 0, clicks: 0, leads: 0},
  ]);
});

test('partial missing values invalidate only their daily metric and dependent ratio', () => {
  const [day] = buildIntelligenceTimeline([fact(), fact({spend: 50, leads: null, clicks: null})]);
  assert.deepEqual(day, {date: '2026-10-25', spend: 150, impressions: 2000, clicks: null, leads: null});
  assert.equal(getWorkbenchDayMetric(day, 'ctr'), null);
  assert.equal(getWorkbenchDayMetric(day, 'cpl'), null);
  assert.equal(getWorkbenchDayMetric(day, 'spend'), 150);
});

test('invalid and negative ad counts cannot cancel against valid observations', () => {
  const [day] = buildIntelligenceTimeline([fact(), fact({spend: -1, impressions: -100, clicks: NaN, leads: -2})]);
  assert.deepEqual(day, {date: '2026-10-25', spend: null, impressions: null, clicks: null, leads: null});
  assert.equal(getWorkbenchDayMetric(day, 'spend'), null);
});

test('nonfinite and overflowing spend are unavailable, not rendered as zero', () => {
  const [overflow] = buildIntelligenceTimeline([fact({spend: 1e308}), fact({spend: 1e308})]);
  assert.equal(overflow.spend, null);
  assert.equal(overflow.leads, 20);
  const [nonfinite] = buildIntelligenceTimeline([fact({spend: Infinity, leads: 0})]);
  assert.equal(nonfinite.spend, null);
  assert.equal(nonfinite.leads, 0);
  assert.equal(getWorkbenchDayMetric(nonfinite, 'cpl'), null);
});

test('missing or invalid measures on one date do not contaminate another date', () => {
  const result = buildIntelligenceTimeline([fact({leads: null}), fact({metric_date: '2026-10-26', leads: 0})]);
  assert.equal(result[0].leads, null);
  assert.equal(result[1].leads, 0);
});

test('the authenticated intelligence page uses strict daily aggregation for both periods', () => {
  const source = readFileSync('src/app/(tenant)/[organizationSlug]/intelligence/page.tsx', 'utf8');
  assert.match(source, /timeline=\{buildIntelligenceTimeline\(data\.ads\)\}/);
  assert.match(source, /priorTimeline=\{buildIntelligenceTimeline\(data\.adsComparison\)\}/);
  assert.doesNotMatch(source, /function dayShape/);
  assert.match(source, /dashboardData\(db,org\.id,f,/);
});
