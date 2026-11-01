import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWeightedMetric, mergeWeightedMetrics, paidWeightedMetrics} from '../src/lib/metrics/weighted-metrics';
import {campaigns} from '../src/lib/metrics/campaigns';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {Row} from '../src/types/database.types';

const ad = (overrides: Partial<Row<'metrics_ads'>> = {}): Row<'metrics_ads'> => ({
  organization_id: '11111111-1111-4111-8111-111111111111', platform: 'google_ads', account_id: 'synthetic-account',
  campaign_id: 'synthetic-campaign', campaign_name: 'Synthetic', metric_date: '2026-10-01', currency: 'BRL',
  spend: 10, revenue: null, purchases: null, impressions: 100, quality_score: 8,
  ...overrides,
} as Row<'metrics_ads'>);

test('weighted coverage distinguishes observed zero, missing values and invalid weights', () => {
  const result = summarizeWeightedMetric([
    {value: 0, weight: 100}, {value: 8, weight: 300}, {value: null, weight: 200},
    {value: NaN, weight: 100}, {value: 5, weight: 0}, {value: 6, weight: null},
    {value: 6, weight: -1}, {value: 7, weight: Infinity},
  ]);
  assert.equal(result.value, 6); assert.equal(result.rows, 8); assert.equal(result.includedRows, 2);
  assert.equal(result.missingValues, 2); assert.equal(result.invalidWeights, 4);
  assert.equal(result.weight, 400); assert.equal(result.status, 'partial');
});

test('empty and wholly unusable inputs cannot claim complete coverage', () => {
  for (const observations of [[], [{value: null, weight: 100}], [{value: 7, weight: 0}]]) {
    const result = summarizeWeightedMetric(observations);
    assert.equal(result.value, null); assert.equal(result.status, 'unavailable');
  }
});

test('numeric overflow remains unavailable after merging with ordinary campaigns', () => {
  const overflow = summarizeWeightedMetric([{value: 1e308, weight: 1e308}]);
  const merged = mergeWeightedMetrics([overflow, summarizeWeightedMetric([{value: 5, weight: 100}])]);
  assert.equal(overflow.value, null); assert.equal(merged.value, null); assert.equal(merged.overflow, true);
  assert.ok(Number.isFinite(merged.weight)); assert.ok(Number.isFinite(merged.weightedTotal));
});

test('combined finite statistics that overflow do not become a partial estimate', () => {
  const finite = summarizeWeightedMetric([{value: 1, weight: 1e308}]);
  const result = mergeWeightedMetrics([finite, finite]);
  assert.equal(result.value, null); assert.equal(result.overflow, true);
});

test('campaign scores across dates are weighted instead of summed', () => {
  const result = campaigns([ad({quality_score: 8, impressions: 75}), ad({metric_date: '2026-10-02', quality_score: 4, impressions: 25})], [], 'crm');
  assert.equal(result[0].metricValues.quality_score, 7);
  assert.equal(result[0].weightedMetrics?.quality_score.status, 'complete');
  assert.equal(paidSummary(result).quality_score, 7);
});

test('dashboard preserves original weights and excluded days across campaign groups', () => {
  const result = campaigns([
    ad({quality_score: 8, impressions: 100}),
    ad({metric_date: '2026-10-02', quality_score: null, impressions: 900}),
    ad({campaign_id: 'other', quality_score: 4, impressions: 100}),
  ], [], 'crm');
  const coverage = paidWeightedMetrics(result).quality_score;
  assert.equal(paidSummary(result).quality_score, 6); // not 7.636 from reweighting by all campaign impressions
  assert.equal(coverage.rows, 3); assert.equal(coverage.includedRows, 2);
  assert.equal(coverage.missingValues, 1); assert.equal(coverage.weight, 200); assert.equal(coverage.status, 'partial');
});

test('each non-additive metric retains its own coverage and weight', () => {
  const result = campaigns([
    ad({search_impression_share: 20, quality_score: 8, impressions: 100}),
    ad({metric_date: '2026-10-02', search_impression_share: 60, quality_score: null, impressions: 300}),
  ], [], 'crm');
  const weighted = paidWeightedMetrics(result);
  assert.equal(weighted.search_impression_share.value, 50);
  assert.equal(weighted.search_impression_share.status, 'complete');
  assert.equal(weighted.quality_score.value, 8); assert.equal(weighted.quality_score.status, 'partial');
  assert.equal(weighted.search_top_impression_share.value, null);
});

test('original statistics remain authoritative when total campaign impressions are unknown', () => {
  const result = campaigns([ad(), ad({metric_date: '2026-10-02', impressions: null, quality_score: 2})], [], 'crm');
  assert.equal(result[0].impressions, null);
  const weighted = paidWeightedMetrics(result).quality_score;
  assert.equal(weighted.value, 8); assert.equal(weighted.invalidWeights, 1);
});

test('legacy campaign callers retain one-observation coverage without fabricated provenance', () => {
  const coverage = paidWeightedMetrics([{impressions: 100, metricValues: {quality_score: 8}}, {impressions: null, metricValues: {quality_score: 2}}]).quality_score;
  assert.equal(coverage.value, 8); assert.equal(coverage.rows, 2);
  assert.equal(coverage.includedRows, 1); assert.equal(coverage.invalidWeights, 1);
});

test('provider values outside documented ranges cannot inflate weighted campaign KPIs', () => {
  const performance = campaigns([
    ad({search_impression_share: -1, quality_score: 11, impressions: 100}),
    ad({metric_date: '2026-10-02', search_impression_share: 25, quality_score: 8, impressions: 100}),
    ad({metric_date: '2026-10-03', search_impression_share: 101, quality_score: -2, impressions: 100}),
  ], [], 'crm');
  const summary = paidWeightedMetrics(performance);
  assert.equal(performance[0].metricValues.search_impression_share, 25);
  assert.equal(performance[0].metricValues.quality_score, 8);
  assert.equal(summary.search_impression_share.value, 25);
  assert.equal(summary.search_impression_share.missingValues, 2);
  assert.equal(summary.search_impression_share.includedRows, 1);
  assert.equal(summary.search_impression_share.status, 'partial');
  assert.equal(summary.quality_score.value, 8);
  assert.equal(summary.quality_score.missingValues, 2);
  assert.equal(summary.quality_score.status, 'partial');
});

test('weighted values at provider boundaries remain observed, including zero', () => {
  const performance = campaigns([
    ad({search_impression_share: 0, quality_score: 0, impressions: 100}),
    ad({metric_date: '2026-10-02', search_impression_share: 100, quality_score: 10, impressions: 100}),
  ], [], 'crm');
  const weighted = paidWeightedMetrics(performance);
  assert.equal(weighted.search_impression_share.value, 50);
  assert.equal(weighted.quality_score.value, 5);
  assert.equal(weighted.search_impression_share.status, 'complete');
  assert.equal(weighted.quality_score.status, 'complete');
});

test('legacy weighted fallback also excludes invalid provider values', () => {
  const summary = paidWeightedMetrics([
    {impressions: 100, metricValues: {search_impression_share: 250, quality_score: -1}},
    {impressions: 100, metricValues: {search_impression_share: 0, quality_score: 10}},
  ]);
  assert.equal(summary.search_impression_share.value, 0);
  assert.equal(summary.search_impression_share.missingValues, 1);
  assert.equal(summary.search_impression_share.status, 'partial');
  assert.equal(summary.quality_score.value, 10);
  assert.equal(summary.quality_score.missingValues, 1);
  assert.equal(summary.quality_score.status, 'partial');
});


test('WEIGHTED-PRECISION-LOSS-001: underflowed nonzero contribution is unavailable, not an observed zero', () => {
  // Synthetic fractional weight probes the IEEE-754 multiplication boundary.
  const tiny = summarizeWeightedMetric([{value: Number.MIN_VALUE, weight: 0.5}], {min: 0, max: 100});
  assert.equal(Number.MIN_VALUE * 0.5, 0, 'unprotected multiplication loses the positive source value');
  assert.equal(tiny.value, null);
  assert.equal(tiny.status, 'unavailable');
  assert.equal(tiny.precisionLoss, true);
  assert.equal(tiny.overflow, false);
  assert.equal(tiny.includedRows, 1);
  const actualZero = summarizeWeightedMetric([{value: 0, weight: 0.5}], {min: 0, max: 100});
  assert.equal(actualZero.value, 0);
  assert.equal(actualZero.status, 'complete');
  assert.equal(actualZero.precisionLoss, false);
});

test('WEIGHTED-PRECISION-LOSS-001: division underflow and merged statistics never fabricate zero', () => {
  // Each valid observation is individually representable. The combined mean is not.
  const tiny = summarizeWeightedMetric([{value: Number.MIN_VALUE, weight: 1}]);
  const zero = summarizeWeightedMetric([{value: 0, weight: 1e308}]);
  const before = JSON.stringify([tiny, zero]);
  const result = mergeWeightedMetrics([tiny, zero]);
  assert.equal(result.weightedTotal, Number.MIN_VALUE);
  assert.equal(result.value, null);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.precisionLoss, true);
  assert.equal(result.overflow, false);
  assert.equal(JSON.stringify([tiny, zero]), before, 'source summaries must remain immutable');
  const mixed = mergeWeightedMetrics([summarizeWeightedMetric([{value: Number.MIN_VALUE, weight: 0.5}]), zero]);
  assert.equal(mixed.precisionLoss, true, 'precision loss propagates across aggregation levels');
  assert.equal(mixed.value, null);
  const ordinary = mergeWeightedMetrics([summarizeWeightedMetric([{value: 8, weight: 100}]), summarizeWeightedMetric([{value: 4, weight: 100}])]);
  assert.equal(ordinary.value, 6);
  assert.equal(ordinary.precisionLoss, false);
});
