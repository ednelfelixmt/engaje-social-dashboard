import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAuthorizedPaidFact,PaidIngestionFactSchema} from '../src/lib/integrations/paid-ingestion-contract';
const organizationId='11111111-1111-4111-8111-111111111111';
const payload={organizationId,platform:'meta_ads',accountId:'act_1',campaignId:'c1',date:'2026-10-23',currency:'BRL',spend:120,impressions:1000,clicks:40,leads:null,source:'provider_api',collectedAt:'2026-10-23T12:00:00Z'};
test('accepts strictly sourced factual input for confirmed tenant',()=>{assert.equal(parseAuthorizedPaidFact(payload,organizationId).spend,120)});
test('rejects client asserted access to foreign tenant',()=>{assert.throws(()=>parseAuthorizedPaidFact(payload,'22222222-2222-4222-8222-222222222222'),/Tenant scope mismatch/)});
test('rejects incomplete, invented or invalid provider facts',()=>{
 for(const change of [{spend:-1},{spend:NaN},{currency:'BRLx'},{clicks:-2},{date:'not-a-date'},{source:'unknown'},{extra:true},{leads:1.4}]){
  assert.equal(PaidIngestionFactSchema.safeParse({...payload,...change}).success,false,JSON.stringify(change));
 }
});
test('null means unavailable, never silently zero',()=>{assert.equal(PaidIngestionFactSchema.parse(payload).leads,null)});
