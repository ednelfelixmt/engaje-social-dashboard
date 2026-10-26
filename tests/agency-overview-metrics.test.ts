import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAgencyAds, summarizeClientAds, type AgencyAdRow} from '../src/lib/metrics/agency-overview';

// Synthetic identities and measurements only; no production customer fixtures.
const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
function fact(overrides: Partial<AgencyAdRow> = {}): AgencyAdRow {
  return {organization_id: orgA, currency: 'BRL', spend: 100, impressions: 1000,
    reach: 800, clicks: 12, leads: 4, ...overrides};
}

test('single observed grain keeps known reach, zero and weighted CPL', () => {
  const result = summarizeClientAds(orgA, 'BRL', [fact()]);
  assert.deepEqual(result, {spend: 100, impressions: 1000, reach: 800, leads: 4, cpl: 25, currency: 'BRL'});
  const zero = summarizeClientAds(orgA, 'BRL', [fact({spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0})]);
  assert.equal(zero.spend, 0);
  assert.equal(zero.reach, 0);
  assert.equal(zero.leads, 0);
  assert.equal(zero.cpl, null);
});

test('agency and customer cards cannot add people across rows or tenants', () => {
  const sameOrg = summarizeClientAds(orgA, 'BRL', [fact(), fact({spend: 50, reach: 700, leads: 6})]);
  assert.equal(sameOrg.spend, 150);
  assert.equal(sameOrg.leads, 10);
  assert.equal(sameOrg.cpl, 15);
  assert.equal(sameOrg.reach, null);
  const portfolio = summarizeAgencyAds([fact(), fact({organization_id: orgB})]);
  assert.equal(portfolio.spend, 200);
  assert.equal(portfolio.leads, 8);
  assert.equal(portfolio.reach, null);
});

test('customer summary rejects facts belonging to other organizations', () => {
  assert.throws(() => summarizeClientAds(orgA, 'BRL', [fact(), fact({organization_id: orgB})]), /matching organization/);
  assert.throws(() => summarizeClientAds(orgA, 'BRL', [fact({organization_id: orgB})]), /matching organization/);
});

test('unknown or invalid monetary currency never becomes a converted total', () => {
  for (const rows of [
    [fact(), fact({currency: 'USD'})],
    [fact({currency: 'brl'})],
    [fact({currency: 'BR1'})],
  ]) {
    const result = summarizeAgencyAds(rows);
    assert.equal(result.spend, null);
    assert.equal(result.cpl, null);
    assert.equal(result.currency, null);
  }
  const mismatchedClient = summarizeClientAds(orgA, 'USD', [fact()]);
  assert.equal(mismatchedClient.spend, null);
  assert.equal(mismatchedClient.cpl, null);
  assert.equal(mismatchedClient.currency, null);
});

test('missing and invalid additive observations do not masquerade as partial complete totals', () => {
  const missing = summarizeClientAds(orgA, 'BRL', [fact(), fact({leads: null, impressions: null})]);
  assert.equal(missing.spend, 200);
  assert.equal(missing.leads, null);
  assert.equal(missing.impressions, null);
  assert.equal(missing.cpl, null);

  const invalid = summarizeAgencyAds([fact(), fact({spend: -20, impressions: -1, leads: -3})]);
  assert.equal(invalid.spend, null);
  assert.equal(invalid.impressions, null);
  assert.equal(invalid.leads, null);
  assert.equal(invalid.cpl, null);
});

test('nonfinite and overflowing observations cannot reach agency metrics', () => {
  const bad = summarizeAgencyAds([fact({spend: 1e308}), fact({spend: 1e308})]);
  assert.equal(bad.spend, null);
  assert.equal(bad.cpl, null);
  assert.equal(summarizeAgencyAds([fact({reach: Number.POSITIVE_INFINITY})]).reach, null);
  assert.equal(summarizeAgencyAds([fact({reach: -1})]).reach, null);
});

test('empty portfolio has unknown metrics instead of fabricated zero', () => {
  assert.deepEqual(summarizeAgencyAds([]), {
    spend: null, impressions: null, reach: null, leads: null, cpl: null, currency: null,
  });
});
