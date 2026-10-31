import test from 'node:test';
import assert from 'node:assert/strict';
import type {RankedPerformance} from '../src/lib/metrics/rankings';
import {rankingBarWidth, rankingCtr, rankingObservedMaximum, rankPerformanceRows} from '../src/lib/metrics/ranking-display';

function row(key: string, spend: number, clicks: number | null, impressions: number | null = 800): RankedPerformance {
  return {key, label: key, spend, leads: null, clicks, impressions, purchases: null, revenue: null};
}

test('audience spend under one real maps maximum to 100% and half to 50%', () => {
  const rows = [row('top', 0.25, 8), row('half', 0.125, 4)];
  const before = JSON.stringify(rows);
  const eligible = rankPerformanceRows(rows, 'spend');
  const maximum = rankingObservedMaximum(eligible.map(item => item.spend));
  assert.equal(maximum, 0.25);
  assert.deepEqual(eligible.map(item => rankingBarWidth(item.spend, maximum)), [100, 50]);
  assert.equal(JSON.stringify(rows), before, 'ranking projections must not mutate source records');
});

test('audience CTR under one percent uses observed peak, without converting zero to a colored bar', () => {
  const rows = [row('top', 0.25, 2), row('half', 0.125, 1), row('zero', 0, 0), row('unknown', 0, 4, null)];
  const eligible = rankPerformanceRows(rows, 'ctr');
  const values = eligible.map(item => rankingCtr(item));
  assert.deepEqual(values, [0.25, 0.125, 0]);
  const maximum = rankingObservedMaximum(values);
  assert.equal(maximum, 0.25);
  assert.deepEqual(values.map(value => rankingBarWidth(value ?? 0, maximum)), [100, 50, 0]);
});

test('all zero measurements have a zero maximum and render no positive bars', () => {
  const observations = [0, 0, null, undefined];
  const maximum = rankingObservedMaximum(observations);
  assert.equal(maximum, 0);
  assert.equal(rankingBarWidth(0, maximum), 0);
  assert.equal(rankingObservedMaximum([]), 0);
});

test('missing, negative and non-finite measurements cannot distort observed fractional scale', () => {
  const observations = [Number.NaN, Number.POSITIVE_INFINITY, -2, null, undefined, 0.0001, 0];
  const original = [...observations];
  const maximum = rankingObservedMaximum(observations);
  assert.equal(maximum, 0.0001);
  assert.equal(rankingBarWidth(0.0001, maximum), 100);
  assert.equal(rankingBarWidth(0, maximum), 0);
  assert.deepEqual(observations, original);
});
