import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findComparableCampaign} from '../src/lib/metrics/decision-campaign';
import type {CampaignPerformance} from '../src/types/domain';

const campaign = (override: Partial<CampaignPerformance> = {}): CampaignPerformance => ({
  organizationId: 'tenant-a',
  platform: 'meta_ads',
  accountId: 'act_123',
  campaignId: 'shared-campaign-id',
  campaignName: 'Synthetic campaign',
  currency: 'BRL',
  spend: 100,
  leads: 5,
  ...override,
} as CampaignPerformance);

test('decision comparison matches tenant, provider, account, campaign and currency', () => {
  const current = campaign();
  const correct = campaign({spend: 80});
  const collisions = [
    campaign({organizationId: 'tenant-b', spend: 800}),
    campaign({platform: 'google_ads', spend: 700}),
    campaign({accountId: 'act_456', spend: 600}),
    campaign({campaignId: 'different-id', spend: 500}),
    campaign({currency: 'USD', spend: 400}),
  ];
  assert.equal(findComparableCampaign(current, [...collisions, correct]), correct);
});

test('Meta account ids with and without act_ match only within the same full scope', () => {
  const current = campaign({accountId: 'act_123'});
  const prior = campaign({accountId: '123', spend: 70});
  assert.equal(findComparableCampaign(current, [prior]), prior);
  assert.equal(findComparableCampaign(prior, [current]), current);
  assert.equal(findComparableCampaign(current, [campaign({accountId: '124'})]), null);
});

test('ambiguous duplicate prior-period matches cannot select an arbitrary record', () => {
  assert.equal(findComparableCampaign(campaign(), [campaign({spend: 20}), campaign({spend: 30})]), null);
  assert.equal(findComparableCampaign(campaign(), [campaign({accountId: '123'}), campaign({accountId: 'act_123'})]), null);
});

test('unknown or malformed campaign grain never matches historical results', () => {
  for (const override of [
    {organizationId: ''},
    {platform: '' as CampaignPerformance['platform']},
    {accountId: ''},
    {accountId: 'act_'},
    {campaignId: ''},
    {currency: ''},
    {currency: 'usd'},
  ]) {
    assert.equal(findComparableCampaign(campaign(override), [campaign(override)]), null);
  }
  assert.equal(findComparableCampaign(campaign(), []), null);
});

test('decision-analysis uses the scoped historical matcher instead of campaignId alone', () => {
  const source = readFileSync('src/components/dashboard/decision-analysis.tsx', 'utf8');
  assert.match(source, /findComparableCampaign\(row,previousCampaigns\)/);
  assert.doesNotMatch(source, /previousCampaigns\.find\(\(item\)=>item\.campaignId===row\.campaignId\)/);
});


test('act_ is a literal non-Meta account prefix and does not match another account', () => {
  for (const platform of ['google_ads','tiktok_ads','microsoft_ads'] as const) {
    const prefixed = campaign({platform, accountId: 'act_123'});
    const plain = campaign({platform, accountId: '123'});
    assert.equal(findComparableCampaign(prefixed, [plain]), null, platform);
    assert.equal(findComparableCampaign(plain, [prefixed]), null, platform);
    assert.equal(findComparableCampaign(prefixed, [campaign({platform, accountId: 'act_123'})])?.accountId, 'act_123', platform);
  }
});
