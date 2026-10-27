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
