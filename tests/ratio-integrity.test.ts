import test from 'node:test';
import assert from 'node:assert/strict';
import {finiteRatio, totals} from '../src/lib/metrics/aggregation';
import {paidMetric, paidTotals} from '../src/lib/metrics/paid-metrics';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';

// All observations and identities in this test are synthetic.
function campaign(metricValues: Record<string, number | null>): CampaignPerformance {
  return {
    organizationId: 'synthetic-tenant-039',
    currency: 'BRL',
    impressions: metricValues.impressions ?? 0,
    metricValues,
  } as CampaignPerformance;
}

test('shared ratio never reports a measured nonzero numerator as zero', () => {
  const tiny = Number.MIN_VALUE;
  assert.equal(finiteRatio(tiny, 1e308), null);
  assert.equal(finiteRatio(-tiny, 1e308), null); // signed refunds are also unknown at underflow
  assert.equal(finiteRatio(0, 1e308), 0);
  assert.equal(finiteRatio(tiny, 0), null);
  assert.equal(finiteRatio(1e308, 1e-308), null);
});

test('percentage and CPM scaling recovers representable subnormal ratios', () => {
  const tiny = Number.MIN_VALUE;
  assert.equal(finiteRatio(tiny, 100, 1000), 5e-323);
  assert.equal(finiteRatio(-tiny, 100, 1000), -5e-323);
  assert.equal(finiteRatio(tiny, 100, 100), tiny);
  assert.equal(finiteRatio(tiny, 1e308, 1000), null); // still unrepresentable
  assert.equal(finiteRatio(1e308, 1e308, 1000), 1000); // scaling first would overflow
  assert.equal(finiteRatio(2, 3, 100), 2 / 3 * 100); // normal-path rounding stays stable
});

test('paid KPI cards and aggregated charts distinguish true zero from underflow', () => {
  const tiny = Number.MIN_VALUE;
  const fact = {spend: tiny, impressions: 1e308, clicks: 1e308, leads: 1e308};
  assert.equal(paidMetric(fact, 'cpc'), null);
  assert.equal(paidMetric(fact, 'cpm'), null);
  assert.equal(paidMetric(fact, 'cpl'), null);
  const summary = paidTotals([fact]);
  assert.equal(summary.cpc, null);
  assert.equal(summary.cpm, null);
  assert.equal(summary.cpl, null);
  assert.equal(paidMetric({spend: tiny, impressions: 100, clicks: tiny, leads: 1}, 'ctr'), tiny);
  assert.equal(paidMetric({spend: tiny, impressions: 100, clicks: 1, leads: 1}, 'cpm'), 5e-323);
  assert.equal(paidMetric({spend: 0, impressions: 100, clicks: 1, leads: 1}, 'cpl'), 0);
  assert.equal(paidMetric({spend: 10, impressions: 100, clicks: -1, leads: 1}, 'ctr'), null);
});

test('campaign-level summary preserves refunds and does not manufacture zero CPL/CPM', () => {
  const tiny = Number.MIN_VALUE;
  const result = paidSummary([campaign({
    spend: tiny, revenue: -tiny, impressions: 1e308, clicks: 1e308, leads: 1e308,
  })]);
  assert.equal(result.cpl, null);
  assert.equal(result.cpc, null);
  assert.equal(result.cpm, null);
  assert.equal(result.roas, -1); // negative revenue is a real refund, not invalid
  const smallCpm = paidSummary([campaign({spend: tiny, impressions: 100, clicks: 1, leads: 1})]);
  assert.equal(smallCpm.cpm, 5e-323);
  const zero = paidSummary([campaign({spend: 0, revenue: 0, impressions: 100, clicks: 1, leads: 1})]);
  assert.equal(zero.cpl, 0);
  assert.equal(zero.cpm, 0);
  assert.equal(zero.roas, null); // zero denominator remains unavailable
});

test('generic aggregate CPA and signed ROAS inherit the same fail-closed rule', () => {
  const tiny = Number.MIN_VALUE;
  const result = totals([{spend: tiny, purchases: 1e308, revenue: -tiny}]);
  assert.equal(result.cpa, null);
  assert.equal(result.roas, -1);
  assert.equal(result.roi, null);
  assert.equal(totals([{spend: 0, purchases: 2, revenue: 0}]).cpa, 0);
});
