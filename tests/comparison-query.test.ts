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

test('multi-page account, campaign and creative reads have a deterministic unique tie-breaker', async () => {
 // Every record shares the same date or campaign name: sorting on that column
 // alone leaves the 1,000-row pagination boundary nondeterministic in SQL.
 const tables = ['metrics_organic_accounts', 'ad_campaigns', 'creatives'] as const;
 const fixtures: Record<string, {id: string; organization_id: string}[]> = Object.fromEntries(
  tables.map(table => [table, Array.from({length: 1001}, (_, i) => ({
   id: table + '-' + String(i).padStart(4, '0'),
   organization_id: 'synthetic-pagination-tenant',
  }))]),
 );
 const calls: {table: string; orders: string[]; tenantFilters: [string, unknown][]; from: number; to: number}[] = [];
 const db = {from(table: string) {
  const orders: string[] = [];
  const tenantFilters: [string, unknown][] = [];
  const builder = {
   select() {return builder;},
   order(column: string) {orders.push(column); return builder;},
   eq(column: string, value: unknown) {tenantFilters.push([column, value]); return builder;},
   gte() {return builder;},
   lte() {return builder;},
   range(from: number, to: number) {
    calls.push({table, orders: [...orders], tenantFilters: [...tenantFilters], from, to});
    return Promise.resolve({data: (fixtures[table] ?? []).slice(from, to + 1), error: null});
   },
  };
  return builder;
 }};
 const result = await query.dashboardData(
  db as unknown as Parameters<typeof query.dashboardData>[0],
  'synthetic-pagination-tenant', {...input, compare: 'none'},
  {organicAccounts: true, adCampaigns: true, creatives: true, creativePeriod: false},
 );
 for (const table of tables) {
  const pages = calls.filter(call => call.table === table);
  assert.deepEqual(pages.map(page => [page.from, page.to]), [[0, 999], [1000, 1999]]);
  const expectedOrders = table === 'metrics_organic_accounts' ? ['metric_date', 'id']
   : table === 'ad_campaigns' ? ['name', 'id'] : ['published_at', 'id'];
  for (const page of pages) {
   assert.deepEqual(page.orders, expectedOrders, table + ' must sort ties by the unique id');
   assert.ok(page.tenantFilters.some(([column, value]) =>
    column === 'organization_id' && value === 'synthetic-pagination-tenant'), 'tenant filter must remain');
  }
 }
 for (const [table, records] of [
  ['metrics_organic_accounts', result.organicAccounts],
  ['ad_campaigns', result.adCampaigns],
  ['creatives', result.creatives],
 ] as const) {
  const ids = records.map(row => row.id);
  assert.equal(ids.length, 1001, table + ' must retain rows on both pages');
  assert.equal(new Set(ids).size, 1001, table + ' must not repeat rows');
  assert.deepEqual(ids, fixtures[table].map(row => row.id));
 }
});
