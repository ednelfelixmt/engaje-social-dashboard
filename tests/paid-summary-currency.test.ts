import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';
const fact=(currency:string,spend:number,leads:number):CampaignPerformance=>({currency,impressions:100,metricValues:{spend,revenue:spend*2,conversion_value:spend*2,leads,clicks:20}} as CampaignPerformance);
test('never add different source currencies without FX conversion',()=>{const result=paidSummary([fact('BRL',100,10),fact('USD',50,5)]);assert.equal(result.spend,null);assert.equal(result.revenue,null);assert.equal(result.roas,null);assert.equal(result.cpl,null);assert.equal(result.leads,15);});
test('same currency stays aggregatable',()=>{const result=paidSummary([fact('BRL',100,10),fact('BRL',50,5)]);assert.equal(result.spend,150);assert.equal(result.cpl,10);});
