import test from 'node:test';
import assert from 'node:assert/strict';
import {intelligenceCampaignShape} from '../src/lib/metrics/intelligence-campaigns.ts';
import type {CampaignPerformance} from '../src/types/domain';

const organizationId = 'synthetic-tenant-a';
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
  const result = intelligenceCampaignShape([campaign()], organizationId);
  assert.deepEqual(result, [{
    id: 'meta_ads:act_synthetic:campaign-zero',
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
  })], organizationId);
  assert.equal(result.length, 1);
  assert.equal(result[0].spend, 0);
  assert.equal(result[0].leads, null);
  assert.equal(result[0].revenue, null);
});

test('catalog-only placeholders are excluded, including when mixed with measured campaigns', () => {
  const catalog = campaign({campaignId: 'catalog-only', metricValues: {}, revenue: null, leads: null});
  const measured = campaign({campaignId: 'observed'});
  assert.deepEqual(intelligenceCampaignShape([catalog], organizationId), []);
  assert.deepEqual(intelligenceCampaignShape([catalog, measured], organizationId).map(row => row.id),
    ['meta_ads:act_synthetic:observed']);
});

test('missing authorization or a cross-tenant campaign fails closed even for catalog-only rows', () => {
  assert.throws(() => intelligenceCampaignShape([campaign()], ''), /authorized organization/);
  assert.throws(() => intelligenceCampaignShape([
    campaign(), campaign({organizationId: 'synthetic-tenant-b', metricValues: {}}),
  ], organizationId), /authorized organization/);
  assert.deepEqual(intelligenceCampaignShape([], organizationId), []);
});

test('the authenticated Intelligence page applies the observed-fact selector to both periods', async () => {
  const {readFileSync} = await import('node:fs');
  const source = readFileSync(new URL('../src/app/(tenant)/[organizationSlug]/intelligence/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /intelligenceCampaignShape\(current,org\.id\)/);
  assert.match(source, /intelligenceCampaignShape\(previous,org\.id\)/);
  assert.doesNotMatch(source, /\.filter\(r=>r\.spend>0\|\|/);
});
