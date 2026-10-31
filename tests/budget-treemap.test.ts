import test from 'node:test';
import assert from 'node:assert/strict';
import {projectBudgetTreemap} from '../src/lib/reports/budget-treemap';

const row = (id: string, spend: number) => ({id, spend});

test('treemap sorts observed fractional spend and derives shares from all eligible campaigns', () => {
  const source = [row('half', 0.125), row('zero', 0), row('top', 0.25)];
  const original = structuredClone(source);
  const result = projectBudgetTreemap(source);
  assert.equal(result.status, 'ready');
  assert.equal(result.total, 0.375);
  assert.deepEqual(result.items.map(item => item.id), ['top', 'half']);
  assert.equal(result.items[0].spend / result.total! * 100, 0.25 / 0.375 * 100);
  assert.deepEqual(source, original, 'sorting and projection must not mutate source');
});

test('measured zero stays eligible but has no treemap tile or manufactured spend', () => {
  const result = projectBudgetTreemap([row('a', 0), row('b', 0)]);
  assert.equal(result.status, 'empty');
  assert.equal(result.total, 0);
  assert.equal(result.invalidCount, 0);
  assert.deepEqual(result.items, []);
});

test('missing, negative and non-finite spend must fail closed, never yield partial percentages', () => {
  for (const spend of [NaN, Infinity, -Infinity, -0.01, null as unknown as number, undefined as unknown as number]) {
    const source = [row('valid', 5), row('invalid', spend)];
    const result = projectBudgetTreemap(source);
    assert.equal(result.status, 'invalid', String(spend));
    assert.equal(result.invalidCount, 1, String(spend));
    assert.equal(result.total, null);
    assert.deepEqual(result.items, []);
  }
});

test('sum overflow from individually finite measurements must fail closed', () => {
  const result = projectBudgetTreemap([row('a', 1e308), row('b', 1e308)]);
  assert.equal(result.status, 'overflow');
  assert.equal(result.total, null);
  assert.deepEqual(result.items, []);
});

test('treemap top twelve retains full valid spend denominator', () => {
  const source = Array.from({length: 13}, (_, index) => row(String(index), 1));
  const result = projectBudgetTreemap(source);
  assert.equal(result.status, 'ready');
  assert.equal(result.items.length, 13);
  assert.equal(result.total, 13);
  assert.equal(result.items.slice(0, 12).length, 12);
  assert.equal(result.items[0].spend / result.total!, 1 / 13);
});
