import test from 'node:test';
import assert from 'node:assert/strict';
import type {Row} from '../src/types/database.types';
import {buildPerformanceReport, performanceDelta, comparableAttribution, type PerformanceScope} from '../src/lib/reports/performance-report';

export const scope: PerformanceScope = {organizationId:'11111111-1111-4111-8111-111111111111', organizationName: 'Synthetic A', organizationSlug: 'synthetic-a', timezone: 'America/Cuiaba', currency: 'BRL', from: '2026-10-20', to: '2026-10-21', compare: 'previous_period', generatedAt: '2026-10-26T12:00:00.000Z'};
export const fact = (patch: Partial<Row<'metrics_ads'>> = {}) => ({id: 'synthetic-current', organization_id: scope.organizationId, metric_date: scope.from, platform: 'meta_ads', account_id: 'act_123', campaign_id: 'synthetic-campaign', campaign_name: 'Synthetic campaign', ad_id: 'synthetic-ad', currency: 'BRL', spend: 100, impressions: 1000, clicks: 10, leads: 2, attribution_window: '7d_click', ...patch} as Row<'metrics_ads'>);
const prior = (patch: Partial<Row<'metrics_ads'>> = {}) => fact({id: 'synthetic-prior', metric_date: '2026-10-18', spend: 50, ...patch});

test('executive report sums ad/day facts and computes ratios from totals with actual comparison dates', () => {
 const report = buildPerformanceReport([fact(), fact({id: 'synthetic-ad2', ad_id: 'other-ad', spend: 200, impressions: 9000, clicks: 90, leads: 8})], [prior()], scope);
 assert.equal(report.current.totals.spend, 300); assert.equal(report.current.totals.ctr, 1); assert.equal(report.current.totals.cpc, 3); assert.equal(report.current.totals.cpl, 30);
 assert.equal(report.campaigns.length, 1); assert.equal(report.campaigns[0].current.sourceIds.length, 2);
 assert.deepEqual([report.previous?.from, report.previous?.to], ['2026-10-18', '2026-10-19']);
 assert.equal(performanceDelta(report.current, report.previous, 'spend'), 500);
 assert.equal(performanceDelta(report.current, report.previous, 'leads'), 400);
});

test('report fails closed for organization, currency, provider and dates in either period', () => {
 for (const patch of [{organization_id: 'synthetic-b'}, {currency: 'USD'}, {platform: 'instagram'}, {metric_date: '2026-10-19'}] as Partial<Row<'metrics_ads'>>[]) assert.throws(() => buildPerformanceReport([fact(patch)], [], scope), /scope mismatch/);
 for (const patch of [{organization_id: 'synthetic-b'}, {currency: 'USD'}, {metric_date: scope.from}]) assert.throws(() => buildPerformanceReport([], [prior(patch)], scope), /scope mismatch/);
});

test('duplicate IDs and ad/day grains reject aliases exclusively for Meta accounts', () => {
 assert.throws(() => buildPerformanceReport([fact(), fact({ad_id: 'other'})], [], scope), /Duplicate/);
 assert.throws(() => buildPerformanceReport([fact(), fact({id: 'alias', account_id: '123'})], [], scope), /Duplicate/);
 assert.throws(() => buildPerformanceReport([fact({account_id: 'act_'})], [], scope), /Invalid.*grain/);
 const report = buildPerformanceReport([fact({platform: 'google_ads'}), fact({id: 'literal-account', platform: 'google_ads', account_id: '123'})], [], scope);
 assert.equal(report.campaigns.length, 2); assert.equal(report.current.totals.spend, 200);
});

test('empty periods and partial, negative or overflowing observations remain unavailable; explicit zero survives', () => {
 assert.equal(buildPerformanceReport([], [], scope).current.totals.spend, null);
 for (const missing of [null, -1, NaN, Infinity]) {
  const report = buildPerformanceReport([fact(), fact({id: 'other', ad_id: 'other', clicks: missing})], [], scope);
  assert.equal(report.current.totals.clicks, null); assert.equal(report.current.totals.ctr, null); assert.equal(report.current.coverage.clicks, 1);
 }
 const overflow = buildPerformanceReport([fact({spend: 1e308}), fact({id: 'other', ad_id: 'other', spend: 1e308})], [], scope);
 assert.equal(overflow.current.totals.spend, null); assert.equal(overflow.current.totals.cpl, null);
 const zero = buildPerformanceReport([fact({spend: 0, clicks: 0, leads: 0})], [prior({clicks: 0})], scope);
 assert.equal(zero.current.totals.spend, 0); assert.equal(zero.current.totals.clicks, 0); assert.equal(zero.current.totals.cpc, null); assert.equal(performanceDelta(zero.current, zero.previous, 'clicks'), null);
});

test('leads and CPL deltas require equivalent known single windows for the same accounts', () => {
 for (const patch of [{attribution_window: ''}, {attribution_window: 'unknown'}, {attribution_window: 'platform_default'}, {attribution_window: '1d_click'}, {account_id: '456'}]) {
  const report = buildPerformanceReport([fact()], [prior(patch)], scope);
  assert.equal(comparableAttribution(report.current, report.previous!), false);
  assert.equal(performanceDelta(report.current, report.previous, 'leads'), null); assert.equal(performanceDelta(report.current, report.previous, 'cpl'), null);
  assert.equal(performanceDelta(report.current, report.previous, 'spend'), 100);
 }
 const report = buildPerformanceReport([fact(), fact({id: 'other', ad_id: 'other', attribution_window: '1d_click'})], [prior()], scope);
 assert.equal(comparableAttribution(report.current, report.previous!), false);
 const alias = buildPerformanceReport([fact()], [prior({account_id: '123'})], scope);
 assert.equal(comparableAttribution(alias.current, alias.previous!), true);
});

test('provider/account/campaign grouping is stable, includes prior-only groups and preserves latest name', () => {
 const rows = [fact(), fact({id: 'new', metric_date: scope.to, campaign_name: 'Renamed synthetic'}), fact({id: 'google', platform: 'google_ads'})];
 const old = [prior({campaign_id: 'retired', campaign_name: 'Retired synthetic'})];
 const a = buildPerformanceReport(rows, old, scope), b = buildPerformanceReport([...rows].reverse(), old, scope);
 assert.deepEqual(a, b); assert.equal(a.platforms.length, 2); assert.equal(a.campaigns.length, 3);
 const retired = a.campaigns.find(row => row.campaignId === 'retired')!;
 assert.equal(retired.current.totals.spend, null); assert.equal(retired.previous?.totals.spend, 50);
 assert.ok(a.campaigns.some(row => row.label === 'Renamed synthetic'));
});

test('comparison none never accepts prior facts and leap-year endpoints use canonical calendar helper', () => {
 const report = buildPerformanceReport([fact()], [], {...scope, compare: 'none'});
 assert.equal(report.previous, null); assert.equal(report.campaigns[0].previous, null);
 assert.throws(() => buildPerformanceReport([fact()], [prior()], {...scope, compare: 'none'}), /Unexpected comparison/);
 const leap = buildPerformanceReport([], [], {...scope, from: '2024-02-29', to: '2024-02-29', compare: 'previous_year'});
 assert.equal(leap.previous?.from, '2023-02-28');
});

test('invalid scope timestamps, timezone, date and currency cannot label a report', () => {
 for (const patch of [{generatedAt: '2026-10-26'}, {generatedAt: 'invalid'}, {timezone: 'Invalid/zone'}, {currency: 'brl'}, {from: '2026-02-30'}]) assert.throws(() => buildPerformanceReport([], [], {...scope, ...patch}));
});

test('SEC-PERF-SCOPE-001: rejects malformed authenticated organization scope even with empty reports', () => {
 const invalid = ['', 'synthetic-a', ' 11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111x',
  '11111111-1111-4111-1111-111111111111', '11111111-1111-9111-8111-111111111111'];
 for (const organizationId of invalid) {
  assert.throws(() => buildPerformanceReport([], [], {...scope, organizationId}), /Invalid performance report scope/, organizationId);
  assert.throws(() => buildPerformanceReport(
   [fact({organization_id: organizationId})], [], {...scope, organizationId, compare:'none'},
  ), /Invalid performance report scope/, organizationId);
 }
});

test('SEC-PERF-SCOPE-001: valid tenant preserves empty, observed-zero and comparison semantics', () => {
 const empty = buildPerformanceReport([], [], scope);
 assert.equal(empty.current.totals.spend, null);
 const zero = buildPerformanceReport([fact({spend: 0, clicks: 0, impressions: 0, leads: 0})], [prior()], scope);
 assert.equal(zero.current.totals.spend, 0);
 assert.equal(zero.current.totals.leads, 0);
 assert.equal(zero.previous?.totals.spend, 50);
});
