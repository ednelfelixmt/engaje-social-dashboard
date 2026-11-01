import test from 'node:test';
import assert from 'node:assert/strict';
import {money, number} from '../src/lib/utils';

test('shared metric formatters mark missing and non-finite observations as unavailable', () => {
  const missing: Array<number | null | undefined> = [
    null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  ];
  for (const observation of missing) {
    assert.equal(number(observation), '—');
    assert.equal(number(observation, 2), '—');
    assert.equal(money(observation, 'BRL'), '—');
    assert.equal(money(observation, 'USD'), '—');
  }
});

test('shared formatters preserve observed zero rather than turning it into missing data', () => {
  assert.equal(number(0), '0');
  assert.equal(number(0, 2), '0');
  assert.match(money(0, 'BRL'), /0,00$/);
  assert.notEqual(number(0), number(null));
  assert.notEqual(money(0), money(undefined));
});

test('shared formatters retain locale, precision, currency and signed finite observations', () => {
  assert.equal(number(1234.567, 2), '1.234,57');
  assert.equal(number(-1234.5, 1), '-1.234,5');
  assert.match(money(1234.5, 'BRL'), /R\$\s*1\.234,50$/u);
  assert.match(money(-12.5, 'BRL'), /-R\$\s*12,50$/u);
});

test('shared metric formatters reject invalid display options without crashing dashboard cards', () => {
  // Before this regression, Intl.NumberFormat threw RangeError for these
  // configuration values, taking down any KPI card that rendered them.
  for (const digits of [-1, 1.5, 101, NaN, Infinity, -Infinity]) {
    assert.equal(number(123.456, digits), '—', String(digits));
    assert.equal(number(0, digits), '—', String(digits));
  }
  for (const currency of ['', 'BR', 'brl', 'BRLL', ' BRL', 'BRL ', 'BRL\n', '\u0000BRL']) {
    assert.equal(money(42.5, currency), '—', JSON.stringify(currency));
    assert.equal(money(0, currency), '—', JSON.stringify(currency));
  }

  // Genuine observations and normal pt-BR rendering still work.
  assert.equal(number(1234.567, 0), '1.235');
  assert.equal(number(1234.567, 2), '1.234,57');
  assert.equal(number(0, 100), '0');
  assert.match(money(0, 'USD'), /0,00$/u);
  assert.match(money(42.5, 'BRL'), /R\$\s*42,50$/u);
});

test('shared formatter normalizes only negative zero on display', () => {
  assert.equal(number(-0), '0');
  assert.equal(number(-0, 2), '0');
  assert.equal(money(-0, 'BRL'), money(0, 'BRL'));
  assert.equal(number(-1.25, 2), '-1,25');
  assert.match(money(-1.25, 'BRL'), /-R\$\s*1,25$/u);
});
