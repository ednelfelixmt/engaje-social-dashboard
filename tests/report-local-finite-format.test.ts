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
