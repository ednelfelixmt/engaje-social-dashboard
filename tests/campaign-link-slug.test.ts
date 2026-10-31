import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignHref} from '../src/lib/metrics/campaign-selection';

const filters = {from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_period' as const};
const selection = {platform:'meta_ads' as const,account:'synthetic account',campaign:'opaque/?& synthetic'};

test('campaign links reject empty, padded, dot and invisible tenant slug delimiters', () => {
 const invalid = [
  '', ' ', '.', '..', ' client', 'client ', '\u00a0client', 'client\u00a0',
  'client\u0000name', 'client\tname', 'client\nname', 'client\u001fname',
  'client\u007fname', 'client\u0085name', 'client\u009fname',
  'client\u2028name', 'client\u2029name',
 ];
 for(const slug of invalid) {
  assert.throws(() => campaignHref(slug, filters, selection), /Invalid organization slug/, JSON.stringify(slug));
 }
});

test('campaign links preserve safe encoded slugs, filters and opaque campaign selectors', () => {
 const href = campaignHref('cliente/segmento', filters, selection);
 const url = new URL(href, 'https://example.test');
 assert.equal(url.pathname, '/cliente%2Fsegmento/reports/campaign');
 assert.deepEqual([...url.searchParams.keys()], ['from','to','currency','compare','platform','account','campaign']);
 assert.equal(url.searchParams.get('from'),filters.from);
 assert.equal(url.searchParams.get('to'),filters.to);
 assert.equal(url.searchParams.get('currency'),'BRL');
 assert.equal(url.searchParams.get('compare'),'previous_period');
 assert.equal(url.searchParams.get('platform'),'meta_ads');
 assert.equal(url.searchParams.get('account'),selection.account);
 assert.equal(url.searchParams.get('campaign'),selection.campaign);
});

test('validation does not rewrite the caller filters or selected campaign', () => {
 const beforeFilters = structuredClone(filters), beforeSelection = structuredClone(selection);
 assert.throws(() => campaignHref('bad\u2029slug', filters, selection), /Invalid organization slug/);
 assert.ok(campaignHref('cliente-válido', filters, selection).startsWith('/cliente-v%C3%A1lido/reports/campaign?'));
 assert.deepEqual(filters,beforeFilters);
 assert.deepEqual(selection,beforeSelection);
});


test('CAMPAIGN-DRILLDOWN-INTEGRITY-001: campaign deep links reject invalid dates, periods, currencies and comparisons', () => {
 const invalid = [
  {...filters,from:'2026-02-30'},
  {...filters,to:'2026-02-30'},
  {...filters,from:'2026-10-22'},
  {...filters,from:'2024-01-01'},
  {...filters,currency:'brl'},
  {...filters,currency:'BRLUSD'},
  {...filters,compare:'next_period' as typeof filters.compare},
 ];
 for(const candidate of invalid) {
  assert.throws(() => campaignHref('synthetic-a',candidate,selection), JSON.stringify(candidate));
 }
});

test('CAMPAIGN-DRILLDOWN-INTEGRITY-001: deep links cannot bypass validated provider and opaque campaign IDs', () => {
 const invalid = [
  {...selection,platform:'microsoft_ads' as typeof selection.platform},
  {...selection,account:'bad\u0000account'},
  {...selection,account:'account '},
  {...selection,campaign:'bad\u0085campaign'},
  {...selection,campaign:'x'.repeat(513)},
  {...selection,platform:'meta_ads' as const,account:'act_123'},
 ];
 for(const candidate of invalid) {
  assert.throws(() => campaignHref('synthetic-a',filters,candidate), /Invalid campaign link selection/);
 }
});

test('CAMPAIGN-DRILLDOWN-INTEGRITY-001: valid deep links preserve all selectors and do not mutate input', () => {
 const given = {...filters}, target = {...selection};
 const href=campaignHref('synthetic-a',given,target),url=new URL(href,'https://example.test');
 assert.equal(url.pathname,'/synthetic-a/reports/campaign');
 assert.deepEqual(Object.fromEntries(url.searchParams),{...given,platform:target.platform,account:target.account,campaign:target.campaign});
 assert.deepEqual(given,filters);
 assert.deepEqual(target,selection);
});
