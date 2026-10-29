import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFunnelReport,funnelPlatform,funnelReportHref} from '../src/lib/reports/funnel-report';
import {scope,fact,steps} from './helpers/funnel-report-fixture';
test('funnel report uses agency steps and real prior dates with auditable costs, including CPM',()=>{
 const r=buildFunnelReport([fact()],[fact({id:'prior',metric_date:'2026-10-18',spend:50,clicks:10,leads:2})],scope,steps);
 assert.deepEqual(r.stages.map(s=>s.current.value),[1000,20,5,null,2]);
 assert.deepEqual(r.stages.map(s=>s.current.cost),[100,5,20,null,50]);
 assert.equal(r.stages[1].target,25);assert.equal(r.stages[1].previous?.value,10);assert.equal(r.stages[1].previous?.cost,5);
 assert.deepEqual([r.previous?.from,r.previous?.to],['2026-10-18','2026-10-19']);assert.equal(r.current.sourceIds.length,1);
});
test('received zero, missing coverage, nonadditive reach and empty periods remain distinct',()=>{
 const r=buildFunnelReport([fact({clicks:0,leads:null})],[],scope,steps);assert.equal(r.stages[1].current.value,0);assert.equal(r.stages[1].current.cost,null);assert.equal(r.stages[2].current.value,null);assert.equal(r.stages[2].current.known,0);assert.equal(r.stages[2].current.observed,1);assert.equal(r.stages[1].previous?.value,null);
 const reach=[{metric:'reach',label:'Alcance'},{metric:'clicks',label:'Cliques'}];
 assert.equal(buildFunnelReport([fact()],[],scope,reach).stages[0].current.value,500);
 for(const extra of [fact({id:'two',campaign_id:'other',ad_id:'other'}),fact({id:'two',metric_date:'2026-10-21'})])assert.equal(buildFunnelReport([fact(),extra],[],scope,reach).stages[0].current.value,null);
 const empty=buildFunnelReport([],[],{...scope,compare:'none'},steps);assert.ok(empty.stages.every(s=>s.current.value===null&&s.current.cost===null&&s.previous===null));
});
test('all facts and configured scope are validated before any funnel totals or exports',()=>{
 for(const patch of [{organization_id:'22222222-2222-4222-8222-222222222222'},{currency:'USD'},{platform:'other'},{metric_date:'2026-10-22'},{campaign_id:' '},{account_id:'act_'},{account_id:'act_act_123'},{ad_id:''},{id:''}])assert.throws(()=>buildFunnelReport([fact(patch as Partial<ReturnType<typeof fact>>)],[],scope,steps));
 assert.throws(()=>buildFunnelReport([fact(),fact()],[],scope,steps));
 assert.throws(()=>buildFunnelReport([fact(),fact({id:'alias',account_id:'123'})],[],scope,steps));
 assert.throws(()=>buildFunnelReport([fact()],[],{...scope,platform:'google_ads'},steps));
 assert.throws(()=>buildFunnelReport([], [fact({metric_date:'2026-10-20'})],scope,steps));
 assert.throws(()=>buildFunnelReport([], [fact()],{...scope,compare:'none'},steps));
 for(const patch of [{organizationId:''},{currency:'brl'},{timezone:'invalid/timezone'},{generatedAt:'2026-10-29'}])assert.throws(()=>buildFunnelReport([],[],{...scope,...patch},steps));
});
test('platform choices and links whitelist context and discard untrusted selectors',()=>{
 assert.equal(funnelPlatform(undefined),null);assert.equal(funnelPlatform('all'),null);assert.equal(funnelPlatform('meta_ads'),'meta_ads');for(const value of ['','META_ADS','other','meta_ads '])assert.throws(()=>funnelPlatform(value));
 const href=funnelReportHref(scope.organizationSlug,{...scope,account:'PRIVATE',campaign:'PRIVATE'} as typeof scope,'google_ads');assert.ok(href.startsWith('/synthetic-fixture/reports/funnel?'));const u=new URL(href,'https://example.test');assert.deepEqual([...u.searchParams.keys()],['from','to','currency','compare','platform']);assert.equal(u.searchParams.get('platform'),'google_ads');assert.ok(!href.includes('PRIVATE'));
});
