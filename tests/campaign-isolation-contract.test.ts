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
