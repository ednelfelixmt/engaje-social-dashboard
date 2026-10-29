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
  for (const id of [
    '', 'not-a-uuid', '11111111', ' ',
    '11111111-1111-0111-8111-111111111111',
    '11111111-1111-9111-8111-111111111111',
    '11111111-1111-4111-7111-111111111111',
    '11111111-1111-4111-c111-111111111111',
  ]) {
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


test('RFC-invalid authenticated tenant fails closed even when all sources match it', () => {
  const invalid = '11111111-1111-0111-8111-111111111111';
  assert.throws(() => scopedCampaigns(
    [ad({organization_id: invalid})], [crm({organization_id: invalid})], 'crm',
    [catalog({organization_id: invalid})], invalid, 'BRL',
  ), /authorized organization and currency/);
});

test('valid RFC v7 tenant preserves observed zero and authenticated source matching', () => {
  const uuidV7 = '123e4567-e89b-7d3a-a456-426614174000';
  const rows = scopedCampaigns(
    [ad({organization_id: uuidV7})], [crm({organization_id: uuidV7})], 'crm',
    [catalog({organization_id: uuidV7})], uuidV7, 'BRL',
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.organizationId, uuidV7);
  assert.equal(rows[0]?.spend, 0);
  assert.equal(rows[0]?.revenue, 100);
});


test('CAMPAIGN-SOURCE-ID-001: paid facts reject malformed identities without returning a partial aggregate', () => {
  const malformed = [
    ad({account_id: ''}),
    ad({account_id: 'act_'}),
    ad({account_id: 'act_ padded'}),
    ad({account_id: 'account '}),
    ad({campaign_id: ' campaign'}),
    ad({campaign_id: String.fromCharCode(9) + 'campaign'}),
    ad({platform: ' meta_ads' as Row<'metrics_ads'>['platform']}),
  ];
  for (const row of malformed) {
    assert.throws(
      () => scopedCampaigns([ad(), row], [crm()], 'crm', [catalog()], orgA, 'BRL'),
      /valid source identifiers/,
    );
  }
});

test('CAMPAIGN-SOURCE-ID-001: unmatched CRM and catalog placeholders cannot hide malformed identities', () => {
  const badCrm = [
    crm({account_id: '  '}),
    crm({account_id: 'act_'}),
    crm({campaign_id: 'unmatched '}),
    crm({campaign_id: String.fromCharCode(160)}),
    crm({channel: ' meta_ads'}),
    crm({account_id: null as unknown as string}),
  ];
  for (const row of badCrm) {
    assert.throws(
      () => scopedCampaigns([ad()], [crm(), row], 'crm', [], orgA, 'BRL'),
      /valid source identifiers/,
    );
    assert.throws(
      () => scopedCampaigns([], [row], 'crm', [], orgA, 'BRL'),
      /valid source identifiers/,
    );
  }
  const badCatalog = [
    catalog({account_id: ''}),
    catalog({account_id: 'act_'}),
    catalog({external_id: ' catalog'}),
    catalog({external_id: '   '}),
    catalog({platform: 'meta_ads ' as Row<'ad_campaigns'>['platform']}),
  ];
  for (const row of badCatalog) {
    assert.throws(
      () => scopedCampaigns([ad()], [], 'crm', [catalog(), row], orgA, 'BRL'),
      /valid source identifiers/,
    );
    assert.throws(
      () => scopedCampaigns([], [], 'crm', [row], orgA, 'BRL'),
      /valid source identifiers/,
    );
  }
});

test('CAMPAIGN-SOURCE-ID-001: preserve opaque internal spaces, Meta aliases, zero and unattributed CRM', () => {
  const opaqueAccount = 'act_synthetic account:1';
  const opaqueCampaign = 'campaign internal:1';
  const results = scopedCampaigns(
    [ad({account_id: opaqueAccount, campaign_id: opaqueCampaign, spend: 0, leads: 0})],
    [crm({account_id: opaqueAccount, campaign_id: opaqueCampaign, revenue: 100, purchases: 1}),
      crm({channel: '', account_id: '', campaign_id: '', revenue: 5})],
    'crm',
    [catalog({account_id: opaqueAccount, external_id: 'catalog internal:2'})],
    orgA,
    'BRL',
  );
  assert.equal(results.length, 2);
  const measured = results.find(row => row.campaignId === opaqueCampaign);
  assert.equal(measured?.accountId, opaqueAccount);
  assert.equal(measured?.spend, 0);
  assert.equal(measured?.leads, 0);
  assert.equal(measured?.revenue, 100);
  assert.equal(results.find(row => row.campaignId === 'catalog internal:2')?.currency, '');
  assert.deepEqual(scopedCampaigns([], [crm({channel: '', account_id: '', campaign_id: ''})], 'crm', [], orgA, 'BRL'), []);
});

test('CAMPAIGN-META-ALIAS-002: malformed doubled Meta aliases fail closed across all sources', () => {
  for (const account_id of ['act_act_123', 'act_act_', 'act_act_ 123']) {
    assert.throws(
      () => scopedCampaigns([ad(), ad({account_id})], [crm()], 'crm', [catalog()], orgA, 'BRL'),
      /valid source identifiers/, 'paid ' + account_id,
    );
    // Unmatched and unselected CRM facts still participate in integrity validation.
    assert.throws(
      () => scopedCampaigns([ad()], [crm(), crm({account_id, campaign_id:'unmatched'})], 'crm', [catalog()], orgA, 'BRL'),
      /valid source identifiers/, 'CRM ' + account_id,
    );
    assert.throws(
      () => scopedCampaigns([ad()], [crm()], 'crm', [catalog(), catalog({account_id})], orgA, 'BRL'),
      /valid source identifiers/, 'catalog ' + account_id,
    );
  }
});

test('CAMPAIGN-META-ALIAS-002: one Meta alias remains valid; other providers keep literal opaque IDs', () => {
  const validMeta = scopedCampaigns(
    [ad({account_id:'act_123', spend:0})],
    [crm({account_id:'123', revenue:150})], 'crm', [], orgA, 'BRL',
  );
  assert.equal(validMeta[0].accountId, 'act_123');
  assert.equal(validMeta[0].revenue, 150);
  assert.equal(validMeta[0].spend, 0);
  for (const platform of ['google_ads', 'tiktok_ads', 'microsoft_ads'] as const) {
    const literal = scopedCampaigns(
      [ad({platform, account_id:'act_act_123'})],
      [crm({channel:platform, account_id:'act_act_123', revenue:75})],
      'crm', [catalog({platform, account_id:'act_act_123'})], orgA, 'BRL',
    );
    assert.equal(literal.length, 2);
    assert.equal(literal[0].accountId, 'act_act_123');
    assert.equal(literal[0].revenue, 75);
  }
});
