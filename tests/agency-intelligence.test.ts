import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAgencyIntelligence,selectAgencyIntelligence,agencyIntelligenceDelta,agencyPlatformInvestmentRows,type AgencySourceClient} from '../src/lib/reports/agency-intelligence';
import {fact} from './helpers/analytics-fixture';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const client=(id=a,currency='BRL'):AgencySourceClient=>({id,name:'Cliente sintético '+id.slice(0,1),slug:'synthetic-'+id.slice(0,1),currency,timezone:'America/Cuiaba'});
const row=(changes:Parameters<typeof fact>[0]={})=>fact({organization_id:a,metric_date:'2026-10-01',spend:100,impressions:1000,clicks:20,leads:2,...changes});
const make=(changes:Partial<Parameters<typeof buildAgencyIntelligence>[0]>={})=>buildAgencyIntelligence({clients:[client()],current:[row()],previous:[row({id:'prior',metric_date:'2026-09-28',spend:80})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period',...changes});
const choose=(model:ReturnType<typeof make>,changes:Partial<Parameters<typeof selectAgencyIntelligence>[1]>={})=>selectAgencyIntelligence(model,{clientIds:model.datasets.map(dataset=>dataset.organizationId),currency:'BRL',platform:'all',granularity:'day',...changes});
test('agency validates the entire tenant/currency/date batch before projecting analytical data',()=>{
 for(const current of [[row({organization_id:b})],[row({currency:'USD'})],[row({metric_date:'2026-10-04'})],[row(),row()]])assert.throws(()=>make({current}));
 assert.throws(()=>make({clients:[client(),client()]}));assert.throws(()=>make({clients:[client('invalid')],current:[],previous:[]}));assert.throws(()=>make({compare:'none'}));
 assert.throws(()=>choose(make(),{clientIds:[b]}));assert.throws(()=>choose(make(),{platform:'unknown'}));
});
test('agency metrics preserve observed zeros, calendar gaps, full totals and weighted ratios',()=>{
 const current=[row({spend:10,impressions:100,clicks:10,leads:0}),row({id:'other-day',metric_date:'2026-10-03',spend:90,impressions:900,clicks:9,leads:0})];const input={clients:[client()],current,previous:[],from:'2026-10-01',to:'2026-10-03',compare:'none' as const},before=structuredClone(input);const model=buildAgencyIntelligence(input),selected=choose(model);
 assert.equal(selected.totals.spend,100);assert.equal(selected.totals.ctr,1.9);assert.equal(selected.totals.leads,0);assert.equal(selected.totals.cpl,null);assert.equal(selected.timeline[1].current?.totals.spend,null);assert.equal(selected.timeline[1].current?.observedDays,0);assert.equal(selected.timeline[0].current?.totals.leads,0);assert.equal(selected.observedDays,2);assert.deepEqual(input,before);
});
test('agency separates currencies and retains same campaign identities independently across organizations',()=>{
 const model=make({clients:[client(),client(b,'USD')],current:[row(),row({id:'b',organization_id:b,currency:'USD',spend:50})]});const brl=choose(model),usd=choose(model,{currency:'USD'});assert.equal(brl.totals.spend,100);assert.equal(usd.totals.spend,50);assert.equal(brl.selectedClients,1);
 const both=make({clients:[client(),client(b)],current:[row(),row({id:'b',organization_id:b,spend:50})]});assert.equal(choose(both).totals.spend,150);assert.equal(choose(both).current.length,2);assert.equal(choose(both,{clientIds:[b]}).totals.spend,50);
});
test('weekly/monthly buckets sum only observations and align each period by its own calendar',()=>{
 const weekly=choose(make(),{granularity:'week'});assert.equal(weekly.timeline.length,1);assert.equal(weekly.timeline[0].current?.calendarDays,3);assert.equal(weekly.timeline[0].current?.observedDays,1);assert.equal(weekly.totals.spend,100);
 const model=make({from:'2026-03-10',to:'2026-04-05',current:[row({metric_date:'2026-03-10'}),row({id:'april',metric_date:'2026-04-05',spend:50})],previous:[row({id:'feb',metric_date:'2026-02-11',spend:30}),row({id:'march',metric_date:'2026-03-09',spend:20})]});const monthly=choose(model,{granularity:'month'});assert.equal(monthly.timeline.length,2);assert.equal(monthly.timeline[0].current?.from,'2026-03-10');assert.equal(monthly.timeline[0].previous?.from,'2026-02-11');assert.equal(monthly.timeline[1].previous?.to,'2026-03-09');assert.equal(monthly.timeline[1].current?.totals.spend,50);assert.equal(monthly.priorTotals.spend,50);
});
test('agency suppresses incompatible historical lead/CPL deltas but preserves current observations and neutral budget variation',()=>{
 const selection=choose(make({previous:[row({id:'prior',metric_date:'2026-09-28',spend:80,attribution_window:'1d_click'})]}));assert.equal(selection.compatible,false);assert.equal(selection.totals.leads,2);assert.equal(agencyIntelligenceDelta(selection,'leads',true),null);assert.equal(agencyIntelligenceDelta(selection,'cpl',true),null);assert.deepEqual(agencyIntelligenceDelta(selection,'spend',true),{change:25,good:null});
 const withEmpty=make({clients:[client(),client(b)]});assert.equal(choose(withEmpty).compatible,true,'a client without facts in either period does not invalidate observed attribution');
});

test('agency investment mix preserves observed zero, refuses missing source spend and numeric overflow',()=>{
 const base=choose(make()).current[0];
 const valid=[{...base,spend:0},{...base,platform:'google_ads' as const,spend:30}];
 const zero=agencyPlatformInvestmentRows(valid),before=structuredClone(valid);
 assert.deepEqual(zero.map(row=>[row.platform,row.value,row.campaigns]),[['meta_ads',0,1],['google_ads',30,1],['tiktok_ads',null,0]]);
 assert.deepEqual(valid,before,'source campaign rows must remain untouched');
 const missing=agencyPlatformInvestmentRows([...valid,{...base,campaignId:'missing-source',spend:null as unknown as number}]);
 assert.equal(missing[0].campaigns,2);assert.equal(missing[0].value,null,'null is not a measured zero');
 assert.equal(missing[1].value,30,'other platforms retain their valid spend');
 const negative=agencyPlatformInvestmentRows([{...base,spend:-10}]);
 assert.equal(negative[0].value,null);
 const overflow=agencyPlatformInvestmentRows([{...base,spend:1e308},{...base,campaignId:'overflow',spend:1e308}]);
 assert.equal(overflow[0].value,null,'finite input can overflow when aggregated');
});
