import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcilePaidFacts,type ReconciliationRow} from '../src/lib/metrics/reconciliation';

const a:ReconciliationRow={platform:'meta',accountId:'1',campaignId:'10',date:'2026-10-22',currency:'BRL',spend:100,impressions:1000,clicks:100,leads:10};
const b:ReconciliationRow={...a,campaignId:'11',spend:50,impressions:500,clicks:25,leads:5};

test('reconciles distinct campaign-day grain and weighted ratios',()=>{
 const result=reconcilePaidFacts([a,b]);
 assert.equal(result.status,'ready');
 if(result.status!=='ready')throw new Error('Expected reconciled result');
 assert.equal(result.rowCount,2);
 assert.equal(result.totals.spend,150);
 assert.equal(result.totals.cpl,10);
 assert.equal(result.totals.ctr,125/1500*100);
});
test('fails closed on repeated campaign-day facts, not double counting',()=>{
 assert.equal(reconcilePaidFacts([a,{...a,spend:300}]).status,'duplicate_grain');
});
test('rejects aggregate numeric overflow without misreporting zero or missing values',()=>{
 const spendOverflow=reconcilePaidFacts([{...a,spend:1e308},{...b,spend:1e308}]);
 assert.equal(spendOverflow.status,'invalid');
 const impressionOverflow=reconcilePaidFacts([{...a,impressions:1e308},{...b,impressions:1e308}]);
 assert.equal(impressionOverflow.status,'invalid');
 const partial=reconcilePaidFacts([{...a,impressions:null},{...b,impressions:1e308}]);
 assert.equal(partial.status,'ready');
 if(partial.status==='ready')assert.equal(partial.totals.impressions,null);
});

test('rejects impossible campaign-day dates and malformed currencies at reconciliation',()=>{
 for(const date of ['2026-02-29','2026-04-31','2026-00-10','2026-13-01','2026-10-32','2026-2-03']){
  assert.equal(reconcilePaidFacts([{...a,date}]).status,'invalid',date);
 }
 for(const currency of ['usd','B1L','B_L',' BRL','BRL ']){
  assert.equal(reconcilePaidFacts([{...a,currency}]).status,'invalid',currency);
 }
 assert.equal(reconcilePaidFacts([{...a,date:'2024-02-29'},{...b,date:'2024-02-29'}]).status,'ready');
 assert.equal(reconcilePaidFacts([{...a,date:'2026-02-28'}]).status,'ready');
});

test('rejects mixed currencies, instead of combining raw values',()=>{
 assert.equal(reconcilePaidFacts([a,{...b,currency:'USD'}]).status,'mixed_currency');
});
test('rejects invalid facts and grain, and distinguishes missing data from zero',()=>{
 assert.equal(reconcilePaidFacts([]).status,'empty');
 assert.equal(reconcilePaidFacts([{...a,date:'bad'}]).status,'invalid');
 assert.equal(reconcilePaidFacts([{...a,spend:Number.NaN}]).status,'invalid');
 assert.equal(reconcilePaidFacts([{...a,spend:-1}]).status,'invalid');
 const result=reconcilePaidFacts([{...a,leads:null,clicks:0}]);
 assert.equal(result.status,'ready');
 if(result.status!=='ready')throw new Error('Expected ready result');
 assert.equal(result.totals.leads,null);
 assert.equal(result.totals.clicks,0);
 assert.equal(result.totals.cpl,null);
});

test('Meta aliases cannot masquerade as independent daily account facts', () => {
  const meta = {...a, platform: 'meta_ads', accountId: 'act_123'};
  const alias = {...meta, accountId: '123', spend: 900};
  assert.equal(reconcilePaidFacts([meta, alias]).status, 'duplicate_grain');
  assert.equal(reconcilePaidFacts([alias, meta]).status, 'duplicate_grain');
  assert.equal(reconcilePaidFacts([meta]).status, 'ready');
  assert.equal(reconcilePaidFacts([alias]).status, 'ready');
  assert.equal(reconcilePaidFacts([{...meta, accountId: 'act_'}]).status, 'invalid');
});

test('account identifiers with act_ remain separate for non-Meta providers', () => {
  for (const platform of ['google_ads', 'tiktok_ads', 'microsoft_ads']) {
    const first = {...a, platform, accountId: 'act_123'};
    const second = {...b, platform, campaignId: first.campaignId, accountId: '123'};
    const result = reconcilePaidFacts([first, second]);
    assert.equal(result.status, 'ready', platform);
    if (result.status === 'ready') {
      assert.equal(result.totals.spend, first.spend + second.spend, platform);
      assert.equal(result.rowCount, 2, platform);
    }
  }
});

test('Meta canonical account identity still distinguishes campaigns, dates and platforms', () => {
  const meta = {...a, platform: 'meta_ads', accountId: 'act_123'};
  const differentCampaign = {...b, platform: 'meta_ads', accountId: '123'};
  const differentDate = {...meta, accountId: '123', date: '2026-10-23'};
  const differentPlatform = {...meta, platform: 'google_ads', accountId: '123'};
  const result = reconcilePaidFacts([meta, differentCampaign, differentDate, differentPlatform]);
  assert.equal(result.status, 'ready');
  if (result.status === 'ready') {
    assert.equal(result.rowCount, 4);
    assert.equal(result.totals.spend, 350);
  }
});


test('RECON-GRAIN-IDENTITY-001: whitespace-only or padded source identities do not become reconciled facts',()=>{
 for(const platform of ['', ' ', '\t', 'meta_ads ', ' meta_ads']){
  assert.equal(reconcilePaidFacts([{...a,platform}]).status,'invalid',JSON.stringify(platform));
 }
 for(const accountId of ['', ' ', ' 123', '123 ', '\n123', 'act_', 'act_ ', 'act_ 123', 'act_123 ']){
  assert.equal(reconcilePaidFacts([{...a,platform:'meta_ads',accountId}]).status,'invalid',JSON.stringify(accountId));
 }
 for(const campaignId of ['', ' ', ' c1', 'c1 ', '\tc1']){
  assert.equal(reconcilePaidFacts([{...a,campaignId}]).status,'invalid',JSON.stringify(campaignId));
 }
 // A malformed row cannot inflate a otherwise valid total or masquerade as a second grain.
 assert.equal(reconcilePaidFacts([a,{...a,accountId:' 1',spend:900}]).status,'invalid');
 assert.equal(reconcilePaidFacts([a,{...a,campaignId:'10 ',spend:900}]).status,'invalid');
});

test('RECON-GRAIN-IDENTITY-001: valid identifiers, measured zero and provider-specific Meta aliases remain stable',()=>{
 const meta={...a,platform:'meta_ads',accountId:'act_123',spend:0};
 const ready=reconcilePaidFacts([meta]);
 assert.equal(ready.status,'ready');
 if(ready.status==='ready')assert.equal(ready.totals.spend,0);
 assert.equal(reconcilePaidFacts([meta,{...meta,accountId:'123'}]).status,'duplicate_grain');
 assert.equal(reconcilePaidFacts([{...a,accountId:'internal space',campaignId:'campaign v2'}]).status,'ready');
});

test('RECON-META-ALIAS-002: rejects nested act_ prefixes before reconciliation',()=>{
  const valid={...a,platform:'meta_ads',accountId:'123',spend:0};
  for(const accountId of ['act_act_123','act_act_','act_act_act_123']){
    const malformed={...a,platform:'meta_ads',accountId,spend:900};
    assert.deepEqual(reconcilePaidFacts([malformed]),{status:'invalid',reason:'Malformed fact grain'});
    assert.equal(reconcilePaidFacts([valid,malformed]).status,'invalid');
  }
});

test('RECON-META-ALIAS-002: valid Meta aliases, measured zero and non-Meta IDs remain intact',()=>{
  const meta={...a,platform:'meta_ads',accountId:'act_123',spend:0,leads:0};
  const result=reconcilePaidFacts([meta]);
  assert.equal(result.status,'ready');
  if(result.status==='ready'){
    assert.equal(result.totals.spend,0);
    assert.equal(result.totals.leads,0);
  }
  assert.equal(reconcilePaidFacts([meta,{...meta,accountId:'123'}]).status,'duplicate_grain');
  for(const platform of ['google_ads','tiktok_ads','microsoft_ads']){
    assert.equal(reconcilePaidFacts([{...a,platform,accountId:'act_act_123'}]).status,'ready',platform);
  }
});
