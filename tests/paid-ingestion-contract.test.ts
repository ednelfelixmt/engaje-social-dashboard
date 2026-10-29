import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAuthorizedPaidFact,PaidIngestionFactSchema} from '../src/lib/integrations/paid-ingestion-contract';
const organizationId='11111111-1111-4111-8111-111111111111';
const payload={organizationId,platform:'meta_ads',accountId:'act_1',campaignId:'c1',date:'2026-10-23',currency:'BRL',spend:120,impressions:1000,clicks:40,leads:null,source:'provider_api',collectedAt:'2026-10-23T12:00:00Z'};
test('accepts strictly sourced factual input for confirmed tenant',()=>{assert.equal(parseAuthorizedPaidFact(payload,organizationId).spend,120)});
test('rejects client asserted access to foreign tenant',()=>{assert.throws(()=>parseAuthorizedPaidFact(payload,'22222222-2222-4222-8222-222222222222'),/Tenant scope mismatch/)});
test('rejects incomplete, invented or invalid provider facts',()=>{
 for(const change of [{spend:-1},{spend:NaN},{currency:'BRLx'},{clicks:-2},{date:'not-a-date'},{date:'2026-02-30'},{date:'2026-13-01'},{source:'unknown'},{extra:true},{leads:1.4}]){
  assert.equal(PaidIngestionFactSchema.safeParse({...payload,...change}).success,false,JSON.stringify(change));
 }
});
test('null means unavailable, never silently zero',()=>{assert.equal(PaidIngestionFactSchema.parse(payload).leads,null)});

test('INGEST-OPAQUE-ID-001: reject padded or blank opaque IDs instead of silently trimming them',()=>{
 const invalid=['', ' ', '\t', ' act_1', 'act_1 ', '\tact_1', 'act_1\n', '\u00a0act_1', 'act_1\u00a0'];
 for(const field of ['accountId','campaignId'] as const){
  for(const id of invalid){
   assert.equal(PaidIngestionFactSchema.safeParse({...payload,[field]:id}).success,false,
    field+'='+JSON.stringify(id));
  }
 }
 // Provider IDs remain exact opaque strings; internal spaces are legitimate.
 for(const id of ['act_1','opaque:part','internal space']){
  const parsed=PaidIngestionFactSchema.parse({...payload,accountId:id,campaignId:id});
  assert.equal(parsed.accountId,id);
  assert.equal(parsed.campaignId,id);
 }
});
