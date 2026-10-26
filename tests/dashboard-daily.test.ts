import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dashboardPaidDays, type PaidDailyRecord} from '../src/lib/metrics/dashboard-daily';

function row(date: string, values: Partial<PaidDailyRecord> = {}): PaidDailyRecord {
  return {metric_date: date, currency: 'BRL', spend: 10, revenue: 20, impressions: 100, clicks: 10, leads: 1, ...values};
}

test('daily totals preserve observed zero, signed refunds, chronological order and input order', () => {
  const records = [
    row('2026-10-26', {spend: 0, revenue: -30, impressions: 0, clicks: 0, leads: 0}),
    row('2026-10-25'),
    row('2026-10-26', {spend: 10, revenue: 20, impressions: 100, clicks: 10, leads: 1}),
  ];
  const result = dashboardPaidDays(records, 'BRL');
  assert.deepEqual(result, [
    {date: '2026-10-25', spend: 10, revenue: 20, impressions: 100, clicks: 10, leads: 1},
    {date: '2026-10-26', spend: 10, revenue: -10, impressions: 100, clicks: 10, leads: 1},
  ]);
  assert.equal(records[0].metric_date, '2026-10-26');
  assert.deepEqual(dashboardPaidDays([], 'BRL'), []);
});

test('missing observation invalidates only that daily metric, never yielding a partial total', () => {
  const result = dashboardPaidDays([
    row('2026-10-26', {spend: 100, leads: 7, revenue: null}),
    row('2026-10-26', {spend: 20, leads: null, revenue: 50}),
  ], 'BRL');
  assert.deepEqual(result, [
    {date: '2026-10-26', spend: 120, revenue: null, impressions: 200, clicks: 20, leads: null},
  ]);
});

test('negative, nonfinite and overflowing observations never masquerade as valid daily metrics', () => {
  const result = dashboardPaidDays([
    row('2026-10-26', {spend: 1e308, impressions: 1e308, clicks: 10, leads: Number.NaN, revenue: 1e308}),
    row('2026-10-26', {spend: 1e308, impressions: 1e308, clicks: -2, leads: 3, revenue: 1e308}),
  ], 'BRL');
  assert.deepEqual(result, [
    {date: '2026-10-26', spend: null, revenue: null, impressions: null, clicks: null, leads: null},
  ]);
  assert.equal(dashboardPaidDays([row('2026-10-26', {spend: -1, revenue: -15, clicks: Infinity})], 'BRL')[0].revenue, -15);
});

test('a foreign or unknown currency blocks money across all days, but preserves counts', () => {
  const rows = [row('2026-10-25'), row('2026-10-26', {currency: 'USD'})];
  const result = dashboardPaidDays(rows, 'BRL');
  assert.deepEqual(result.map(day => ({spend: day.spend, revenue: day.revenue, clicks: day.clicks})), [
    {spend: null, revenue: null, clicks: 10},
    {spend: null, revenue: null, clicks: 10},
  ]);
  assert.equal(dashboardPaidDays([row('2026-10-26')], 'UNKNOWN')[0].spend, null);
});

test('production dashboard feeds all three read-only chart surfaces from the guarded daily helper', () => {
  const source = readFileSync(new URL('../src/app/(tenant)/[organizationSlug]/[section]/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /dashboardPaidDays\(ads,f\.currency\)/);
  assert.match(source, /dashboardPaidDays\(previousAds,f\.currency\)/);
  assert.doesNotMatch(source, /if\(r\[k\]!=null\)/);
  const executive = readFileSync(new URL('../src/components/dashboard/executive-overview-v2.tsx', import.meta.url), 'utf8');
  const platform = readFileSync(new URL('../src/components/dashboard/platform-analytics-v3.tsx', import.meta.url), 'utf8');
  assert.match(executive, /export type ExecutiveDay=\{date:string;spend:number\|null;/);
  assert.match(platform, /export type PlatformDay=\{date:string;spend:number\|null;/);
});
