import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';
function fact(values:Record<string,number|null>,impressions:number|null=100):CampaignPerformance{return {currency:'BRL',metricValues:values,impressions} as CampaignPerformance;}
test('incomplete metrics do not become complete totals',()=>{const result=paidSummary([fact({spend:100,leads:10}),fact({spend:50,leads:null})]);assert.equal(result.spend,150);assert.equal(result.leads,null);assert.equal(result.cpl,null);});
test('provider score weighting excludes missing or zero impression weights',()=>{const result=paidSummary([fact({quality_score:8},100),fact({quality_score:2},null),fact({quality_score:1},0)]);assert.equal(result.quality_score,8);});
test('zero denominators cannot produce Infinity or NaN',()=>{const result=paidSummary([fact({spend:50,clicks:0,impressions:0})]);assert.equal(result.cpc,null);assert.equal(result.cpm,null);});
