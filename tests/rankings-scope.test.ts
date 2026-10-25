import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePerformanceRankings} from '../src/lib/metrics/rankings';
import type {Row} from '../src/types/database.types';
import type {CampaignPerformance} from '../src/types/domain';

// Deliberately partial, synthetic facts: only fields consumed by rankings are needed.
const breakdown=(overrides:Partial<Row<'metrics_ads_breakdowns'>>={})=>({
  organization_id:'tenant-a',platform:'meta_ads',account_id:'account-1',
  currency:'BRL',dimension_type:'gender',dimension_value:'female',
  dimension_label:'Mulheres',spend:50,revenue:20,impressions:100,
  clicks:10,leads:2,purchases:0,...overrides,
} as Row<'metrics_ads_breakdowns'>);

const ad=(overrides:Partial<Row<'metrics_ads'>>={})=>({
  organization_id:'tenant-a',platform:'meta_ads',account_id:'account-1',
  currency:'BRL',ad_id:'ad-1',adset_id:'set-1',spend:10,revenue:10,
  impressions:100,clicks:10,leads:1,purchases:0,...overrides,
} as Row<'metrics_ads'>);

const campaign=(overrides:Partial<CampaignPerformance>={})=>({
  organizationId:'tenant-a',platform:'meta_ads',accountId:'account-1',
  campaignId:'campaign-1',campaignName:'Campanha',currency:'BRL',
  spend:50,revenue:20,impressions:100,clicks:10,leads:2,purchases:0,
  ...overrides,
} as CampaignPerformance);

test('dimension totals preserve missing components instead of counting them as zero',()=>{
  const rows=[
    breakdown({spend:50,impressions:100,clicks:10,leads:0,revenue:null}),
    breakdown({account_id:'account-2',spend:25,impressions:null,clicks:5,leads:2,revenue:30}),
  ];
  const ranking=preparePerformanceRankings([],[],rows,[]).gender;
  assert.equal(ranking.length,1);
  assert.equal(ranking[0].spend,75);
  assert.equal(ranking[0].impressions,null);
  assert.equal(ranking[0].clicks,15);
  assert.equal(ranking[0].leads,2);
  assert.equal(ranking[0].revenue,null);
  assert.equal(ranking[0].purchases,0);
});

test('ranking refuses to mix tenant identities from any source, including creative metadata',()=>{
  assert.throws(
    ()=>preparePerformanceRankings([campaign()],[],[breakdown({organization_id:'tenant-b'})],[]),
    /single organization/,
  );
  assert.throws(
    ()=>preparePerformanceRankings([],[],[breakdown()],[
      {organization_id:'tenant-b',platform:'meta_ads',account_id:'account-1',ad_id:'ad-1'} as Row<'creatives'>,
    ]),
    /single organization/,
  );
});

test('ranking refuses mixed and unknown currencies instead of displaying converted-looking totals',()=>{
  assert.throws(
    ()=>preparePerformanceRankings([],[],[breakdown(),breakdown({currency:'USD'})],[]),
    /one known source currency/,
  );
  assert.throws(
    ()=>preparePerformanceRankings([],[ad({currency:''})],[],[]),
    /one known source currency/,
  );
  // Catalog-only campaigns have no metric currency, so they remain visible.
  assert.equal(preparePerformanceRankings([campaign({currency:''})],[],[],[]).campaign.length,1);
});

test('creative fallback separates account identifiers and uses the matching creative label',()=>{
  const creatives=[
    {organization_id:'tenant-a',platform:'meta_ads',account_id:'account-1',ad_id:'ad-1',caption:'Criativo A'} as Row<'creatives'>,
    {organization_id:'tenant-a',platform:'meta_ads',account_id:'account-2',ad_id:'ad-1',caption:'Criativo B'} as Row<'creatives'>,
  ];
  const result=preparePerformanceRankings([],[ad(),ad({account_id:'account-2'})],[],creatives);
  assert.equal(result.creative.length,2);
  assert.deepEqual(result.creative.map(row=>row.label).sort(),['Criativo A','Criativo B']);
  assert.notEqual(result.creative[0].key,result.creative[1].key);
});

test('ranking rejects non-finite or overflowed spend instead of showing misleading results',()=>{
  assert.throws(()=>preparePerformanceRankings([],[],[breakdown({spend:Number.POSITIVE_INFINITY})],[]),/Invalid ranking spend/);
  assert.throws(()=>preparePerformanceRankings([],[],[
    breakdown({spend:1e308}),breakdown({spend:1e308}),
  ],[]),/Invalid ranking spend/);
});

test('campaign keys distinguish accounts while retaining observed zeros',()=>{
  const result=preparePerformanceRankings([
    campaign({accountId:'account-1',spend:0,leads:0}),
    campaign({accountId:'account-2',spend:10,leads:null}),
  ],[],[],[]);
  assert.notEqual(result.campaign[0].key,result.campaign[1].key);
  assert.equal(result.campaign[0].leads,0);
  assert.equal(result.campaign[1].leads,null);
});
