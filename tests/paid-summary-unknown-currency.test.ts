import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';
function fact(currency:string){return {currency,metricValues:{spend:100,revenue:200,leads:5,clicks:20,impressions:100},impressions:100} as CampaignPerformance;}
test('missing currency never produces monetary totals or ratios',()=>{const result=paidSummary([fact('')]);assert.equal(result.spend,null);assert.equal(result.roas,null);assert.equal(result.cpl,null);assert.equal(result.leads,5);});
test('valid single source currency remains measurable',()=>{const result=paidSummary([fact('BRL')]);assert.equal(result.spend,100);assert.equal(result.cpl,20);});
