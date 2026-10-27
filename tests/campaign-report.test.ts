import test from 'node:test';
import assert from 'node:assert/strict';
import type {Row} from '../src/types/database.types';
import {campaignSelection,campaignHref,type CampaignSelection} from '../src/lib/metrics/campaign-selection';
import {buildCampaignReport,campaignDelta} from '../src/lib/reports/campaign-report';
import type {PerformanceScope} from '../src/lib/reports/performance-report';
const scope:PerformanceScope={organizationId:'synthetic-a',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',from:'2026-10-20',to:'2026-10-21',compare:'previous_period',generatedAt:'2026-10-26T12:00:00.000Z'};
const selected:CampaignSelection={platform:'meta_ads',account:'123',campaign:'synthetic-campaign'};
const fact=(patch:Partial<Row<'metrics_ads'>>={})=>({id:'one',organization_id:scope.organizationId,platform:'meta_ads',account_id:'act_123',campaign_id:selected.campaign,campaign_name:'Synthetic campaign',ad_id:'synthetic-ad',metric_date:scope.from,currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads'>);
const current=()=>[fact(),fact({id:'two',metric_date:scope.to})];
const prior=()=>[fact({id:'prior1',metric_date:'2026-10-18',spend:50}),fact({id:'prior2',metric_date:'2026-10-19',spend:50})];

test('campaign identifiers remain opaque, providers are whitelisted and incomplete selectors fail closed',()=>{
 assert.deepEqual(campaignSelection({platform:'meta_ads',account:'act_123',campaign:'01234567890123456789'}),{platform:'meta_ads',account:'123',campaign:'01234567890123456789'});
 assert.equal(campaignSelection({platform:'google_ads',account:'act_123',campaign:'synthetic'})?.account,'act_123');
 for(const patch of [{platform:['meta_ads']},{platform:'instagram'},{account:''},{account:'act_'},{account:'act_act_123'},{campaign:' '},{campaign:'a'.repeat(513)},{account:'a'+String.fromCharCode(10)}])assert.equal(campaignSelection({...selected,...patch}),null);
});

test('campaign links preserve only scoped filters and encode opaque IDs without query injection',()=>{
 const selection={...selected,platform:'google_ads' as const,account:'act_123',campaign:'a?x=1&organization_id=other'};
 const url=new URL(campaignHref('synthetic-a',scope,selection),'https://example.test');assert.equal(url.pathname,'/synthetic-a/reports/campaign');assert.equal(url.searchParams.get('campaign'),selection.campaign);assert.equal(url.searchParams.get('organization_id'),null);assert.equal(url.searchParams.get('compare'),'previous_period');assert.equal(url.searchParams.get('currency'),'BRL');assert.equal(url.searchParams.get('from'),scope.from);assert.ok(!url.searchParams.has('generatedAt'));
 assert.throws(()=>campaignHref('..',scope,selected));
});

test('campaign detail keeps ad-day facts distinct and computes received totals and ratios from components',()=>{
 const rows=[...current(),fact({id:'another-ad',ad_id:'another-ad',spend:200,impressions:9000,clicks:90,leads:10})];
 const report=buildCampaignReport(rows,prior(),scope,selected);assert.equal(report.current.totals.spend,400);assert.equal(report.current.adCount,2);assert.equal(report.current.days[0].records,2);assert.equal(report.current.days[0].ads,2);assert.equal(report.current.totals.cpc,400/130);assert.equal(report.current.totals.cpl,20);assert.equal(report.current.knownDays.ctr,2);assert.equal(campaignDelta(report,'spend'),300);
});

test('missing calendar dates remain unavailable and suppress period comparison rather than inserting delivery zero',()=>{
 const report=buildCampaignReport([fact()],prior(),scope,selected);assert.equal(report.current.totals.spend,100);assert.equal(report.current.completeTotals.spend,null);assert.equal(report.current.days[1].totals.spend,null);assert.equal(report.current.days[1].records,0);assert.equal(report.current.knownDays.spend,1);assert.equal(campaignDelta(report,'spend'),null);
});

test('observed zero is preserved while denominator zero cannot become a fake ratio',()=>{
 const report=buildCampaignReport(current().map(row=>({...row,spend:0,impressions:0,clicks:0,leads:0})),prior(),scope,selected);assert.equal(report.current.totals.spend,0);assert.equal(report.current.totals.leads,0);assert.equal(report.current.totals.cpl,null);assert.equal(report.current.totals.ctr,null);assert.equal(campaignDelta(report,'spend'),-100);assert.equal(campaignDelta(report,'cpl'),null);
});

test('partial, negative and overflowing metrics do not contaminate independent daily observations',()=>{
 const rows=current();rows[0].leads=null;let report=buildCampaignReport(rows,prior(),scope,selected);assert.equal(report.current.totals.leads,null);assert.equal(report.current.totals.cpl,null);assert.equal(report.current.totals.spend,200);assert.equal(report.current.days[1].totals.leads,5);
 report=buildCampaignReport(current().map(row=>({...row,spend:1e308})),prior(),scope,selected);assert.equal(report.current.totals.spend,null);assert.equal(campaignDelta(report,'spend'),null);
 rows[0].clicks=-1;assert.equal(buildCampaignReport(rows,prior(),scope,selected).current.totals.clicks,null);
});

test('account/campaign/provider and tenant/currency/date mismatches in either period reject the entire report',()=>{
 for(const patch of [{account_id:'456'},{campaign_id:'other'},{platform:'google_ads'},{organization_id:'synthetic-b'},{currency:'USD'},{metric_date:'2026-10-19'}] as Partial<Row<'metrics_ads'>>[])assert.throws(()=>buildCampaignReport([fact(patch)],prior(),scope,selected));
 assert.throws(()=>buildCampaignReport(current(),[fact({metric_date:'2026-10-18',account_id:'456'})],scope,selected),/selection mismatch/);
});

test('Meta aliases cannot duplicate an ad-day grain, and other providers keep literal account identities',()=>{
 assert.throws(()=>buildCampaignReport([fact(),fact({id:'alias',account_id:'123'})],[],scope,selected),/Duplicate/);
 const google={...selected,platform:'google_ads' as const,account:'act_123'};
 assert.equal(buildCampaignReport([fact({platform:'google_ads'})],[],{...scope,compare:'none'},google).current.sourceIds.length,1);
 assert.throws(()=>buildCampaignReport([fact({platform:'google_ads',account_id:'123'})],[],scope,google),/selection mismatch/);
});

test('lead and CPL comparisons require equivalent known attribution, independently of spend comparisons',()=>{
 const report=buildCampaignReport(current(),prior().map(row=>({...row,attribution_window:'1d_click'})),scope,selected);assert.equal(campaignDelta(report,'leads'),null);assert.equal(campaignDelta(report,'cpl'),null);assert.equal(campaignDelta(report,'spend'),100);assert.equal(report.current.totals.leads,10);
});

test('none comparison and leap-year prior dates use existing calendar semantics',()=>{
 assert.equal(buildCampaignReport(current(),[],{...scope,compare:'none'},selected).previous,null);assert.throws(()=>buildCampaignReport(current(),prior(),{...scope,compare:'none'},selected));
 const leap=buildCampaignReport([],[],{...scope,from:'2024-02-29',to:'2024-02-29',compare:'previous_year'},selected);assert.equal(leap.previous?.from,'2023-02-28');assert.equal(leap.previous?.days.length,1);
});

test('data order does not change the report and no input fact is mutated',()=>{
 const rows=current(),old=prior(),snapshot=structuredClone({rows,old});assert.deepEqual(buildCampaignReport(rows,old,scope,selected),buildCampaignReport([...rows].reverse(),[...old].reverse(),scope,selected));assert.deepEqual({rows,old},snapshot);
});
