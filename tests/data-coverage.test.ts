import test from 'node:test';
import assert from 'node:assert/strict';
import {paidCoverage} from '../src/lib/metrics/data-completeness';
test('campaign coverage treats recorded zeros as available values',()=>{assert.deepEqual(paidCoverage([{leads:0,clicks:0,impressions:0},{leads:null,clicks:5,impressions:null}]),{leads:50,clicks:100,impressions:50});});
test('no campaigns means unknown coverage rather than 100 percent',()=>{assert.deepEqual(paidCoverage([]),{leads:null,clicks:null,impressions:null});});
