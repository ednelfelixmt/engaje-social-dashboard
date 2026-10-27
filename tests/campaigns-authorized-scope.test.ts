import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scopedCampaigns} from '../src/lib/metrics/campaigns';
import type {Row} from '../src/types/database.types';

const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const ad = (overrides: Partial<Row<'metrics_ads'>> = {}): Row<'metrics_ads'> => ({
  organization_id: orgA, platform: 'meta_ads', account_id: 'act_123',
  campaign_id: 'synthetic-campaign', campaign_name: 'Synthetic', campaign_status: 'active',
  metric_date: '2026-10-27', currency: 'BRL', spend: 0, revenue: 0,
  purchases: 0, impressions: 0, reach: 0, clicks: 0, page_views: 0,
  leads: 0, message_leads: 0, registration_leads: 0, checkouts: 0,
  ...overrides,
} as Row<'metrics_ads'>);
const crm = (overrides: Partial<Row<'metrics_crm'>> = {}): Row<'metrics_crm'> => ({
  organization_id: orgA, metric_date: '2026-10-27', channel: 'meta_ads',
  account_id: 'act_123', campaign_id: 'synthetic-campaign', currency: 'BRL',
  source: 'crm', is_complete: true, revenue: 100, purchases: 1,
  ...overrides,
} as Row<'metrics_crm'>);
const catalog = (overrides: Partial<Row<'ad_campaigns'>> = {}): Row<'ad_campaigns'> => ({
  organization_id: orgA, platform: 'meta_ads', account_id: 'act_123',
  external_id: 'catalog-only', name: 'Synthetic catalog', status: 'active',
  ...overrides,
} as Row<'ad_campaigns'>);

test('authorized scope preserves observed zero and catalog placeholders', () => {
  const result = scopedCampaigns([ad()], [crm()], 'crm', [catalog()], orgA, 'BRL');
  assert.equal(result.length, 2);
  const observed = result.find(row => row.campaignId === 'synthetic-campaign');
  assert.equal(observed?.spend, 0);
  assert.equal(observed?.revenue, 100);
  assert.equal(observed?.organizationId, orgA);
  const placeholder = result.find(row => row.campaignId === 'catalog-only');
  assert.equal(placeholder?.currency, '');
  assert.equal(placeholder?.revenue, null);
  assert.deepEqual(scopedCampaigns([], [], 'crm', [], orgA, 'BRL'), []);
});

test('invalid authorized tenant or currency fails even with empty sources', () => {
  for (const id of ['', 'not-a-uuid', '11111111', ' ']) {
    assert.throws(() => scopedCampaigns([], [], 'crm', [], id, 'BRL'), /authorized organization and currency/);
  }
  for (const currency of ['', 'brl', 'BRLUSD', ' B ']) {
    assert.throws(() => scopedCampaigns([], [], 'crm', [], orgA, currency), /authorized organization and currency/);
  }
});

test('foreign or mixed-currency ad rows are rejected before any campaign is displayed', () => {
  for (const unexpected of [ad({organization_id: orgB}), ad({currency: 'USD'})]) {
    assert.throws(() => scopedCampaigns([ad(), unexpected], [], 'crm', [], orgA, 'BRL'), /authorized organization and currency/);
    assert.throws(() => scopedCampaigns([unexpected], [], 'crm', [], orgA, 'BRL'), /authorized organization and currency/);
  }
});

test('unmatched CRM rows must not bypass tenant/currency scope', () => {
  const unrelated = {campaign_id: 'unmatched'};
  for (const unexpected of [crm({...unrelated, organization_id: orgB}), crm({...unrelated, currency: 'USD'})]) {
    assert.throws(() => scopedCampaigns([ad()], [crm(), unexpected], 'crm', [], orgA, 'BRL'), /authorized organization and currency/);
    assert.throws(() => scopedCampaigns([], [unexpected], 'crm', [], orgA, 'BRL'), /authorized organization and currency/);
  }
});

test('catalog-only campaigns also require the authenticated tenant', () => {
  assert.throws(() => scopedCampaigns([], [], 'crm', [catalog({organization_id: orgB})], orgA, 'BRL'), /authorized organization and currency/);
  assert.throws(() => scopedCampaigns([ad()], [], 'crm', [catalog(), catalog({organization_id: orgB})], orgA, 'BRL'), /authorized organization and currency/);
});

test('both private dashboards scope current and historical campaign sources', () => {
  const section = readFileSync('src/app/(tenant)/[organizationSlug]/[section]/page.tsx', 'utf8');
  const intelligence = readFileSync('src/app/(tenant)/[organizationSlug]/intelligence/page.tsx', 'utf8');
  assert.match(section, /scopedCampaigns\(ads, data\.crm, config\.preferred_revenue_source, catalog, org\.id, f\.currency\)/);
  assert.match(section, /scopedCampaigns\(previousAds, data\.crmComparison, config\.preferred_revenue_source, catalog, org\.id, f\.currency\)/);
  assert.match(intelligence, /scopedCampaigns\(data\.ads,data\.crm,config\.preferred_revenue_source,data\.adCampaigns,org\.id,f\.currency\)/);
  assert.match(intelligence, /scopedCampaigns\(data\.adsComparison,data\.crmComparison,config\.preferred_revenue_source,data\.adCampaigns,org\.id,f\.currency\)/);
});
