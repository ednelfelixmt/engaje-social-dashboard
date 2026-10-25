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
