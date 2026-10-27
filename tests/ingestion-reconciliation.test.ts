import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileAuthorizedIngestion} from '../src/lib/metrics/ingestion-reconciliation';
const org='11111111-1111-4111-8111-111111111111';
const fact={organizationId:org,platform:'meta_ads',accountId:'act_1',campaignId:'c1',date:'2026-10-23',currency:'BRL',spend:120,impressions:1000,clicks:40,leads:4,source:'provider_api',collectedAt:'2026-10-23T12:00:00Z'};
test('validated tenant data feeds weighted reconciled facts',()=>{
 const result=reconcileAuthorizedIngestion([fact,{...fact,campaignId:'c2',spend:80,clicks:20,leads:2}],org);
 assert.equal(result.status,'ready');
 if(result.status==='ready'){assert.equal(result.totals.spend,200);assert.equal(result.totals.cpl,200/6);}
});
test('rejects facts of another tenant even alongside valid ones',()=>{
 assert.equal(reconcileAuthorizedIngestion([fact,{...fact,organizationId:'22222222-2222-4222-8222-222222222222'}],org).status,'invalid');
 assert.equal(reconcileAuthorizedIngestion([fact],'').status,'invalid');
});
test('blocks duplicates, mixed currency and malformed source before reporting',()=>{
 assert.equal(reconcileAuthorizedIngestion([fact,fact],org).status,'duplicate_grain');
 assert.equal(reconcileAuthorizedIngestion([fact,{...fact,campaignId:'c2',currency:'USD'}],org).status,'mixed_currency');
 assert.equal(reconcileAuthorizedIngestion([{...fact,spend:-10}],org).status,'invalid');
});


test('SEC-INGEST-SCOPE-001: malformed authenticated scope fails closed before an empty batch',()=>{
 for(const scope of ['', 'not-a-uuid', '11111111-1111-4111-1111-111111111111', ' '+org, org+'x']){
  assert.deepEqual(reconcileAuthorizedIngestion([],scope),{
   status:'invalid',reason:'Missing or invalid authenticated organization scope',
  },scope);
 }
 assert.equal(reconcileAuthorizedIngestion([],org).status,'empty');
});

test('SEC-INGEST-SCOPE-001: invalid caller scope never validates an otherwise legitimate fact',()=>{
 assert.equal(reconcileAuthorizedIngestion([fact],'invalid-tenant').status,'invalid');
 assert.equal(reconcileAuthorizedIngestion([fact],org).status,'ready');
});
