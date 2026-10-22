import test from 'node:test';
import assert from 'node:assert/strict';
import {paidMetric,paidTotals,percentChange,sumKnown} from '../src/lib/metrics/paid-metrics';

test('sums facts and computes ratios from totals, never averaging row CPLs',()=>{
 const rows=[
  {spend:100,impressions:1000,clicks:100,leads:10},
  {spend:100,impressions:2000,clicks:50,leads:2},
 ];
 const t=paidTotals(rows);
 assert.equal(t.spend,200);
 assert.equal(t.impressions,3000);
 assert.equal(t.clicks,150);
 assert.equal(t.leads,12);
 assert.equal(t.cpl,200/12);
 assert.equal(t.cpc,200/150);
 assert.equal(t.ctr,5);
 assert.equal(t.cpm,200/3);
});
test('distinguishes absent metrics from observed zeros',()=>{
 const rows=[{spend:35,impressions:100,clicks:0,leads:null}];
 const t=paidTotals(rows);
 assert.equal(t.clicks,0);
 assert.equal(t.leads,null);
 assert.equal(t.cpc,null);
 assert.equal(t.cpl,null);
 assert.equal(t.ctr,0);
 assert.equal(paidMetric(rows[0],'leads'),null);
});
test('any partially reported additive metric remains unknown',()=>{
 const result=paidTotals([
  {spend:50,impressions:100,clicks:7,leads:1},
  {spend:40,impressions:null,clicks:0,leads:0},
 ]);
 assert.equal(result.impressions,null);
 assert.equal(result.clicks,7);
 assert.equal(result.leads,1);
 assert.equal(result.ctr,null);
 assert.equal(result.cpl,90);
});
test('no facts are not fabricated as known impression or lead counts',()=>{
 const t=paidTotals([]);
 assert.equal(t.impressions,null);
 assert.equal(t.clicks,null);
 assert.equal(t.leads,null);
 assert.equal(t.cpl,null);
});
test('comparison requires nonzero previous period; zero in current is valid',()=>{
 assert.equal(percentChange(0,100),-100);
 assert.equal(percentChange(150,100),50);
 assert.equal(percentChange(50,0),null);
 assert.equal(percentChange(null,100),null);
 assert.equal(percentChange(20,null),null);
});
test('rejects missing and invalid numeric facts',()=>{
 assert.equal(sumKnown([{x:2},{x:null}],r=>r.x),null);
 assert.equal(sumKnown([{x:2},{x:Number.POSITIVE_INFINITY}],r=>r.x),null);
 assert.equal(paidMetric({spend:100,impressions:0,clicks:1,leads:1},'cpm'),null);
});
