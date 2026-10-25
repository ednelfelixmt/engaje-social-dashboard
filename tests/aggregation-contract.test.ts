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
