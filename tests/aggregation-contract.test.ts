import test from 'node:test';
import assert from 'node:assert/strict';
import {finiteRatio,sum,totals} from '../src/lib/metrics/aggregation';

test('additive totals reject absent, nonnumeric, nonfinite and overflowed facts',()=>{
 assert.equal(sum([{spend:10},{spend:20}],'spend'),30);
 assert.equal(sum([],'spend'),null);
 assert.equal(sum([{spend:10},{spend:null}],'spend'),null);
 assert.equal(sum([{spend:10},{spend:'20'}],'spend'),null);
 assert.equal(sum([{spend:Number.NaN}],'spend'),null);
 assert.equal(sum([{spend:Infinity}],'spend'),null);
 assert.equal(sum([{spend:1e308},{spend:1e308}],'spend'),null);
});

test('aggregate ROAS is known but ROI requires full business costs',()=>{
 const value=totals([{spend:100,revenue:500,purchases:5}]);
 assert.deepEqual(value,{spend:100,revenue:500,purchases:5,roas:5,roi:null,cpa:20});
 assert.equal(totals([{spend:0,revenue:100,purchases:0}]).roas,null);
 assert.equal(totals([{spend:10,revenue:null,purchases:1}]).roas,null);
});

test('finite ratio does not emit Infinity or invent a zero denominator',()=>{
 assert.equal(finiteRatio(10,0),null);
 assert.equal(finiteRatio(1e308,1e-308),null);
 assert.equal(finiteRatio(10,20,100),50);
});

test('campaign additive counts and spend reject negative source observations even if they cancel out',()=>{
 assert.equal(sum([{spend:100},{spend:-20}],'spend'),null);
 assert.equal(sum([{impressions:20},{impressions:-5}],'impressions'),null);
 assert.equal(sum([{clicks:10},{clicks:-1}],'clicks'),null);
 assert.equal(sum([{purchases:3},{purchases:-1}],'purchases'),null);
 assert.equal(sum([{leads:0},{leads:0.25}],'leads'),0.25);
 assert.equal(sum([{revenue:100},{revenue:-30}],'revenue'),70);
 assert.equal(sum([{conversion_value:-10},{conversion_value:3}],'conversion_value'),-7);
});

test('invalid source spend and purchases invalidate only their totals and dependent ratios',()=>{
 const invalidSpend=totals([{spend:100,revenue:250,purchases:3},{spend:-30,revenue:30,purchases:1}]);
 assert.deepEqual(invalidSpend,{spend:null,revenue:280,purchases:4,roas:null,roi:null,cpa:null});
 const invalidPurchases=totals([{spend:100,revenue:250,purchases:3},{spend:20,revenue:-30,purchases:-1}]);
 assert.deepEqual(invalidPurchases,{spend:120,revenue:220,purchases:null,roas:220/120,roi:null,cpa:null});
});
