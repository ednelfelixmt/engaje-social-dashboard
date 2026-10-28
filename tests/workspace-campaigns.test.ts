import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasWorkspaceMeasurements, scopedWorkspaceMeasurements} from '../src/lib/metrics/workspace-campaigns';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';

const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const observed = (patch: Partial<CampaignPerformance> = {}): CampaignPerformance => ({
  organizationId: orgA,
  currency: 'BRL',
  spend: 0,
  impressions: 0,
  clicks: 0,
  leads: null,
  revenue: null,
  purchases: null,
  metricValues: {spend: 0, impressions: 0, clicks: 0, leads: null},
  ...patch,
} as CampaignPerformance);
const catalog = (patch: Partial<CampaignPerformance> = {}): CampaignPerformance =>
  observed({currency: '', metricValues: {}, ...patch});

test('workspace retains a recorded zero even with unknown leads/revenue', () => {
  const zero = observed();
  assert.equal(hasWorkspaceMeasurements(zero), true);
  assert.deepEqual(scopedWorkspaceMeasurements([zero], orgA, 'BRL'), [zero]);
  const summary = paidSummary(scopedWorkspaceMeasurements([zero], orgA, 'BRL'));
  assert.equal(summary.spend, 0);
  assert.equal(summary.leads, null);
  assert.equal(summary.cpl, null);
});

test('empty catalog placeholders are not counted but observed zero stays visible', () => {
  const zero = observed();
  const unmeasured = catalog();
  assert.equal(hasWorkspaceMeasurements(unmeasured), false);
  assert.deepEqual(scopedWorkspaceMeasurements([unmeasured, zero], orgA, 'BRL'), [zero]);
  assert.deepEqual(scopedWorkspaceMeasurements([unmeasured], orgA, 'BRL'), []);
  assert.deepEqual(scopedWorkspaceMeasurements([], orgA, 'BRL'), []);
});

test('legacy projections still recognize explicit scalar facts without metricValues', () => {
  assert.equal(hasWorkspaceMeasurements(catalog({currency: 'BRL', leads: 0})), true);
  assert.equal(hasWorkspaceMeasurements(catalog({currency: 'BRL', spend: 1})), true);
  assert.equal(hasWorkspaceMeasurements(observed({metricValues: {spend: null}})), true);
});

test('workspace requires an authenticated tenant UUID and ISO-3 currency even when empty', () => {
  for (const id of ['', 'not-a-uuid', ' ', '11111111']) {
    assert.throws(() => scopedWorkspaceMeasurements([], id, 'BRL'), /authorized organization and currency/);
  }
  for (const currency of ['', 'brl', 'BRLUSD', ' BRL']) {
    assert.throws(() => scopedWorkspaceMeasurements([], orgA, currency), /authorized organization and currency/);
  }
});

test('foreign observations and catalog-only rows reject the entire workspace', () => {
  for (const foreign of [observed({organizationId: orgB}), catalog({organizationId: orgB})]) {
    assert.throws(() => scopedWorkspaceMeasurements([observed(), foreign], orgA, 'BRL'), /authorized organization and currency/);
    assert.throws(() => scopedWorkspaceMeasurements([foreign], orgA, 'BRL'), /authorized organization and currency/);
  }
});

test('observed foreign currency cannot be dropped or partially included', () => {
  for (const foreign of [observed({currency: 'USD'}), observed({currency: ''}), catalog({currency: 'USD'})]) {
    assert.throws(() => scopedWorkspaceMeasurements([observed(), foreign], orgA, 'BRL'), /authorized organization and currency/);
  }
  assert.deepEqual(scopedWorkspaceMeasurements([catalog()], orgA, 'BRL'), []);
});

test('workspace validates current and previous inputs before rendering private analytics', () => {
  const source = readFileSync('src/components/dashboard/campaign-workspace.tsx', 'utf8');
  const route = readFileSync('src/app/(tenant)/[organizationSlug]/[section]/page.tsx', 'utf8');
  assert.match(source, /scopedWorkspaceMeasurements\(rows, organizationId, currency\)/);
  assert.match(source, /scopedWorkspaceMeasurements\(previousRows, organizationId, currency\)/);
  assert.doesNotMatch(source, /rows\.filter\(hasMeasuredPerformance\)/);
  assert.match(route, /<CampaignWorkspace organizationId=\{org\.id\}/);
});

test('executive and platform projections retain measured zero and ignore catalog-only rows', () => {
  const zero = observed({leads: 0, metricValues: {spend: 0, impressions: 0, clicks: 0, leads: 0}});
  const selected = scopedWorkspaceMeasurements([catalog(), zero], orgA, 'BRL');
  assert.deepEqual(selected, [zero]);
  const total = paidSummary(selected);
  assert.equal(total.spend, 0);
  assert.equal(total.impressions, 0);
  assert.equal(total.clicks, 0);
  assert.equal(total.leads, 0);
  // Before this projection, a catalog placeholder could invalidate every
  // aggregate with an absent observation despite a measured zero in the same period.
  assert.equal(paidSummary([catalog(), zero]).spend, null);
});

test('current and previous projections preserve zero without inventing an empty period', () => {
  const zero = observed();
  for (const period of [[zero, catalog()], [catalog(), zero]]) {
    const selected = scopedWorkspaceMeasurements(period, orgA, 'BRL');
    assert.deepEqual(selected, [zero]);
    assert.equal(paidSummary(selected).spend, 0);
    assert.equal(paidSummary(selected).leads, null);
  }
  assert.deepEqual(scopedWorkspaceMeasurements([catalog()], orgA, 'BRL'), []);
});

test('executive KPIs, platform KPIs and rankings consume scoped measured rows', () => {
  const route = readFileSync('src/app/(tenant)/[organizationSlug]/[section]/page.tsx', 'utf8');
  const executive = readFileSync('src/components/dashboard/executive-overview-v2.tsx', 'utf8');
  assert.match(route, /const measuredCampaigns = scopedWorkspaceMeasurements\(currentCampaigns, org\.id, f\.currency\)/);
  assert.match(route, /const measuredPreviousCampaigns = scopedWorkspaceMeasurements\(previousCampaigns, org\.id, f\.currency\)/);
  assert.match(route, /<ExecutiveOverviewV2 rows=\{executiveShape\(measuredCampaigns\)\} previous=\{f\.compare==='none'\?\[\]:executiveShape\(measuredPreviousCampaigns\)\}/);
  assert.match(route, /<PlatformAnalyticsV3 rows=\{platformRows\(measuredCampaigns\)\} previous=\{f\.compare==='none'\?\[\]:platformRows\(measuredPreviousCampaigns\)\}/);
  assert.match(route, /preparePerformanceRankings\(measuredCampaigns, ads, breakdowns/);
  assert.doesNotMatch(route, /campaignsWithMovement/);
  assert.match(executive, /const campaigns=\[\.\.\.rows\]\.sort\(/);
  assert.doesNotMatch(executive, /const campaigns=\[\.\.\.rows\]\.filter\(/);
});

test('SEC-CAMP-UUID-001: workspace rejects malformed RFC UUIDs even with no measurements',()=>{
  for(const invalidId of [
    '11111111-1111-0111-8111-111111111111',
    '11111111-1111-9111-8111-111111111111',
    '11111111-1111-4111-7111-111111111111',
    '11111111-1111-4111-8111-111111111111x',
  ]){
    assert.throws(()=>scopedWorkspaceMeasurements([],invalidId,'BRL'),/authorized organization and currency/,invalidId);
    assert.throws(()=>scopedWorkspaceMeasurements([observed({organizationId:invalidId})],invalidId,'BRL'),/authorized organization and currency/);
  }
  const validV7='01933a7b-4f88-7a12-8d29-111111111111';
  assert.deepEqual(scopedWorkspaceMeasurements([],validV7,'BRL'),[]);
  assert.equal(scopedWorkspaceMeasurements([observed({organizationId:validV7})],validV7,'BRL').length,1);
});
