import test from 'node:test';
import assert from 'node:assert/strict';
import {campaigns} from '../src/lib/metrics/campaigns';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {Row} from '../src/types/database.types';

// All rows are synthetic: no live account or customer data.
const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
function ad(overrides: Partial<Row<'metrics_ads'>> = {}): Row<'metrics_ads'> {
  return {
    organization_id: orgA, platform: 'meta_ads', account_id: 'test-account',
    campaign_id: 'campaign-1', campaign_name: 'Synthetic',
    campaign_status: 'active', metric_date: '2026-10-24', currency: 'BRL',
    spend: 100, revenue: null, purchases: null, impressions: 100,
    reach: 80, clicks: 10, unique_clicks: 7,
    ...overrides,
  } as Row<'metrics_ads'>;
}

test('one complete daily observation preserves reach, distinct clickers and observed zero', () => {
  const rows = campaigns([ad()], [], 'crm');
  assert.equal(rows[0].reach, 80);
  assert.equal(rows[0].metricValues.unique_clicks, 7);
  const summary = paidSummary(rows);
  assert.equal(summary.reach, 80);
  assert.equal(summary.unique_clicks, 7);
  assert.equal(summary.frequency, 1.25);
  assert.equal(summary.unique_ctr, 8.75);

  const zero = paidSummary(campaigns([ad({reach: 0, unique_clicks: 0})], [], 'crm'));
  assert.equal(zero.reach, 0);
  assert.equal(zero.unique_clicks, 0);
  assert.equal(zero.frequency, null);
});

test('daily unique people are not added across dates in one campaign', () => {
  const rows = campaigns([
    ad(), ad({metric_date: '2026-10-25', reach: 90, unique_clicks: 8}),
  ], [], 'crm');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].impressions, 200);
  assert.equal(rows[0].spend, 200);
  assert.equal(rows[0].reach, null);
  assert.equal(rows[0].metricValues.reach, null);
  assert.equal(rows[0].metricValues.unique_clicks, null);
  assert.equal(paidSummary(rows).frequency, null);
  assert.equal(paidSummary(rows).unique_ctr, null);
});

test('cross-campaign summary withholds undeduplicated reach and unique CTR', () => {
  const rows = campaigns([ad(), ad({campaign_id: 'campaign-2'})], [], 'crm');
  const summary = paidSummary(rows);
  assert.equal(summary.spend, 200);
  assert.equal(summary.impressions, 200);
  assert.equal(summary.clicks, 20);
  assert.equal(summary.reach, null);
  assert.equal(summary.unique_clicks, null);
  assert.equal(summary.frequency, null);
  assert.equal(summary.unique_ctr, null);
});

test('multiple observations on the same campaign day still require source deduplication', () => {
  const rows = campaigns([ad(), ad({reach: 60, unique_clicks: 5})], [], 'crm');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reach, null);
  assert.equal(rows[0].metricValues.unique_clicks, null);
  assert.equal(paidSummary(rows).frequency, null);
});

test('malformed unique measures remain unknown rather than negative or infinite', () => {
  for (const value of [-1, Number.POSITIVE_INFINITY, Number.NaN]) {
    const summary = paidSummary(campaigns([ad({reach: value, unique_clicks: value})], [], 'crm'));
    assert.equal(summary.reach, null);
    assert.equal(summary.unique_clicks, null);
    assert.equal(summary.frequency, null);
    assert.equal(summary.unique_ctr, null);
  }
});

test('summary rejects cross-tenant data instead of producing a combined dashboard total', () => {
  const rows = campaigns([ad(), ad({organization_id: orgB, campaign_id: 'campaign-2'})], [], 'crm');
  assert.throws(() => paidSummary(rows), /single organization/);
});
