import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {campaignCpl} from '../src/lib/metrics/efficiency';

test('single-campaign CPL preserves valid zero, fractional attribution and finite ratios', () => {
  assert.equal(campaignCpl(100, 4), 25);
  assert.equal(campaignCpl(0, 0.25), 0);
  assert.equal(campaignCpl(5, 0.5), 10);
  assert.equal(campaignCpl(1e308, 1e308), 1);
});

test('invalid spend, events and denominators cannot become chart coordinates or ranking candidates', () => {
  for (const [spend, leads] of [
    [null, 3], [5, null], [undefined, 2], [5, undefined],
    [-1, 5], [5, 0], [0, 0], [5, -2],
    [NaN, 5], [Infinity, 5], [5, Infinity], [5, NaN],
    [-Infinity, 5], [5, -Infinity],
  ] as Array<[number | null | undefined, number | null | undefined]>) {
    assert.equal(campaignCpl(spend, leads), null, String(spend) + '/' + String(leads));
  }
});

test('overflow and positive division underflow never yield Infinity or a fabricated zero CPL', () => {
  assert.equal(campaignCpl(1e308, 1e-308), null);
  assert.equal(campaignCpl(Number.MIN_VALUE, 1e308), null);
  assert.equal(campaignCpl(Number.MIN_VALUE, 1), Number.MIN_VALUE);
});

test('active executive and platform views reuse the validated CPL for scatter and best campaign', () => {
  const executive = readFileSync(new URL('../src/components/dashboard/executive-overview-v2.tsx', import.meta.url), 'utf8');
  const platform = readFileSync(new URL('../src/components/dashboard/platform-analytics-v3.tsx', import.meta.url), 'utf8');
  assert.match(executive, /const scatter=campaigns\.flatMap\(r=>\{const cpl=campaignCpl\(r\.spend,r\.leads\)/);
  assert.match(executive, /const best=\[\.\.\.scatter\]\.sort/);
  assert.match(executive, /money\(best\.cpl,currency\)/);
  assert.doesNotMatch(executive, /spend\/Number\(r\.leads\)|spend\/Number\(a\.leads\)|spend\/Number\(best\.leads\)/);
  assert.match(platform, /const scatter=rows\.flatMap\(r=>\{const cpl=campaignCpl\(r\.spend,r\.leads\)/);
  assert.doesNotMatch(platform, /r\.spend\/r\.leads/);
});
