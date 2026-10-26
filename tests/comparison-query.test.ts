import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';
import type {Filters} from '../src/lib/metrics/query';

const query = loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts', import.meta.url), (id, native) => {
 if (id === 'server-only') return {};
 if (id === '@/lib/auth/session') return {tenant: () => {throw new Error('No real Auth in this test');}};
 return native(id);
});
const input: Filters = {from: '2024-02-29', to: '2024-03-01', compare: 'previous_year', currency: 'BRL'};

test('actual query wrapper preserves currency and selected comparison mode', () => {
 assert.deepEqual(query.previous(input), {...input, from: '2023-02-28', to: '2023-03-01'});
});

test('actual dashboard query uses clamped dates with tenant/currency/provider predicates', async () => {
 const calls: {table: string; filters: [string, string, unknown][]}[] = [];
 const db = {from(table: string) {
  const call = {table, filters: [] as [string, string, unknown][]}; calls.push(call);
  const builder = {select() {return builder;}, order() {return builder;},
   eq(key: string, value: unknown) {call.filters.push(['eq', key, value]); return builder;},
   gte(key: string, value: unknown) {call.filters.push(['gte', key, value]); return builder;},
   lte(key: string, value: unknown) {call.filters.push(['lte', key, value]); return builder;},
   range() {return Promise.resolve({data: [], error: null});}};
  return builder;
 }};
 await query.dashboardData(db as unknown as Parameters<typeof query.dashboardData>[0], 'synthetic-organization', input,
  {adsComparison: true, crmComparison: true, organicComparison: true, organicAccountsComparison: true, platform: 'meta_ads'});
 assert.equal(calls.length, 4);
 for (const call of calls) {
  assert.ok(call.filters.some(([op, key, value]) => op === 'eq' && key === 'organization_id' && value === 'synthetic-organization'));
  assert.ok(call.filters.some(([op, key, value]) => op === 'gte' && key === 'metric_date' && value === '2023-02-28'));
  assert.ok(call.filters.some(([op, key, value]) => op === 'lte' && key === 'metric_date' && value === '2023-03-01'));
  if (call.table === 'metrics_ads' || call.table === 'metrics_crm') assert.ok(call.filters.some(([op, key, value]) => op === 'eq' && key === 'currency' && value === 'BRL'));
  if (call.table !== 'metrics_crm') assert.ok(call.filters.some(([op, key, value]) => op === 'eq' && key === 'platform' && value === 'meta_ads'));
 }
});

test('comparison disabled performs no prior-period request', async () => {
 const db = {from() {throw new Error('Comparison must not query when disabled');}};
 const result = await query.dashboardData(db as unknown as Parameters<typeof query.dashboardData>[0], 'synthetic-organization', {...input, compare: 'none'}, {adsComparison: true, crmComparison: true});
 assert.deepEqual(result.adsComparison, []); assert.deepEqual(result.crmComparison, []);
});


test('actual filter accepts two calendar years with a leap day, but refuses a longer range', () => {
 assert.equal(query.filters({from: '2023-03-01', to: '2025-03-01'}, 'America/Cuiaba', 'BRL').from, '2023-03-01');
 assert.throws(() => query.filters({from: '2023-03-01', to: '2025-03-02'}, 'America/Cuiaba', 'BRL'), /até dois anos/);
});
