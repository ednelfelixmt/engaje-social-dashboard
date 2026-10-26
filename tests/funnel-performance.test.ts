import test from 'node:test';
import assert from 'node:assert/strict';
import {campaigns} from '../src/lib/metrics/campaigns';
import {configuredFunnel, hasFunnelMeasurements, summarizeFunnelMetric} from '../src/lib/metrics/funnel-performance';
import type {Row} from '../src/types/database.types';
import type {CampaignPerformance} from '../src/types/domain';

const scope = {organizationId: '11111111-1111-4111-8111-111111111111', currency: 'BRL'};
const fact = (override: Partial<Row<'metrics_ads'>> = {}) => ({organization_id: scope.organizationId,
  platform: 'meta_ads', account_id: 'synthetic-account', campaign_id: 'synthetic-campaign', campaign_name: 'Synthetic campaign',
  campaign_status: 'active', metric_date: '2026-10-24', currency: 'BRL', spend: 100, revenue: null,
  impressions: 1000, reach: 500, clicks: 20, page_views: 10, leads: 5, message_leads: 2,
  registration_leads: 3, purchases: 2, checkouts: 4, video_views: 50, content_views: 8, add_to_cart: 6, ...override} as Row<'metrics_ads'>);
const rows = (...ads: Row<'metrics_ads'>[]) => campaigns(ads, [], 'crm');
const summary = (data: CampaignPerformance[], metric: Parameters<typeof summarizeFunnelMetric>[1] = 'clicks') => summarizeFunnelMetric(data, metric, scope.organizationId, scope.currency);
const steps = [{metric: 'clicks', label: 'Cliques', color: '#12AB34', icon: 'click', target: 100}, {metric: 'purchases', label: 'Vendas'}];

test('complete campaign totals and costs preserve configuration and multiplier', () => {
  const data = rows(fact(), fact({campaign_id: 'synthetic-other', spend: 50, clicks: 10}));
  assert.equal(summary(data).value, 30); assert.equal(summary(data).cost, 5);
  assert.equal(summary(data, 'impressions').cost, 75);
  const configured = configuredFunnel(data, steps, scope, rows(fact({clicks: 15})));
  assert.equal(configured[0].previousValue, 15); assert.equal(configured[0].color, '#12AB34');
  assert.equal(configured[0].target, 100); assert.equal(configured[0].icon, 'click');
  assert.match(configured[0].detail, /2 de 2 campanhas/);
});

test('partial metrics never become complete totals or subset costs', () => {
  const data = rows(fact(), fact({campaign_id: 'synthetic-other', clicks: null}));
  assert.equal(summary(data).value, null); assert.equal(summary(data).cost, null);
  assert.match(summary(data).detail, /1 de 2 campanhas/);
  assert.equal(summary(data, 'impressions').value, 2000);
});

test('supported primitive metrics reach the funnel without fabricated sales qualification', () => {
  const data = rows(fact());
  for (const [metric, expected] of [['video_views', 50], ['content_views', 8], ['add_to_cart', 6]] as const) {
    assert.equal(summary(data, metric).value, expected); assert.equal(summary(data, metric).cost, 100 / expected);
  }
  assert.equal(summary(data, 'qualified_leads').value, null);
  assert.equal(summary(data, 'meetings').value, null);
});

test('reconciled purchases take precedence over advertising primitive', () => {
  const crm = {organization_id: scope.organizationId, metric_date: '2026-10-24', channel: 'meta_ads',
    account_id: 'synthetic-account', campaign_id: 'synthetic-campaign', currency: 'BRL',
    source: 'crm', is_complete: true, revenue: 400, purchases: 8} as Row<'metrics_crm'>;
  const data = campaigns([fact()], [crm], 'crm');
  assert.equal(data[0].metricValues.purchases, 2);
  assert.equal(summary(data, 'purchases').value, 8); assert.equal(summary(data, 'purchases').cost, 12.5);
});

test('observed zero survives even without movement; catalog alone does not create a fact', () => {
  const catalog = [{organization_id: scope.organizationId, platform: 'meta_ads', account_id: 'synthetic-account',
    external_id: 'synthetic-catalog', name: 'Synthetic catalog', status: 'active'} as Row<'ad_campaigns'>];
  const data = campaigns([fact({spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0})], [], 'crm', catalog);
  assert.equal(hasFunnelMeasurements(data[0]), true); assert.equal(hasFunnelMeasurements(data[1]), false);
  assert.equal(summary(data).value, 0); assert.equal(summary(data).cost, null); assert.equal(summary(data).observed, 1);
  assert.equal(summary([data[1]]).value, null); assert.equal(summary([]).value, null);
});

test('invalid and negative counts are unavailable without implicit coercion', () => {
  for (const clicks of [Number.NaN, Number.POSITIVE_INFINITY, -1, '20' as unknown as number]) {
    const data = rows(fact()); data[0].clicks = clicks;
    assert.equal(summary(data).value, null); assert.equal(summary(data).cost, null);
  }
  const data = rows(fact()); data[0].clicks = 0.5; assert.equal(summary(data).value, 0.5);
});

test('sum and cost overflow remain unavailable, never zero or infinity', () => {
  const data = rows(fact(), fact({campaign_id: 'synthetic-other'}));
  data.forEach(row => {row.clicks = 1e308;});
  assert.equal(summary(data).value, null); assert.equal(summary(data).cost, null);
  data.forEach(row => {row.clicks = 1; row.spend = 1e308;});
  assert.equal(summary(data).value, 2); assert.equal(summary(data).cost, null);
  data[0].clicks = 1e-308; data[0].spend = 1e308;
  assert.equal(summary([data[0]]).cost, null);
});

test('negative or invalid investment does not erase valid counts or invent a cost', () => {
  for (const spend of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const data = rows(fact()); data[0].spend = spend;
    assert.equal(summary(data).value, 20); assert.equal(summary(data).cost, null);
    assert.match(summary(data).detail, /investimento inválido/);
  }
});

test('foreign tenant is rejected in current and prior periods, including foreign catalog', () => {
  const foreign = rows(fact({organization_id: '22222222-2222-4222-8222-222222222222'}));
  assert.equal(summary([...rows(fact()), ...foreign]).value, null);
  const foreignCatalog = {...foreign[0], currency: '', spend: 0, metricValues: {}, clicks: null, impressions: null, reach: null, pageViews: null, leads: null, registrationLeads: null, messageLeads: null, checkouts: null, purchases: null};
  assert.equal(hasFunnelMeasurements(foreignCatalog), false);
  assert.equal(summary([...rows(fact()), foreignCatalog]).value, null);
  const output = configuredFunnel(rows(fact()), steps, scope, foreign);
  assert.equal(output[0].previousValue, null); assert.match(output[0].detail, /Comparação indisponível/);
});

test('currency must match displayed currency before computing a monetary cost', () => {
  for (const currency of ['USD', '', 'brl']) {
    const data = rows(fact()); data[0].currency = currency;
    assert.equal(summary(data).value, 20); assert.equal(summary(data).cost, null);
    assert.match(summary(data).detail, /moeda diferente/);
  }
});

test('incomplete prior period does not produce a comparison, while current counts stay valid', () => {
  const previous = rows(fact(), fact({campaign_id: 'synthetic-other', clicks: null}));
  const output = configuredFunnel(rows(fact()), steps, scope, previous);
  assert.equal(output[0].value, 20); assert.equal(output[0].previousValue, null);
  assert.match(output[0].detail, /Comparação indisponível/);
});

test('empty prior observations are explained only when comparison was requested', () => {
  assert.match(configuredFunnel(rows(fact()), steps, scope, [])[0].detail, /Comparação indisponível/);
  assert.doesNotMatch(configuredFunnel(rows(fact()), steps, scope)[0].detail, /Comparação indisponível/);
});
