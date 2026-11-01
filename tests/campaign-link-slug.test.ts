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
