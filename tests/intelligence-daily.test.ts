import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIntelligenceTimeline as buildScopedIntelligenceTimeline, type IntelligenceDailyFact} from '../src/lib/metrics/intelligence-daily';
import {getWorkbenchDayMetric} from '../src/lib/metrics/business-workbench-summary';

const organizationId = '11111111-1111-4111-8111-111111111111';
const otherOrganizationId = '22222222-2222-4222-8222-222222222222';
const currency = 'BRL';
const buildIntelligenceTimeline = (rows: readonly IntelligenceDailyFact[]) =>
  buildScopedIntelligenceTimeline(rows, organizationId, currency);

const fact = (overrides: Partial<IntelligenceDailyFact> = {}): IntelligenceDailyFact => ({
  organization_id: organizationId, currency,
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
  assert.match(source, /timeline=\{buildIntelligenceTimeline\(data\.ads,org\.id,f\.currency\)\}/);
  assert.match(source, /priorTimeline=\{buildIntelligenceTimeline\(data\.adsComparison,org\.id,f\.currency\)\}/);
  assert.doesNotMatch(source, /function dayShape/);
  assert.match(source, /dashboardData\(db,org\.id,f,/);
});

test('SEC-INT-DAY-001: foreign tenant is rejected even on another date or when all measurements are zero', () => {
  const foreign = fact({organization_id: otherOrganizationId, metric_date: '2026-10-26',
    spend: 0, impressions: 0, clicks: 0, leads: 0});
  assert.throws(() => buildScopedIntelligenceTimeline([fact(), foreign], organizationId, currency), /authorized organization/);
  assert.throws(() => buildScopedIntelligenceTimeline([foreign], organizationId, currency), /authorized organization/);
});

test('SEC-INT-DAY-001: any incompatible or missing currency invalidates the entire timeline', () => {
  for (const invalidCurrency of ['USD', '', 'brl']) {
    const foreignCurrency = fact({currency: invalidCurrency, metric_date: '2026-10-26', spend: 0});
    assert.throws(() => buildScopedIntelligenceTimeline([fact(), foreignCurrency], organizationId, currency),
      /authorized organization and currency/);
  }
  assert.equal(buildScopedIntelligenceTimeline([fact({spend: 0})], organizationId, currency)[0].spend, 0);
});

test('SEC-INT-DAY-001: empty data never bypasses invalid authorization or currency', () => {
  for (const invalidOrg of ['', 'not-a-uuid', otherOrganizationId.slice(0, 12)]) {
    assert.throws(() => buildScopedIntelligenceTimeline([], invalidOrg, currency), /authorized organization/);
  }
  for (const invalidCurrency of ['', 'usd', 'UNKNOWN']) {
    assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, invalidCurrency), /authorized organization/);
  }
  assert.deepEqual(buildScopedIntelligenceTimeline([], organizationId, currency), []);
});
