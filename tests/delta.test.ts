import test from 'node:test';
import assert from 'node:assert/strict';
import {computeDelta, lowerIsBetter} from '../src/lib/metrics/delta';

test('computeDelta calcula a variação e classifica se foi boa ou ruim', () => {
  assert.deepEqual(computeDelta(120, 100, 'spend'), {change: 20, good: null});
  assert.deepEqual(computeDelta(80, 100, 'clicks'), {change: -20, good: false});
  // custo menor é melhor
  assert.deepEqual(computeDelta(8, 10, 'cpl'), {change: -20, good: true});
  assert.deepEqual(computeDelta(12, 10, 'cost_per_message'), {change: 20, good: false});
  // frequência e variação zero são neutras
  assert.equal(computeDelta(2, 1, 'frequency')?.good, null);
  assert.deepEqual(computeDelta(5, 5, 'spend'), {change: 0, good: null});
});

test('computeDelta não inventa variação sem base de comparação', () => {
  assert.equal(computeDelta(10, null, 'spend'), null);
  assert.equal(computeDelta(null, 10, 'spend'), null);
  assert.equal(computeDelta(10, 0, 'spend'), null);
  assert.equal(computeDelta(Number.NaN, 10, 'spend'), null);
  assert.equal(computeDelta(undefined, undefined), null);
});

test('lowerIsBetter reconhece custos', () => {
  for (const metric of ['cpa', 'cpm', 'cpc', 'cpl', 'cost_per_registration']) assert.ok(lowerIsBetter(metric), metric);
  for (const metric of ['spend', 'roas', 'ctr', 'leads']) assert.ok(!lowerIsBetter(metric), metric);
});


test('computeDelta fails closed on unrepresentable percent changes', () => {
  assert.equal(computeDelta(1e308, 1e-308, 'spend'), null);
  assert.equal(computeDelta(-1e308, 1e-308, 'cpl'), null);
});

test('computeDelta preserves finite changes when subtraction overflows', () => {
  assert.deepEqual(computeDelta(1e308, -1e308, 'spend'), {change: 200, good: null});
  assert.deepEqual(computeDelta(-1e308, 1e308, 'cpl'), {change: -200, good: true});
  assert.deepEqual(computeDelta(1e308, 1e308, 'spend'), {change: 0, good: null});
});


test('budget changes and flat performance are neutral; efficiency costs remain directional', () => {
  assert.deepEqual(computeDelta(80, 100, 'spend'), {change: -20, good: null});
  assert.deepEqual(computeDelta(100, 100, 'cpl'), {change: 0, good: null});
  assert.deepEqual(computeDelta(8, 10, 'cost_per_registration'), {change: -20, good: true});
  assert.deepEqual(computeDelta(12, 10, 'cpl'), {change: 20, good: false});
});
