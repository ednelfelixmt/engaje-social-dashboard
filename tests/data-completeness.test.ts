import test from 'node:test';
import assert from 'node:assert/strict';
import {paidCompleteness} from '../src/lib/metrics/data-completeness';
test('missing metric is not confused with valid zero',()=>{assert.deepEqual(paidCompleteness([{leads:null,clicks:0,impressions:100},{leads:0,clicks:null,impressions:null}]),{rows:2,missingLeads:1,missingClicks:1,missingImpressions:1});});
test('empty data does not claim missing campaigns',()=>{assert.deepEqual(paidCompleteness([]),{rows:0,missingLeads:0,missingClicks:0,missingImpressions:0});});


test('non-finite and negative counts are missing, but zero and attributed fractions remain observed',()=>{
 const rows=[
  {leads:Number.NaN,clicks:Number.POSITIVE_INFINITY,impressions:-1},
  {leads:0,clicks:0,impressions:0},
  {leads:2.5,clicks:10,impressions:100},
 ];
 assert.deepEqual(paidCompleteness(rows),{rows:3,missingLeads:1,missingClicks:1,missingImpressions:1});
});

test('negative infinity and null are both unavailable rather than observed',()=>{
 assert.deepEqual(paidCompleteness([
  {leads:-1,clicks:Number.NEGATIVE_INFINITY,impressions:Number.NaN},
  {leads:null,clicks:null,impressions:null},
 ]),{rows:2,missingLeads:2,missingClicks:2,missingImpressions:2});
});
