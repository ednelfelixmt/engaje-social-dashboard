import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';

function fact(metricValues: Record<string, number | null>): CampaignPerformance {
  // Synthetic fact with no production identifiers or external requests.
  return {organizationId: 'synthetic-tenant', currency: 'BRL', impressions: metricValues.impressions ?? null, metricValues} as CampaignPerformance;
}

test('negative spend becomes unavailable without hiding valid nonfinancial counts', () => {
  const result = paidSummary([fact({spend: -10, revenue: 200, clicks: 20, impressions: 100, leads: 5})]);
  assert.equal(result.spend, null);
  assert.equal(result.revenue, 200);
  assert.equal(result.clicks, 20);
  assert.equal(result.impressions, 100);
  assert.equal(result.cpc, null);
  assert.equal(result.cpl, null);
  assert.equal(result.roas, null);
});

test('negative source event counts cannot produce negative KPIs or denominators', () => {
  const result = paidSummary([fact({
    spend: 100, impressions: -100, clicks: -5, leads: -2,
    purchases: -1, conversions: -1, page_views: -10,
  })]);
  for (const key of ['impressions', 'clicks', 'leads', 'purchases', 'conversions', 'page_views',
    'cpm', 'cpc', 'cpl', 'ctr', 'cpa', 'cost_per_conversion', 'cost_per_page_view']) {
    assert.equal(result[key], null, key);
  }
  assert.equal(result.spend, 100);
});

test('one invalid row invalidates only that additive metric, not other rows or KPIs', () => {
  const result = paidSummary([
    fact({spend: 20, impressions: 100, clicks: 10, leads: 2}),
    fact({spend: 30, impressions: 200, clicks: -1, leads: 3}),
  ]);
  assert.equal(result.spend, 50);
  assert.equal(result.impressions, 300);
  assert.equal(result.leads, 5);
  assert.equal(result.clicks, null);
  assert.equal(result.cpc, null);
  assert.equal(result.ctr, null);
  assert.equal(result.cpl, 10);
});

test('legitimate zero and fractional attributed events remain observed', () => {
  const result = paidSummary([fact({spend: 0, impressions: 100, clicks: 0, leads: 0.25})]);
  assert.equal(result.spend, 0);
  assert.equal(result.clicks, 0);
  assert.equal(result.leads, 0.25);
  assert.equal(result.ctr, 0);
  assert.equal(result.cpl, 0);
});

test('signed financial adjustments remain supported without allowing negative spend', () => {
  const result = paidSummary([
    fact({spend: 100, revenue: 300, conversion_value: 300}),
    fact({spend: 50, revenue: -20, conversion_value: -20}),
  ]);
  assert.equal(result.spend, 150);
  assert.equal(result.revenue, 280);
  assert.equal(result.conversion_value, 280);
  assert.equal(result.roas, 280 / 150);
});

test('overflow of a valid additive input is unavailable rather than Infinity or zero', () => {
  const result = paidSummary([
    fact({spend: 1e308, impressions: 1e308, clicks: 2, leads: 1}),
    fact({spend: 1e308, impressions: 1e308, clicks: 2, leads: 1}),
  ]);
  assert.equal(result.spend, null);
  assert.equal(result.impressions, null);
  assert.equal(result.clicks, 4);
  assert.equal(result.leads, 2);
  assert.equal(result.cpm, null);
  assert.equal(result.cpc, null);
  assert.equal(result.ctr, null);
});
