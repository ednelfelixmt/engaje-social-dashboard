import test from 'node:test';
import assert from 'node:assert/strict';
import {paidCompleteness} from '../src/lib/metrics/data-completeness';
test('missing metric is not confused with valid zero',()=>{assert.deepEqual(paidCompleteness([{leads:null,clicks:0,impressions:100},{leads:0,clicks:null,impressions:null}]),{rows:2,missingLeads:1,missingClicks:1,missingImpressions:1});});
test('empty data does not claim missing campaigns',()=>{assert.deepEqual(paidCompleteness([]),{rows:0,missingLeads:0,missingClicks:0,missingImpressions:0});});
