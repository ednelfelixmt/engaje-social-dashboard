import test from 'node:test';
import assert from 'node:assert/strict';
import type {Row} from '../src/types/database.types';
import {buildTargetReferences,targetFields,type TargetConfig,type TargetScope} from '../src/lib/reports/target-references';
const scope: TargetScope = {organizationId:'synthetic-a',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',referenceCurrency:'BRL',from:'2026-10-20',to:'2026-10-21',generatedAt:'2026-10-26T12:00:00.000Z'};
const fact = (patch: Partial<Row<'metrics_ads'>> = {}) => ({id:'synthetic-one',organization_id:scope.organizationId,metric_date:scope.from,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic-campaign',campaign_name:'Synthetic',ad_id:'synthetic-ad',currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads'>);
const config = (patch: Partial<TargetConfig> = {}) => ({...Object.fromEntries(targetFields.map(key=>[key,null])),organization_id:scope.organizationId,target_spend:200,target_leads:10,target_cpl:20,target_ctr:2,...patch} as TargetConfig);
const facts = () => [fact(),fact({id:'synthetic-two',metric_date:scope.to})];
const get = (report: ReturnType<typeof buildTargetReferences>, field: typeof targetFields[number]) => report.rows.find(row=>row.field===field)!;

test('reference comparisons use canonical totals and factual below/equal/above positions',()=>{
 const report=buildTargetReferences(facts(),config(),scope);assert.equal(report.configured,4);assert.equal(report.receivedDays,2);assert.equal(report.expectedDays,2);
 for(const [field,value] of [['target_spend',200],['target_leads',10],['target_cpl',20],['target_ctr',2]] as const){const row=get(report,field);assert.equal(row.actual,value);assert.equal(row.status,'equal');assert.equal(row.difference,0);assert.equal(row.knownDays,2);}
 const varied=buildTargetReferences(facts(),config({target_spend:100,target_leads:20}),scope);assert.equal(get(varied,'target_spend').status,'above');assert.equal(get(varied,'target_spend').difference,100);assert.equal(get(varied,'target_leads').status,'below');assert.equal(get(varied,'target_leads').difference,-10);
});

test('zero targets and observed zero remain valid without creating rates from zero denominators',()=>{
 const report=buildTargetReferences(facts().map(row=>({...row,spend:0,leads:0,impressions:0,clicks:0})),config({target_spend:0,target_leads:0,target_cpl:0,target_ctr:0}),scope);
 for(const key of ['target_spend','target_leads'] as const){assert.equal(get(report,key).actual,0);assert.equal(get(report,key).target,0);assert.equal(get(report,key).status,'equal');}
 for(const key of ['target_cpl','target_ctr'] as const){assert.equal(get(report,key).actual,null);assert.equal(get(report,key).status,'insufficient_data');assert.ok(get(report,key).reason.includes('denominador zero'));}
});

test('target values are never coerced from strings, booleans or non-finite numbers',()=>{
 for(const invalid of ['', '0', '10', false, true, NaN, Infinity, -1]){
  const report=buildTargetReferences(facts(),config({target_spend:invalid as number}),scope);assert.equal(get(report,'target_spend').status,'invalid_target');assert.equal(get(report,'target_spend').target,null);assert.equal(get(report,'target_spend').actual,200);assert.equal(get(report,'target_spend').difference,null);
 }
 const absent=buildTargetReferences(facts(),config({target_spend:null}),scope);assert.equal(get(absent,'target_spend').status,'not_configured');assert.equal(get(absent,'target_spend').actual,200);
});

test('missing calendar days prevent comparison with a period reference instead of silently summing a subset',()=>{
 const report=buildTargetReferences([fact()],config(),scope);assert.equal(report.receivedDays,1);
 for(const key of ['target_spend','target_leads','target_cpl','target_ctr'] as const){const row=get(report,key);assert.equal(row.actual,null);assert.equal(row.status,'insufficient_data');assert.equal(row.knownDays,1);assert.equal(row.difference,null);}
 const empty=buildTargetReferences([],config(),scope);assert.equal(empty.receivedDays,0);assert.equal(get(empty,'target_spend').actual,null);
});

test('unknown, negative and overflowing observations cannot be compensated; coverage is metric-specific',()=>{
 for(const invalid of [null,-1,NaN,Infinity]){
  const rows=facts();rows[0].leads=invalid;const report=buildTargetReferences(rows,config(),scope);assert.equal(get(report,'target_leads').actual,null);assert.equal(get(report,'target_leads').knownDays,1);assert.equal(get(report,'target_cpl').actual,null);assert.equal(get(report,'target_spend').actual,200);assert.equal(get(report,'target_ctr').actual,2);
 }
 const overflow=buildTargetReferences(facts().map(row=>({...row,spend:1e308})),config(),scope);assert.equal(get(overflow,'target_spend').actual,null);assert.equal(get(overflow,'target_cpl').actual,null);assert.equal(get(overflow,'target_spend').status,'insufficient_data');
});

test('period rates use summed components; a daily zero denominator does not invalidate the period ratio',()=>{
 const rows=facts();rows[0]={...rows[0],spend:0,impressions:0,clicks:0,leads:0};
 const report=buildTargetReferences(rows,config(),scope);assert.equal(get(report,'target_ctr').actual,2);assert.equal(get(report,'target_ctr').knownDays,2);assert.equal(get(report,'target_cpl').actual,20);assert.equal(get(report,'target_cpl').knownDays,2);
});

test('a filtered currency subset is never compared with the organization references, including count targets',()=>{
 const report=buildTargetReferences(facts().map(row=>({...row,currency:'USD'})),config(),{...scope,currency:'USD'});
 for(const key of ['target_spend','target_leads','target_cpl','target_ctr'] as const){assert.equal(get(report,key).status,'currency_mismatch');assert.equal(get(report,key).difference,null);}
 assert.equal(get(report,'target_spend').actual,200);assert.equal(report.scope.referenceCurrency,'BRL');
});

test('leads and CPL require known single windows per account while spend and CTR remain independent',()=>{
 for(const window of ['', 'unknown', 'platform_default','1d_click']){
  const rows=facts();rows[0].attribution_window=window;
  const report=buildTargetReferences(rows,config(),scope);assert.equal(get(report,'target_leads').actual,null);assert.equal(get(report,'target_cpl').actual,null);assert.equal(get(report,'target_spend').actual,200);assert.equal(get(report,'target_ctr').actual,2);
 }
});

test('configuration and fact scope, duplicate IDs and Meta alias grains fail closed',()=>{
 assert.throws(()=>buildTargetReferences(facts(),config({organization_id:'synthetic-b'}),scope),/configuration scope/);
 for(const patch of [{organization_id:'synthetic-b'},{currency:'USD'},{metric_date:'2026-10-19'}])assert.throws(()=>buildTargetReferences([fact(patch)],config(),scope),/scope mismatch/);
 assert.throws(()=>buildTargetReferences([fact(),fact({id:'duplicate',account_id:'123'})],config(),scope),/Duplicate/);
 assert.throws(()=>buildTargetReferences([fact(),fact({ad_id:'another-ad'})],config(),scope),/Duplicate/);
});

test('unsupported references stay visible with dependency reasons even when ads contain financial fields',()=>{
 const all=config({target_frequency:3,target_roas:4,target_roi:-10,target_cpa:50,target_revenue:1000,target_purchases:10});
 const report=buildTargetReferences(facts().map(row=>({...row,revenue:1000,purchases:10,reach:100})),all,scope);
 for(const key of ['target_frequency','target_roas','target_roi','target_cpa','target_revenue','target_purchases'] as const){const row=get(report,key);assert.equal(row.actual,null);assert.equal(row.status,'unsupported');assert.equal(row.difference,null);assert.ok(row.reason.length>20);}
 assert.equal(get(report,'target_roi').target,-10);assert.equal(report.configured,10);
});

test('input data and configuration are not mutated and ordering cannot change the reference document',()=>{
 const rows=facts(),settings=config(),before=structuredClone({rows,settings});
 const a=buildTargetReferences(rows,settings,scope),b=buildTargetReferences([...rows].reverse(),settings,scope);assert.deepEqual(a,b);assert.deepEqual({rows,settings},before);
});
