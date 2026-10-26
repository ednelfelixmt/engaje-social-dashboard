import test from 'node:test';
import assert from 'node:assert/strict';
import type {Row} from '../src/types/database.types';
import {buildRevenueReport, revenueDelta, type RevenueScope} from '../src/lib/reports/revenue-report';
const scope: RevenueScope = {organizationId:'synthetic-a',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',source:'crm',from:'2026-10-20',to:'2026-10-21',compare:'previous_period'};
const fact = (patch: Partial<Row<'metrics_crm'>> = {}) => ({id:'synthetic-current',organization_id:scope.organizationId,source:'crm',metric_date:scope.from,currency:'BRL',channel:'unattributed',account_id:'',campaign_id:'',revenue:100,purchases:2,leads:5,checkouts:3,is_complete:true,synced_at:'2026-10-22T12:00:00.000Z',...patch} as Row<'metrics_crm'>);
const current=()=>[fact(),fact({id:'second-day',metric_date:scope.to,revenue:-20})];
const previous=()=>[fact({id:'prior1',metric_date:'2026-10-18',revenue:20}),fact({id:'prior2',metric_date:'2026-10-19',revenue:20})];

test('revenue report uses one explicit source, signed net revenue and actual calendar comparison',()=>{
 const report=buildRevenueReport([...current(),fact({id:'sheet',source:'spreadsheet',revenue:999})],previous(),scope);
 assert.equal(report.current.totals.revenue,80);assert.equal(report.current.totals.purchases,4);assert.equal(report.current.otherSourceRecords,1);assert.equal(report.current.records,2);assert.equal(report.current.knownDays.revenue,2);assert.equal(report.previous?.from,'2026-10-18');assert.equal(revenueDelta(report,'revenue'),100);
 const sheet=buildRevenueReport([fact({source:'spreadsheet'})],[],{...scope,source:'spreadsheet',to:scope.from,compare:'none'});assert.equal(sheet.current.totals.revenue,100);
});

test('missing dates or incomplete received rows withhold totals instead of adding only known observations',()=>{
 const absent=buildRevenueReport([fact()],[],scope);assert.equal(absent.current.totals.revenue,null);assert.equal(absent.current.days[1].values.revenue,null);assert.equal(absent.current.days[1].sourceIds.length,0);assert.equal(absent.current.knownDays.revenue,1);
 const partial=buildRevenueReport([fact({is_complete:false}),...current().slice(1)],[],scope);assert.equal(partial.current.totals.revenue,null);assert.equal(partial.current.days[0].values.purchases,null);assert.equal(partial.current.reconciledDays,1);
 const mixed=buildRevenueReport([...current(),fact({id:'incomplete-subgrain',channel:'direct',is_complete:false})],[],scope);assert.equal(mixed.current.days[0].reconciled,false);assert.equal(mixed.current.days[0].values.revenue,null);
});

test('known zero survives, metrics fail independently and negative event counts never offset positive counts',()=>{
 const zero=buildRevenueReport(current().map(row=>({...row,revenue:0,purchases:0})),previous().map(row=>({...row,revenue:0})),scope);
 assert.equal(zero.current.totals.revenue,0);assert.equal(zero.current.totals.purchases,0);assert.equal(revenueDelta(zero,'revenue'),null);
 for(const invalid of [null,-1,NaN,Infinity]){
  const rows=current();rows[0].purchases=invalid;const report=buildRevenueReport(rows,previous(),scope);assert.equal(report.current.totals.purchases,null);assert.equal(report.current.totals.revenue,80);assert.equal(revenueDelta(report,'purchases'),null);
 }
 const missing=current();missing[0].revenue=null;assert.equal(buildRevenueReport(missing,[],scope).current.totals.revenue,null);
});

test('overflow remains unavailable at daily and whole-period levels',()=>{
 const across=buildRevenueReport(current().map(row=>({...row,revenue:1e308})),[],scope);assert.equal(across.current.totals.revenue,null);assert.equal(across.current.knownDays.revenue,2);
 const daily=buildRevenueReport([fact({revenue:1e308}),fact({id:'direct',channel:'direct',revenue:1e308}),...current().slice(1)],[],scope);assert.equal(daily.current.days[0].values.revenue,null);assert.equal(daily.current.totals.revenue,null);
});

test('every payload row is scope checked before source filtering, including prior-period facts',()=>{
 for(const patch of [{organization_id:'synthetic-b'},{currency:'USD'},{metric_date:'2026-10-19'},{source:'invalid'}] as Partial<Row<'metrics_crm'>>[]) assert.throws(()=>buildRevenueReport([fact({...patch,source:patch.source??'spreadsheet'})],[],scope),/scope mismatch/);
 assert.throws(()=>buildRevenueReport([], [fact()],scope),/scope mismatch/);
});

test('natural-grain duplicates and Meta aliases are rejected while non-Meta literal accounts remain separate',()=>{
 assert.throws(()=>buildRevenueReport([fact(),fact({id:'duplicate'})],[],scope),/Duplicate/);
 assert.throws(()=>buildRevenueReport([fact(),fact({metric_date:scope.to})],[],scope),/Duplicate/);
 const meta=fact({channel:'meta_ads',account_id:'act_123',campaign_id:'synthetic-campaign'});
 assert.throws(()=>buildRevenueReport([meta,{...meta,id:'alias',account_id:'123'}],[],scope),/Duplicate/);
 assert.throws(()=>buildRevenueReport([{...meta,account_id:'act_'}],[],scope),/Invalid.*grain/);
 const literal=buildRevenueReport([{...meta,channel:'google_ads'},{...meta,id:'literal',channel:'google_ads',account_id:'123'}],[],{...scope,to:scope.from});assert.equal(literal.current.totals.revenue,200);
});

test('switching sources never silently falls back and empty periods preserve every missing day',()=>{
 const report=buildRevenueReport([fact({source:'spreadsheet'})],[],scope);assert.equal(report.current.records,0);assert.equal(report.current.otherSourceRecords,1);assert.equal(report.current.totals.revenue,null);assert.equal(report.current.days.length,2);assert.equal(report.current.reconciledDays,0);
});

test('provenance, source IDs and latest synchronization are deterministic and invalid timestamps remain unknown',()=>{
 const rows=[fact(),fact({id:'direct',channel:'direct',synced_at:'2026-10-23T00:00:00Z'})];
 const a=buildRevenueReport(rows,[],scope),b=buildRevenueReport([...rows].reverse(),[],scope);assert.deepEqual(a,b);assert.deepEqual(a.current.days[0].sourceIds,['direct','synthetic-current']);assert.equal(a.current.days[0].syncedAt,'2026-10-23T00:00:00.000Z');
 rows[0].synced_at='invalid';assert.equal(buildRevenueReport(rows,[],scope).current.days[0].syncedAt,null);
});

test('comparison none and calendar leap-year behavior remain explicit; malformed scopes fail closed',()=>{
 assert.equal(buildRevenueReport([],[],{...scope,compare:'none'}).previous,null);
 assert.throws(()=>buildRevenueReport([],previous(),{...scope,compare:'none'}),/Unexpected/);
 const leap=buildRevenueReport([],[],{...scope,from:'2024-02-29',to:'2024-02-29',compare:'previous_year'});assert.equal(leap.previous?.from,'2023-02-28');
 for(const patch of [{from:'2026-02-30'},{currency:'brl'},{source:'all'},{timezone:'Invalid/zone'}])assert.throws(()=>buildRevenueReport([],[],{...scope,...patch} as RevenueScope));
});
