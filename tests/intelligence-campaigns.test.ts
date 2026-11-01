import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligenceCampaignShape} from '../src/lib/metrics/intelligence-campaigns.ts';
import type {CampaignPerformance} from '../src/types/domain';

const organizationId = '11111111-1111-4111-8111-111111111111';
const otherOrganizationId = '22222222-2222-4222-8222-222222222222';
const currency = 'BRL';
function campaign(overrides: Partial<CampaignPerformance> = {}): CampaignPerformance {
  return {
    organizationId,
    platform: 'meta_ads',
    accountId: 'act_synthetic',
    campaignId: 'campaign-zero',
    campaignName: 'Synthetic campaign',
    currency: 'BRL',
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    revenue: 0,
    purchases: 0,
    metricValues: {spend: 0},
    ...overrides,
  } as CampaignPerformance;
}

test('Intelligence preserves an observed zero campaign instead of displaying no campaigns', () => {
  const result = intelligenceCampaignShape([campaign()], organizationId, currency);
  assert.deepEqual(result, [{
    id: JSON.stringify([organizationId, 'meta_ads', 'synthetic', 'campaign-zero']),
    name: 'Synthetic campaign',
    platform: 'meta_ads',
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    revenue: 0,
    purchases: 0,
  }]);
});

test('a measured zero spend with missing event metrics remains visible with missing values', () => {
  const result = intelligenceCampaignShape([campaign({
    impressions: null, clicks: null, leads: null, revenue: null, purchases: null,
  })], organizationId, currency);
  assert.equal(result.length, 1);
  assert.equal(result[0].spend, 0);
  assert.equal(result[0].leads, null);
  assert.equal(result[0].revenue, null);
});

test('catalog-only placeholders are excluded, including when mixed with measured campaigns', () => {
  const catalog = campaign({campaignId: 'catalog-only', metricValues: {}, revenue: null, leads: null});
  const measured = campaign({campaignId: 'observed'});
  assert.deepEqual(intelligenceCampaignShape([catalog], organizationId, currency), []);
  assert.deepEqual(intelligenceCampaignShape([catalog, measured], organizationId, currency).map(row => row.id),
    [JSON.stringify([organizationId, 'meta_ads', 'synthetic', 'observed'])]);
});

test('missing authorization or a cross-tenant campaign fails closed even for catalog-only rows', () => {
  assert.throws(() => intelligenceCampaignShape([campaign()], '', currency), /authorized organization/);
  assert.throws(() => intelligenceCampaignShape([
    campaign(), campaign({organizationId: 'synthetic-tenant-b', metricValues: {}}),
  ], organizationId, currency), /authorized organization/);
  assert.deepEqual(intelligenceCampaignShape([], organizationId, currency), []);
});

test('the authenticated Intelligence page applies the observed-fact selector to both periods', async () => {
  const {readFileSync} = await import('node:fs');
  const source = readFileSync(new URL('../src/app/(tenant)/[organizationSlug]/intelligence/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /intelligenceCampaignShape\(current,org\.id,f\.currency\)/);
  assert.match(source, /intelligenceCampaignShape\(previous,org\.id,f\.currency\)/);
  assert.doesNotMatch(source, /\.filter\(r=>r\.spend>0\|\|/);
});

test('SEC-INT-CAMP-001: invalid organization or currency fails closed even without campaigns', () => {
  for (const invalidId of ['', 'tenant-a', '11111111-1111-1111']) {
    assert.throws(() => intelligenceCampaignShape([], invalidId, currency), /authorized organization and currency/);
  }
  for (const invalidCurrency of ['', 'brl', 'UNKNOWN']) {
    assert.throws(() => intelligenceCampaignShape([], organizationId, invalidCurrency), /authorized organization and currency/);
  }
  assert.deepEqual(intelligenceCampaignShape([], organizationId, currency), []);
});

test('SEC-INT-CAMP-001: foreign organization invalidates whole projection including catalog-only rows', () => {
  const other = campaign({organizationId: otherOrganizationId, spend: 0});
  assert.throws(() => intelligenceCampaignShape([other], organizationId, currency), /authorized organization/);
  assert.throws(() => intelligenceCampaignShape([
    campaign(), campaign({organizationId: otherOrganizationId, metricValues: {}, currency: ''}),
  ], organizationId, currency), /authorized organization/);
});

test('SEC-INT-CAMP-001: wrong or missing source currency is rejected before filtering', () => {
  for (const invalidCurrency of ['USD', '', 'brl']) {
    assert.throws(() => intelligenceCampaignShape([
      campaign(), campaign({campaignId: 'other', currency: invalidCurrency, spend: 0}),
    ], organizationId, currency), /authorized organization and currency/);
  }
  assert.throws(() => intelligenceCampaignShape([
    campaign({metricValues: {}, currency: 'USD'}), campaign(),
  ], organizationId, currency), /authorized organization and currency/);
});

test('SEC-INT-CAMP-001: currency-less catalog placeholders remain excluded and observed zeros survive', () => {
  const result = intelligenceCampaignShape([
    campaign({campaignId: 'catalog', currency: '', metricValues: {}}),
    campaign({campaignId: 'zero', currency, spend: 0, leads: null}),
  ], organizationId, currency);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, JSON.stringify([organizationId, 'meta_ads', 'synthetic', 'zero']));
  assert.equal(result[0].spend, 0);
  assert.equal(result[0].leads, null);
});

test('SEC-CAMP-UUID-001: intelligence rejects invalid RFC organization variants before selecting observed facts',()=>{
  for(const invalidId of [
    '11111111-1111-0111-8111-111111111111',
    '11111111-1111-9111-8111-111111111111',
    '11111111-1111-4111-7111-111111111111',
    '11111111-1111-4111-8111-111111111111 ',
  ]){
    assert.throws(()=>intelligenceCampaignShape([],invalidId,currency),/authorized organization and currency/);
    assert.throws(()=>intelligenceCampaignShape([campaign({organizationId:invalidId})],invalidId,currency),/authorized organization and currency/);
  }
  const validV7='01933a7b-4f88-7a12-8d29-111111111111';
  assert.deepEqual(intelligenceCampaignShape([],validV7,currency),[]);
  assert.equal(intelligenceCampaignShape([campaign({organizationId:validV7})],validV7,currency).length,1);
});

test('INTELLIGENCE-OPAQUE-ID-001: malformed source IDs fail closed even on catalog placeholders', () => {
  const invalid: Partial<CampaignPerformance>[] = [
    {platform: ' meta_ads' as CampaignPerformance['platform']},
    {accountId: ''}, {accountId: '  '}, {accountId: 'act_synthetic '},
    {campaignId: '\tcampaign-zero'}, {campaignId: 'campaign-zero\n'},
    {campaignId: '\u00a0'}, {accountId: 42 as unknown as string},
  ];
  for (const patch of invalid) {
    assert.throws(
      () => intelligenceCampaignShape([campaign(), campaign(patch)], organizationId, currency),
      /valid source identifiers/,
    );
    assert.throws(
      () => intelligenceCampaignShape([campaign(), campaign({...patch, currency: '', metricValues: {}})], organizationId, currency),
      /valid source identifiers/,
    );
  }
  assert.deepEqual(intelligenceCampaignShape([], organizationId, currency), []);
});

test('INTELLIGENCE-OPAQUE-ID-001: UI keys distinguish IDs containing delimiters and preserve observed zeros', () => {
  const a = campaign({accountId: 'acct:east', campaignId: 'item'});
  const b = campaign({accountId: 'acct', campaignId: 'east:item'});
  const c = campaign({accountId: 'acct internal', campaignId: 'item internal'});
  const result = intelligenceCampaignShape([a, b, c], organizationId, currency);
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map(row => row.id)).size, 3);
  assert.equal(result[0].id, JSON.stringify([organizationId, 'meta_ads', 'acct:east', 'item']));
  assert.equal(result[1].id, JSON.stringify([organizationId, 'meta_ads', 'acct', 'east:item']));
  assert.equal(result[2].spend, 0);
  assert.equal(result[2].leads, 0);
});

test('INTEL-META-IDENTITY-001: invalid Meta aliases fail closed before excluding catalog rows', () => {
  for (const invalidAccount of ['act_', 'act_act_123', 'act_ 123', 'act_\u00a0123', 'act_\u0000id']) {
    assert.throws(() => intelligenceCampaignShape([
      campaign(), campaign({accountId: invalidAccount, campaignId: 'invalid'}),
    ], organizationId, currency), /valid source identifiers/, invalidAccount);
    assert.throws(() => intelligenceCampaignShape([
      campaign(), campaign({accountId: invalidAccount, metricValues: {}, currency: ''}),
    ], organizationId, currency), /valid source identifiers/, invalidAccount);
  }
  assert.equal(intelligenceCampaignShape([campaign({accountId: 'act_123'})], organizationId, currency).length, 1);
});

test('INTEL-META-IDENTITY-001: Meta aliases share stable UI identity while other platform IDs stay literal', () => {
  const metaRaw = intelligenceCampaignShape([campaign({accountId: '123'})], organizationId, currency);
  const metaAlias = intelligenceCampaignShape([campaign({accountId: 'act_123'})], organizationId, currency);
  assert.equal(metaRaw[0].id, metaAlias[0].id);
  assert.equal(metaRaw[0].id, JSON.stringify([organizationId, 'meta_ads', '123', 'campaign-zero']));
  const google = intelligenceCampaignShape([
    campaign({platform: 'google_ads', accountId: 'act_act_123', campaignId: 'literal'}),
  ], organizationId, currency);
  assert.equal(google[0].id, JSON.stringify([organizationId, 'google_ads', 'act_act_123', 'literal']));
  assert.equal(google[0].spend, 0);
  assert.throws(() => intelligenceCampaignShape([
    campaign({accountId: '123'}), campaign({accountId: 'act_123'}),
  ], organizationId, currency), /unique source identities/);
});


test('INTELLIGENCE-CAMPAIGN-PAID-SCOPE-001: unsupported providers fail closed in measured and catalog-only rows', () => {
  const observedZero = campaign({campaignId: 'observed-zero'});
  for (const invalidPlatform of ['instagram_organic', 'microsoft_ads', 'unknown']) {
    const invalidMeasured = campaign({
      platform: invalidPlatform as CampaignPerformance['platform'],
      accountId: 'foreign-source', campaignId: 'foreign-measured',
      metricValues: {spend: 500}, spend: 500,
    });
    const invalidCatalog = campaign({
      platform: invalidPlatform as CampaignPerformance['platform'],
      accountId: 'foreign-source', campaignId: 'foreign-catalog',
      metricValues: {}, currency: '',
    });
    assert.throws(
      () => intelligenceCampaignShape([observedZero, invalidMeasured], organizationId, currency),
      /supported paid source platforms/, invalidPlatform,
    );
    assert.throws(
      () => intelligenceCampaignShape([observedZero, invalidCatalog], organizationId, currency),
      /supported paid source platforms/, invalidPlatform,
    );
    assert.throws(
      () => intelligenceCampaignShape([invalidCatalog], organizationId, currency),
      /supported paid source platforms/, invalidPlatform,
    );
  }
  assert.equal(observedZero.spend, 0);
});

test('INTELLIGENCE-CAMPAIGN-PAID-SCOPE-001: three supported paid providers retain measured zero and opaque IDs', () => {
  const rows = Object.freeze([
    Object.freeze(campaign({platform: 'meta_ads', accountId: 'act_123', campaignId: 'meta', spend: 0})),
    Object.freeze(campaign({platform: 'google_ads', accountId: 'act_act_123', campaignId: 'google', spend: 0})),
    Object.freeze(campaign({platform: 'tiktok_ads', accountId: 'ad account east', campaignId: 'tiktok', spend: 0})),
  ]);
  const output = intelligenceCampaignShape(rows, organizationId, currency);
  assert.deepEqual(output.map(row => row.platform), ['meta_ads', 'google_ads', 'tiktok_ads']);
  assert.deepEqual(output.map(row => row.spend), [0, 0, 0]);
  assert.deepEqual(output.map(row => row.id), [
    JSON.stringify([organizationId, 'meta_ads', '123', 'meta']),
    JSON.stringify([organizationId, 'google_ads', 'act_act_123', 'google']),
    JSON.stringify([organizationId, 'tiktok_ads', 'ad account east', 'tiktok']),
  ]);
  assert.equal(rows[0].accountId, 'act_123');
  assert.equal(rows[2].accountId, 'ad account east');
});
