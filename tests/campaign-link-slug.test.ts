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

test('CAMP-NAV-SLUG-PARITY-001: campaign links refuse hidden Unicode format controls and malformed UTF-16',()=>{
 const codes=[0x00AD,0x061C,0x200B,0x200E,0x200F,0x202A,0x202E,0x2060,0x2061,0x2065,0x2066,0x2069,0x206A,0x206F,0xFEFF];
 const invalid=[...codes.map(code=>'cliente'+String.fromCodePoint(code)+'loja'),
  'cliente'+String.fromCharCode(0xD800),'cliente'+String.fromCharCode(0xDC00),
  'cliente😀'+String.fromCharCode(0xD800)];
 const unchangedFilters=structuredClone(filters),unchangedSelection=structuredClone(selection);
 for(const slug of invalid)assert.throws(()=>campaignHref(slug,filters,selection),/Invalid organization slug/,JSON.stringify(slug));
 assert.deepEqual(filters,unchangedFilters);
 assert.deepEqual(selection,unchangedSelection);
});

test('CAMP-NAV-SLUG-PARITY-001: safe visible Unicode, emoji joiners and selectors remain intact',()=>{
 const slug='Café🧑‍💻/filial',beforeFilters=structuredClone(filters),beforeSelection=structuredClone(selection);
 const href=campaignHref(slug,filters,selection),url=new URL(href,'https://synthetic.example');
 assert.equal(url.pathname,'/Caf%C3%A9%F0%9F%A7%91%E2%80%8D%F0%9F%92%BB%2Ffilial/reports/campaign');
 assert.deepEqual([...url.searchParams.keys()],['from','to','currency','compare','platform','account','campaign']);
 for(const [key,value] of Object.entries({...filters,...selection}))assert.equal(url.searchParams.get(key),value);
 assert.deepEqual(filters,beforeFilters);
 assert.deepEqual(selection,beforeSelection);
});
