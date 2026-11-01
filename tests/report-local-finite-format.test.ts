import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatReportObservation, formatReportChange} from '../src/lib/reports/format-observation';

test('local report formatters fail closed for missing, NaN and infinite observations and changes', () => {
  for (const invalid of [null, undefined, NaN, Infinity, -Infinity]) {
    assert.equal(formatReportObservation(invalid), '—');
    assert.equal(formatReportObservation(invalid, {currency: 'BRL', maximumFractionDigits: 6, scientificTiny: true}), '—');
    assert.equal(formatReportObservation(invalid, {suffix: '%'}), '—');
    assert.equal(formatReportChange(invalid), 'Variação indisponível');
  }
});

test('report display preserves genuine zero, signed amounts, currencies and locale', () => {
  assert.equal(formatReportObservation(0), '0');
  assert.equal(formatReportObservation(0, {suffix: '%'}), '0%');
  assert.match(formatReportObservation(0, {currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 6}), /0,00$/);
  assert.equal(formatReportObservation(1234.567, {maximumFractionDigits: 6}), '1.234,567');
  assert.match(formatReportObservation(-12.5, {currency: 'BRL'}), /-R\$\s*12,50$/u);
  assert.equal(formatReportChange(20), '+20%');
  assert.equal(formatReportChange(-20), '-20%');
  assert.equal(formatReportChange(0), '0%');
});

test('small measured values retain scientific notation only where the original report supported it', () => {
  assert.match(formatReportObservation(1e-8, {maximumFractionDigits: 6, scientificTiny: true}), /E-8$/i);
  assert.equal(formatReportObservation(0, {maximumFractionDigits: 6, scientificTiny: true}), '0');
  assert.equal(formatReportObservation(2.5, {maximumFractionDigits: 6, suffix: 'x'}), '2,5x');
  assert.equal(formatReportObservation(1e-8, {maximumFractionDigits: 6, scientificTiny: false}), '0');
});

test('executive, campaign, revenue and target report views use the finite local formatter', () => {
  const views = ['performance-report-view.tsx', 'campaign-report.tsx', 'revenue-report-view.tsx', 'target-references.tsx'];
  for (const filename of views) {
    const source = readFileSync(new URL('../src/components/dashboard/' + filename, import.meta.url), 'utf8');
    assert.match(source, /formatReportObservation\(/, filename);
    assert.match(source, /from '@\/lib\/reports\/format-observation'/, filename);
  }
});

test('real but tiny report changes remain distinguishable from observed zero', () => {
  for (const magnitude of [0.0049, 0.00001, 1e-8, Number.MIN_VALUE]) {
    const rising = formatReportChange(magnitude);
    const falling = formatReportChange(-magnitude);
    assert.match(rising, /^\+[\d,.]+E-\d+%$/u, String(magnitude));
    assert.match(falling, /^-[\d,.]+E-\d+%$/u, String(-magnitude));
    assert.notEqual(rising, '+0%');
    assert.notEqual(falling, '-0%');
  }
  // Values at the two-decimal rounding boundary retain their regular display.
  assert.equal(formatReportChange(0.005), '+0,01%');
  assert.equal(formatReportChange(-0.005), '-0,01%');
  assert.equal(formatReportChange(2.345), '+2,35%');
  assert.equal(formatReportChange(-0), '0%');
  assert.equal(formatReportChange(0), '0%');
});

test('invalid report currencies fail closed without changing observed values', () => {
  for (const currency of ['', 'brl', 'BR', 'BRLL', 'BRL ', ' BRL', 'B R', 'BRL\\n', '\\u0000BRL']) {
    assert.equal(formatReportObservation(123.45, {currency}), '—', JSON.stringify(currency));
    assert.equal(formatReportObservation(0, {currency, maximumFractionDigits: 6, scientificTiny: true}), '—', JSON.stringify(currency));
  }
  // Valid declared currencies, missing observations and nonmonetary values
  // keep their existing semantics; no conversion or fallback unit is invented.
  assert.match(formatReportObservation(123.45, {currency: 'BRL'}), /R\\$\\s*123,45$/u);
  assert.match(formatReportObservation(0, {currency: 'USD'}), /0,00$/u);
  assert.equal(formatReportObservation(null, {currency: 'BRL'}), '—');
  assert.equal(formatReportObservation(2.5, {suffix: 'x'}), '2,5x');
});
