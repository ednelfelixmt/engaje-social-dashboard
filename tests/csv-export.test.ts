import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeCsv} from '../src/lib/export/csv';

test('quotes delimiters, quotes and multiline campaign names without changing values', () => {
  const csv = serializeCsv([['Campanha', 'Investimento'], ['Promo;"Teste"\nOutubro', 25.5]]);
  assert.equal(csv, '\ufeff"Campanha";"Investimento"\r\n"Promo;""Teste""\nOutubro";"25.5"');
});

test('prevents formula execution from untrusted string cells, including disguised prefixes', () => {
  const values = [
    '=HYPERLINK("https://example.invalid","click")',
    '+SUM(1,2)',
    '-1+2',
    '@SUM(1,2)',
    '  =1+1',
    '\t=1+1',
    '\r=1+1',
    '\n=1+1',
  ];
  const csv = serializeCsv(values.map(value => [value]));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines.length, values.length);
  for (let i = 0; i < values.length; i++) {
    assert.ok(lines[i].startsWith('"\''), 'formula-like text must begin with a literal apostrophe');
  }
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.invalid"",""click"")"'));
});

test('keeps trusted numeric values numeric, while omitting unknown and non-finite values', () => {
  assert.equal(
    serializeCsv([[-25, 0, 1.25, null, undefined, Number.NaN, Number.POSITIVE_INFINITY]]),
    '\ufeff"-25";"0";"1.25";"";"";"";""',
  );
});

test('preserves ordinary campaign names and accents', () => {
  assert.equal(serializeCsv([['Campanha Outubro', 'São Paulo', 'Meta Ads']]), '\ufeff"Campanha Outubro";"São Paulo";"Meta Ads"');
});

test('SEC-CSV-001: Unicode format and control prefixes cannot disguise spreadsheet formulas', () => {
  const values = [
    '\u0000=1+1', '\u001b+1+1', '\u007f@SUM(1,2)', '\u0085=1+1',
    '\u200b=1+1', '\u200e-1+2', '\u2066+1+2', '\ufeff@SUM(1,2)',
    ' \u200f=1+1', '\u00ad=1+1', '\u200bTexto comum',
  ];
  for (const value of values) {
    const expected = '\ufeff' + '"' + "'" + value.replaceAll('"', '""') + '"';
    assert.equal(serializeCsv([[value]]), expected, 'leading invisible text must be escaped');
  }
});

test('SEC-CSV-001: ordinary leading spaces, accents, formulas in the middle and numeric values remain intact', () => {
  assert.equal(
    serializeCsv([['  Campanha de Outubro', 'São Paulo', 'A+B', 'Promo = 1', -25, 0, 1.5]]),
    '\ufeff"  Campanha de Outubro";"São Paulo";"A+B";"Promo = 1";"-25";"0";"1.5"',
  );
});
