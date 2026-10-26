import test from 'node:test';
import assert from 'node:assert/strict';
import {campaigns} from '../src/lib/metrics/campaigns';
import type {Row} from '../src/types/database.types';

const orgA='11111111-1111-4111-8111-111111111111';
const orgB='22222222-2222-4222-8222-222222222222';
const ad=(overrides:Partial<Row<'metrics_ads'>>={}):Row<'metrics_ads'>=>({
 organization_id:orgA,platform:'meta_ads',account_id:'act_123',campaign_id:'campaign-1',
 campaign_name:'Synthetic campaign',campaign_status:'active',metric_date:'2026-10-24',
 currency:'BRL',spend:100,revenue:200,purchases:2,impressions:1000,reach:800,
 clicks:20,page_views:12,leads:5,message_leads:2,registration_leads:3,checkouts:2,
 ...overrides
} as Row<'metrics_ads'>);
const crm=(overrides:Partial<Row<'metrics_crm'>>={}):Row<'metrics_crm'>=>({
 organization_id:orgA,metric_date:'2026-10-24',channel:'meta_ads',account_id:'act_123',
 campaign_id:'campaign-1',currency:'BRL',source:'crm',is_complete:true,revenue:500,purchases:5,
 ...overrides
} as Row<'metrics_crm'>);

test('identical campaign and account identifiers cannot combine organizations',()=>{
 const result=campaigns([ad({organization_id:orgA,spend:100}),ad({organization_id:orgB,spend:300})],[],'crm');
 assert.equal(result.length,2);
 assert.equal(result.find(r=>r.organizationId===orgA)?.spend,100);
 assert.equal(result.find(r=>r.organizationId===orgB)?.spend,300);
});

test('identical campaign and account identifiers cannot combine currencies',()=>{
 const result=campaigns([ad({currency:'BRL',spend:100}),ad({currency:'USD',spend:300})],[],'crm');
 assert.equal(result.length,2);
 assert.equal(result.find(r=>r.currency==='BRL')?.spend,100);
 assert.equal(result.find(r=>r.currency==='USD')?.spend,300);
});

test('CRM revenue attribution requires both tenant and currency to match',()=>{
 const result=campaigns([ad()],[
  crm({organization_id:orgB,revenue:900}),
  crm({currency:'USD',revenue:800}),
 ],'crm');
 assert.equal(result[0].revenue,200);
 assert.equal(result[0].revenueSource,'ads');
 const matched=campaigns([ad()],[crm({revenue:500})],'crm');
 assert.equal(matched[0].revenue,500);
 assert.equal(matched[0].roas,5);
 assert.equal(matched[0].roi,null);
});

test('campaign spend overflow is not reported as a fabricated zero',()=>{
 assert.throws(()=>campaigns([ad({spend:1e308}),ad({spend:1e308})],[],'crm'),/Invalid campaign spend aggregation/);
 assert.throws(()=>campaigns([ad({spend:Number.NaN})],[],'crm'),/Invalid campaign spend aggregation/);
});

test('catalog campaigns from another tenant remain separate',()=>{
 const catalog=[{
  organization_id:orgB,platform:'meta_ads',account_id:'act_123',external_id:'campaign-1',
  name:'Synthetic catalog campaign',status:'active',
 } as Row<'ad_campaigns'>];
 const result=campaigns([ad()],[],'crm',catalog);
 assert.equal(result.length,2);
 assert.equal(result.find(r=>r.organizationId===orgB)?.revenue,null);
});


test('CRM account identifiers with and without act_ prefix reconcile within the same tenant and currency',()=>{
 const withPrefix=campaigns([ad({account_id:'act_123'})],[crm({account_id:'123',revenue:450})],'crm');
 assert.equal(withPrefix[0].revenue,450);
 assert.equal(withPrefix[0].revenueSource,'crm');
 assert.equal(withPrefix[0].roas,4.5);
 const withoutPrefix=campaigns([ad({account_id:'123'})],[crm({account_id:'act_123',revenue:600})],'crm');
 assert.equal(withoutPrefix[0].revenue,600);
 assert.equal(withoutPrefix[0].revenueSource,'crm');
});

test('normalized CRM account identifiers never match another account, tenant, platform or currency',()=>{
 const result=campaigns([ad({account_id:'act_123'})],[
  crm({account_id:'124',revenue:999}),
  crm({account_id:'123',organization_id:orgB,revenue:888}),
  crm({account_id:'123',channel:'google_ads',revenue:777}),
  crm({account_id:'123',currency:'USD',revenue:666}),
 ],'crm');
 assert.equal(result[0].revenue,200);
 assert.equal(result[0].revenueSource,'ads');
});

test('negative daily campaign observations cannot be concealed by positive observations',()=>{
 const result=campaigns([
  ad({metric_date:'2026-10-23',spend:50,impressions:100,clicks:10,leads:4,purchases:3}),
  ad({metric_date:'2026-10-24',spend:60,impressions:-5,clicks:-2,leads:-1,purchases:-2}),
 ],[],'crm')[0];
 assert.equal(result.spend,110);
 assert.equal(result.impressions,null);
 assert.equal(result.clicks,null);
 assert.equal(result.leads,null);
 assert.equal(result.purchases,null);
 assert.equal(result.ctr,null);
 assert.equal(result.cpm,null);
 assert.equal(result.cpc,null);
 assert.equal(result.cpa,null);
 assert.equal(result.revenue,400);
 assert.equal(result.roas,400/110);
 assert.throws(()=>campaigns([ad({spend:-1})],[],'crm'),/Invalid campaign spend aggregation/);
});

test('CRM purchases reject negative/nonfinite counts without discarding valid revenue',()=>{
 for(const purchases of [-1,Number.NaN,Number.POSITIVE_INFINITY]){
  const result=campaigns([ad()],[crm({purchases,revenue:450})],'crm')[0];
  assert.equal(result.revenue,450);
  assert.equal(result.revenueSource,'crm');
  assert.equal(result.purchases,null);
  assert.equal(result.cpa,null);
  assert.equal(result.roas,4.5);
 }
 const valid=campaigns([ad()],[crm({purchases:0.5,revenue:450})],'crm')[0];
 assert.equal(valid.purchases,0.5);
 assert.equal(valid.cpa,200);
 const invalidRevenue=campaigns([ad()],[crm({revenue:Number.NaN,purchases:2})],'crm')[0];
 assert.equal(invalidRevenue.revenue,null);
 assert.equal(invalidRevenue.roas,null);
 assert.equal(invalidRevenue.purchases,2);
});


test('account identifiers with act_ remain distinct for non-Meta providers in ads and CRM',()=>{
 for (const platform of ['google_ads','tiktok_ads','microsoft_ads'] as const){
  const result=campaigns([
   ad({platform,account_id:'act_123',spend:40}),
   ad({platform,account_id:'123',spend:70}),
  ],[crm({channel:platform,account_id:'123',revenue:900})],'crm');
  assert.equal(result.length,2,platform);
  const prefixed=result.find(row=>row.accountId==='act_123');
  const plain=result.find(row=>row.accountId==='123');
  assert.equal(prefixed?.spend,40,platform);
  assert.equal(prefixed?.revenue,200,platform); // No CRM attribution from account 123.
  assert.equal(prefixed?.revenueSource,'ads',platform);
  assert.equal(plain?.spend,70,platform);
  assert.equal(plain?.revenue,900,platform);
  assert.equal(plain?.revenueSource,'crm',platform);
 }
});

test('a non-Meta catalog account cannot be hidden by another account with an act_ prefix',()=>{
 const catalog=[{
  organization_id:orgA,platform:'google_ads',account_id:'123',external_id:'campaign-1',
  name:'Synthetic independent catalog account',status:'active',
 } as Row<'ad_campaigns'>];
 const result=campaigns([ad({platform:'google_ads',account_id:'act_123'})],[],'crm',catalog);
 assert.equal(result.length,2);
 assert.equal(result.find(row=>row.accountId==='act_123')?.spend,100);
 assert.equal(result.find(row=>row.accountId==='123')?.revenue,null);
});

test('registration counts require direct source observations, never total-minus-messages inference',()=>{
 const missing=campaigns([ad({registration_leads:null,leads:9,message_leads:2})],[],'crm')[0];
 assert.equal(missing.leads,9);
 assert.equal(missing.messageLeads,2);
 assert.equal(missing.registrationLeads,null);
 assert.equal(missing.metricValues.registration_leads,null);
 assert.equal(missing.costPerRegistration,null);

 const inconsistent=campaigns([ad({registration_leads:null,leads:1,message_leads:3})],[],'crm')[0];
 assert.equal(inconsistent.registrationLeads,null); // Never clamp an inferred -2 to fabricated zero.

 const partiallyReported=campaigns([
  ad({metric_date:'2026-10-23',spend:50,leads:5,message_leads:2,registration_leads:3}),
  ad({metric_date:'2026-10-24',spend:60,leads:8,message_leads:3,registration_leads:null}),
 ],[],'crm')[0];
 assert.equal(partiallyReported.registrationLeads,null);
 assert.equal(partiallyReported.metricValues.registration_leads,null);
 assert.equal(partiallyReported.costPerRegistration,null);
 assert.equal(partiallyReported.leads,13);
 assert.equal(partiallyReported.messageLeads,5);

 const observedZero=campaigns([ad({registration_leads:0,leads:5,message_leads:2})],[],'crm')[0];
 assert.equal(observedZero.registrationLeads,0);
 assert.equal(observedZero.metricValues.registration_leads,0);
 assert.equal(observedZero.costPerRegistration,null); // Cost requires a positive denominator.

 const observedFraction=campaigns([ad({registration_leads:0.5,leads:5,message_leads:2})],[],'crm')[0];
 assert.equal(observedFraction.registrationLeads,0.5);
 assert.equal(observedFraction.costPerRegistration,200);
});
