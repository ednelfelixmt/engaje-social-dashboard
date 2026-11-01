import test from 'node:test';
import assert from 'node:assert/strict';
import type {RankedPerformance} from '../src/lib/metrics/rankings';
import {rankPerformanceRows, rankingBarWidth, rankingCtr, rankingResultMetric, rankingUnitCost} from '../src/lib/metrics/ranking-display';

function row(key: string, spend: number, leads: number | null, clicks: number | null = 0, impressions: number | null = 100): RankedPerformance {
  return {key, label: key, spend, leads, clicks, impressions, purchases: null, revenue: null};
}

test('efficiency ranks only observed positive results, retaining legitimate zero spend', () => {
  const records = [row('no-leads', 100, 0), row('paid', 25, 5), row('free', 0, 1), row('unknown', 10, null)];
  const before = JSON.stringify(records);
  assert.deepEqual(rankingResultMetric(records), {key: 'leads', label: 'leads'});
  assert.deepEqual(rankPerformanceRows(records, 'efficiency').map(item => item.key), ['free', 'paid']);
  assert.deepEqual(rankPerformanceRows(records, 'results').map(item => item.key), ['paid', 'free', 'no-leads']);
  assert.deepEqual(rankPerformanceRows(records, 'spend').map(item => item.key), ['no-leads', 'paid', 'unknown', 'free']);
  assert.equal(JSON.stringify(records), before, 'projection must not mutate source rows');
});

test('without positive purchases or leads, missing clicks cannot become observed zero results', () => {
  const records = [row('missing', 10, null, null), row('observed-zero', 20, 0, 0)];
  assert.deepEqual(rankingResultMetric(records), {key: 'clicks', label: 'cliques'});
  assert.deepEqual(rankPerformanceRows(records, 'efficiency'), []);
  assert.deepEqual(rankPerformanceRows(records, 'results').map(item => item.key), ['observed-zero']);
});

test('CTR and cost per result require valid finite observations', () => {
  assert.equal(rankingCtr(row('zero-clicks', 5, 0, 0)), 0);
  assert.equal(rankingCtr(row('unknown-impressions', 5, 0, 5, null)), null);
  assert.equal(rankingCtr(row('zero-impressions', 5, 0, 5, 0)), null);
  assert.equal(rankingCtr(row('negative-clicks', 5, 0, -1)), null);
  assert.equal(rankingCtr(row('overflow', 5, 0, 1e308, 1e-308)), null);
  assert.equal(rankingUnitCost(0, 4), 0);
  assert.equal(rankingUnitCost(20, 4), 5);
  assert.equal(rankingUnitCost(20, 0), null);
  assert.equal(rankingUnitCost(20, null), null);
  assert.equal(rankingUnitCost(1e308, 1e-308), null);
  assert.equal(rankingUnitCost(1e-308, 1e308), null);
});

test('zero CTR remains visible in sorting, but invalid CTR is excluded', () => {
  const zero = row('observed-zero', 5, 0, 0);
  const valid = row('observed-positive', 5, 0, 15);
  const invalid = row('invalid', 5, 0, 5, null);
  assert.deepEqual(rankPerformanceRows([zero, invalid, valid], 'ctr').map(item => item.key), ['observed-positive', 'observed-zero']);
});

test('audience bar widths represent measured zero as zero and clamp positive values', () => {
  assert.equal(rankingBarWidth(0, 100), 0);
  assert.equal(rankingBarWidth(0, 0), 0);
  assert.equal(rankingBarWidth(Number.NaN, 100), 0);
  assert.equal(rankingBarWidth(1, 1000), 3);
  assert.equal(rankingBarWidth(10, 100), 10);
  assert.equal(rankingBarWidth(150, 100), 100);
});

test('RANKING-CTR-UNDERFLOW-001: measured positive CTR cannot silently become zero', () => {
  // Synthetic extreme magnitudes exercise the arithmetic boundary without
  // connecting to a provider or making claims about real account data.
  const tiny = row('tiny-observation', 1, null, 1e-310, 1e15);
  const observedZero = row('zero-observation', 1, null, 0, 1e15);
  assert.equal(tiny.clicks! / tiny.impressions! * 100, 0, 'old evaluation order underflows');
  assert.equal(rankingCtr(tiny), 1e-323);
  assert.equal(rankingCtr(observedZero), 0);
  assert.deepEqual(rankPerformanceRows([observedZero, tiny], 'ctr').map(item => item.key),
    ['tiny-observation', 'zero-observation']);
  assert.equal(rankingCtr(row('unrepresentable', 1, null, 1e-310, 1e100)), null);
});

test('RANKING-CTR-UNDERFLOW-001: valid ordinary CTR is unchanged and invalid source remains unavailable', () => {
  const original = row('regular', 50, 3, 25, 100);
  const snapshot = JSON.stringify(original);
  assert.equal(rankingCtr(original), 25);
  assert.equal(rankingCtr(row('missing', 5, null, null, 100)), null);
  assert.equal(rankingCtr(row('negative', 5, null, -1, 100)), null);
  assert.equal(rankingCtr(row('impossible', 5, null, 5, 0)), null);
  assert.equal(rankingCtr(row('infinite', 5, null, Infinity, 100)), null);
  assert.equal(JSON.stringify(original), snapshot, 'source facts are not mutated');
});
