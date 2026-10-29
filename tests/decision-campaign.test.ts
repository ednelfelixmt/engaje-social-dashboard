import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findComparableCampaign, rankCampaignDecisionImpacts} from '../src/lib/metrics/decision-campaign';
import type {CampaignPerformance} from '../src/types/domain';

const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const campaign = (override: Partial<CampaignPerformance> = {}): CampaignPerformance => ({
  organizationId: orgA,
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
    campaign({organizationId: orgB, spend: 800}),
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
  assert.match(source, /rankCampaignDecisionImpacts\(campaigns,previousCampaigns,comparing\)/);
  const helper = readFileSync('src/lib/metrics/decision-campaign.ts', 'utf8');
  assert.match(helper, /findComparableCampaign\(row, previous\)/);
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


test('decision comparison rejects RFC-invalid organization identity in either period', () => {
  for (const invalid of [
    'tenant-a',
    '11111111-1111-0111-8111-111111111111',
    '11111111-1111-9111-8111-111111111111',
    '11111111-1111-4111-7111-111111111111',
    '11111111-1111-4111-c111-111111111111',
  ]) {
    assert.equal(findComparableCampaign(campaign({organizationId: invalid}), [campaign({organizationId: invalid})]), null);
    assert.equal(findComparableCampaign(campaign(), [campaign({organizationId: invalid})]), null);
  }
});

test('decision comparison accepts legitimate v7 identity but not a different tenant', () => {
  const uuidV7 = '123e4567-e89b-7d3a-a456-426614174000';
  const current = campaign({organizationId: uuidV7, spend: 0});
  const previous = campaign({organizationId: uuidV7, spend: 30});
  assert.equal(findComparableCampaign(current, [previous]), previous);
  assert.equal(findComparableCampaign(current, [campaign({organizationId: orgA})]), null);
});

test('SEC-DECISION-GRAIN-001: malformed provider, account or campaign identities never match themselves', () => {
  const malformed: Partial<CampaignPerformance>[] = [
    {platform: ' ' as CampaignPerformance['platform']},
    {platform: ' meta_ads' as CampaignPerformance['platform']},
    {platform: 'meta_ads ' as CampaignPerformance['platform']},
    {accountId: ' '},
    {accountId: ' act_123'},
    {accountId: 'act_123 '},
    {accountId: 'act_ '},
    {accountId: '\t123'},
    {campaignId: ' '},
    {campaignId: ' shared-campaign-id'},
    {campaignId: 'shared-campaign-id '},
    {campaignId: '\t'},
  ];
  for (const override of malformed) {
    const source = campaign(override);
    assert.equal(findComparableCampaign(source, [source]), null, JSON.stringify(override));
    assert.equal(findComparableCampaign(campaign(), [source]), null, JSON.stringify(override));
  }
});

test('SEC-DECISION-GRAIN-001: clean identities, Meta aliases and measured zero remain comparable', () => {
  const current = campaign({accountId: 'act_123', spend: 0, leads: 0});
  const previous = campaign({accountId: '123', spend: 40, leads: 5});
  assert.equal(findComparableCampaign(current, [previous]), previous);
  assert.equal(findComparableCampaign(previous, [current]), current);
  assert.equal(findComparableCampaign(current, [campaign({campaignId: 'shared-campaign-id '})]), null);
  assert.equal(findComparableCampaign(current, [campaign({platform: 'google_ads'})]), null);
});

test('DECISION-CPL-001: scale requires a comparable prior period with strictly improved validated CPL', () => {
  const current = campaign({spend: 80, leads: 8});
  const prior = campaign({spend: 100, leads: 4});
  const improving = rankCampaignDecisionImpacts([current], [prior], true)[0];
  assert.equal(improving.cpl, 10);
  assert.equal(improving.recommendation, 'scale');
  const equal = rankCampaignDecisionImpacts([current], [campaign({spend: 40, leads: 4})], true)[0];
  assert.equal(equal.recommendation, 'evaluate', 'unchanged CPL is not independent proof of improvement');
  assert.equal(rankCampaignDecisionImpacts([current], [prior], false)[0].recommendation, 'evaluate');
  assert.equal(rankCampaignDecisionImpacts([current], [], true)[0].recommendation, 'evaluate');
  assert.equal(rankCampaignDecisionImpacts([current], [campaign({organizationId: orgB, spend: 200, leads: 1})], true)[0].recommendation, 'evaluate');
  assert.equal(rankCampaignDecisionImpacts([current], [campaign({currency: 'USD', spend: 200, leads: 1})], true)[0].recommendation, 'evaluate');
  assert.equal(rankCampaignDecisionImpacts([current], [prior, {...prior}], true)[0].recommendation, 'evaluate');
  assert.equal(rankCampaignDecisionImpacts([campaign({spend: 100, leads: 4})], [prior], true)[0].recommendation, 'evaluate');
  assert.equal(rankCampaignDecisionImpacts([campaign({spend: 200, leads: 4})], [prior], true)[0].recommendation, 'review');
});

test('DECISION-CPL-001: invalid leads, zero denominator and arithmetic overflow never qualify for scaling', () => {
  for (const leads of [null, 0, -2, Number.NaN, Number.POSITIVE_INFINITY, 1e-308]) {
    const candidate = campaign({spend: leads === 1e-308 ? 1e308 : 100, leads});
    const ranked = rankCampaignDecisionImpacts([candidate], [campaign({spend: 100, leads: 5})], true);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].cpl, null);
    assert.equal(ranked[0].recommendation, 'review');
  }
  assert.deepEqual(rankCampaignDecisionImpacts([campaign({spend: 0}), campaign({spend: -1}), campaign({spend: Infinity})], [], true), []);
  const genuineZero = rankCampaignDecisionImpacts([campaign({spend: Number.MIN_VALUE, leads: 1})], [], true)[0];
  assert.equal(genuineZero.cpl, Number.MIN_VALUE);
  assert.equal(genuineZero.recommendation, 'evaluate');
});

test('DECISION-CPL-001: identical campaign IDs in distinct accounts retain distinct stable presentation keys', () => {
  const first = campaign({accountId: 'act_123', leads: 5});
  const second = campaign({accountId: 'act_456', leads: 10});
  const ranked = rankCampaignDecisionImpacts([first, second], [], false);
  assert.equal(ranked.length, 2);
  assert.notEqual(ranked[0].decisionKey, ranked[1].decisionKey);
  assert.equal(ranked[0].accountId, 'act_456');
  assert.deepEqual(rankCampaignDecisionImpacts([second, first], [], false).map(item => item.decisionKey), ranked.map(item => item.decisionKey));
});

test('DECISION-CPL-001: decision dashboard displays valid CPL and an explicit neutral evaluation state', () => {
  const source = readFileSync('src/components/dashboard/decision-analysis.tsx', 'utf8');
  assert.match(source, /rankCampaignDecisionImpacts\(campaigns,previousCampaigns,comparing\)/);
  assert.match(source, /campaignCpl\(row\.spend,row\.leads\)/);
  assert.match(source, /Avaliar/);
  assert.match(source, /key=\{row\.decisionKey\}/);
  assert.doesNotMatch(source, /row\.spend\/row\.leads|row\.positive|before\.spend\/before\.leads/);
});
