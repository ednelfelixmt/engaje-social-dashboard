import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';
const fact=(score:number,weight:number):CampaignPerformance=>({currency:'BRL',impressions:weight,metricValues:{quality_score:score}} as CampaignPerformance);
test('weighted provider metric cannot overflow to Infinity',()=>{assert.equal(paidSummary([fact(1e308,1e308)]).quality_score,null);});
test('ordinary weighted provider metric remains valid',()=>{assert.equal(paidSummary([fact(8,75),fact(4,25)]).quality_score,7);});
