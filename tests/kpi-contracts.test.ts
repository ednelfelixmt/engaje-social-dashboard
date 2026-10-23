import test from 'node:test';
import assert from 'node:assert/strict';
import {getMetricContract,PAID_METRIC_CONTRACTS} from '../src/lib/metrics/kpi-contracts';
import {paidMetric,type PaidMetricKey} from '../src/lib/metrics/paid-metrics';

test('every paid metric has a versioned and complete contract',()=>{
 const keys=Object.keys(PAID_METRIC_CONTRACTS) as PaidMetricKey[];
 assert.deepEqual([...keys].sort(),['clicks','cpc','cpl','cpm','ctr','impressions','leads','spend']);
 for(const key of keys){
  const c=getMetricContract(key);
  assert.equal(c.id,key);
  assert.equal(c.version,1);
  assert.equal(c.source,'paid_ads');
  assert.equal(c.grain,'platform_account_campaign_day');
  assert.ok(c.goals.length>0);
  assert.equal(c.missingValue,'unavailable');
  assert.equal(c.zeroDenominator,'unavailable');
  assert.equal(c.attribution,'provider_reported_no_cross_platform_deduplication');
  if(c.kind==='ratio') assert.ok(c.numerator&&c.denominator);
  else assert.equal(c.denominator,null);
 }
});
test('contract formulas match the calculation engine with explicit denominator handling',()=>{
 const fact={spend:120,impressions:3000,clicks:60,leads:6};
 for(const metric of ['ctr','cpc','cpm','cpl'] as const){
  const c=getMetricContract(metric);
  const numerator=fact[c.numerator! as keyof typeof fact];
  const denominator=fact[c.denominator! as keyof typeof fact];
  assert.equal(paidMetric(fact,metric),numerator/denominator*c.multiplier);
 }
 assert.equal(paidMetric({...fact,leads:0},'cpl'),null);
 assert.equal(getMetricContract('cpl').currency,'source_currency_no_cross_currency_sum');
 assert.equal(getMetricContract('ctr').currency,'not_applicable');
});
test('contracts do not assert unsupported revenue or ROAS measures',()=>{
 assert.equal(Object.hasOwn(PAID_METRIC_CONTRACTS,'roas'),false);
 assert.equal(Object.hasOwn(PAID_METRIC_CONTRACTS,'revenue'),false);
});
