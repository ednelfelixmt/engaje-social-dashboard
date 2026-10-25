import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';
test('valid revenue/spend can determine ROAS but not profit or ROI',()=>{
 const row={currency:'BRL',impressions:100,metricValues:{spend:100,revenue:500,clicks:10,leads:2}} as CampaignPerformance;
 const summary=paidSummary([row]);assert.equal(summary.roas,5);assert.equal(summary.profit,null);assert.equal(summary.roi,null);
});
