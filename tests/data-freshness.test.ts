import test from 'node:test';import assert from 'node:assert/strict';import {paidDataFreshness,currentPeriodFreshness} from '../src/lib/metrics/data-freshness';
import {readFileSync} from 'node:fs';
test('staleness reflects tenant business date',()=>{assert.deepEqual(paidDataFreshness(['2026-10-20','2026-10-23'],'2026-10-25'),{status:'recent',latest:'2026-10-23',daysOld:2});assert.deepEqual(paidDataFreshness(['2026-10-21'],'2026-10-25'),{status:'delayed',latest:'2026-10-21',daysOld:4});});
test('future, empty and malformed records never appear as fresh',()=>{assert.deepEqual(paidDataFreshness(['2026-10-26'],'2026-10-25'),{status:'empty',latest:null,daysOld:null});assert.equal(paidDataFreshness([],'2026-10-25').status,'empty');});

test('invalid calendar dates do not count as fresh',()=>{assert.deepEqual(paidDataFreshness(['2026-02-30'],'2026-03-01'),{status:'empty',latest:null,daysOld:null});assert.equal(paidDataFreshness(['2026-02-28'],'2026-02-30').status,'empty');});

test('historical reporting periods do not falsely diagnose delayed provider collection',()=>{
 assert.equal(currentPeriodFreshness(['2024-01-20'],'2024-01-31','2026-10-26'),null);
 assert.equal(currentPeriodFreshness(['2026-10-20'],'2026-10-25','2026-10-26'),null);
 assert.equal(currentPeriodFreshness(['2026-10-20'],'2026-10-27','2026-10-26'),null);
});

test('current period warns only when its valid measurements are delayed',()=>{
 assert.deepEqual(currentPeriodFreshness(['2026-10-20','2026-10-22'],'2026-10-26','2026-10-26'),{status:'delayed',latest:'2026-10-22',daysOld:4});
 assert.equal(currentPeriodFreshness(['2026-10-24'],'2026-10-26','2026-10-26'),null);
 assert.equal(currentPeriodFreshness(['2026-10-26'],'2026-10-26','2026-10-26'),null);
});

test('invalid or future-only dates in the current period are never described as fresh',()=>{
 assert.deepEqual(currentPeriodFreshness(['2026-10-27','2026-02-30'],'2026-10-26','2026-10-26'),{status:'empty',latest:null,daysOld:null});
 assert.equal(currentPeriodFreshness([],'2026-10-26','2026-10-26'),null);
});

test('actual tenant dashboard uses selected end date and handles unavailable source dates',()=>{
 const source=readFileSync(new URL('../src/app/(tenant)/[organizationSlug]/[section]/page.tsx',import.meta.url),'utf8');
 assert.match(source,/currentPeriodFreshness\(ads\.map\(r=>r\.metric_date\),f\.to,today\)/);
 assert.match(source,/freshness\?\.status==='empty'/);
});

test('DATA-FRESH-MIXED-001: fresh and delayed periods expose mixed impossible or future source dates',()=>{
 assert.deepEqual(currentPeriodFreshness(['2026-10-26','2026-02-30','2026-10-27'],'2026-10-26','2026-10-26'),{status:'invalid',latest:'2026-10-26',daysOld:0});
 assert.deepEqual(currentPeriodFreshness(['2026-10-22','2026-10-27'],'2026-10-26','2026-10-26'),{status:'invalid',latest:'2026-10-22',daysOld:4});
 assert.deepEqual(currentPeriodFreshness(['2026-10-26','2026-10-25'],'2026-10-26','2026-10-26'),null);
});

test('DATA-FRESH-MIXED-001: invalid-only sources remain unavailable and historical dates receive no warning',()=>{
 assert.deepEqual(currentPeriodFreshness(['2026-02-30','2026-10-27'],'2026-10-26','2026-10-26'),{status:'empty',latest:null,daysOld:null});
 assert.equal(currentPeriodFreshness(['2026-10-25','2026-02-30'],'2026-10-25','2026-10-26'),null);
 const page=readFileSync(new URL('../src/app/(tenant)/[organizationSlug]/[section]/page.tsx',import.meta.url),'utf8');
 assert.match(page,/freshness\?\.status==='invalid'/);
 assert.match(page,/Datas de anúncios inconsistentes/);
});
