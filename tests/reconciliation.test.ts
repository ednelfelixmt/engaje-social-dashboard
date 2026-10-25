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
