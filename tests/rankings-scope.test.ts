import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePerformanceRankings as scopedRankings} from '../src/lib/metrics/rankings';
import {readFileSync} from 'node:fs';
import type {Row} from '../src/types/database.types';
import type {CampaignPerformance} from '../src/types/domain';

// Preserve the synthetic baseline for existing ranking scenarios.
const preparePerformanceRankings = (...args: [
  Parameters<typeof scopedRankings>[0], Parameters<typeof scopedRankings>[1],
  Parameters<typeof scopedRankings>[2], Parameters<typeof scopedRankings>[3],
]) => scopedRankings(...args, '11111111-1111-4111-8111-111111111111', 'BRL');

// Deliberately partial, synthetic facts: only fields consumed by rankings are needed.
const breakdown=(overrides:Partial<Row<'metrics_ads_breakdowns'>>={})=>({
  organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'account-1',
  currency:'BRL',dimension_type:'gender',dimension_value:'female',
  dimension_label:'Mulheres',spend:50,revenue:20,impressions:100,
  clicks:10,leads:2,purchases:0,...overrides,
} as Row<'metrics_ads_breakdowns'>);

const ad=(overrides:Partial<Row<'metrics_ads'>>={})=>({
  organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'account-1',
  currency:'BRL',ad_id:'ad-1',adset_id:'set-1',spend:10,revenue:10,
  impressions:100,clicks:10,leads:1,purchases:0,...overrides,
} as Row<'metrics_ads'>);

const campaign=(overrides:Partial<CampaignPerformance>={})=>({
  organizationId:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',accountId:'account-1',
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
    ()=>preparePerformanceRankings([campaign()],[],[breakdown({organization_id:'22222222-2222-4222-8222-222222222222'})],[]),
    /single organization/,
  );
  assert.throws(
    ()=>preparePerformanceRankings([],[],[breakdown()],[
      {organization_id:'22222222-2222-4222-8222-222222222222',platform:'meta_ads',account_id:'account-1',ad_id:'ad-1'} as Row<'creatives'>,
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
    {organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'account-1',ad_id:'ad-1',caption:'Criativo A'} as Row<'creatives'>,
    {organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'account-2',ad_id:'ad-1',caption:'Criativo B'} as Row<'creatives'>,
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

test('invalid breakdown counts cannot be offset by other observations',()=>{
  const result=preparePerformanceRankings([],[],[
    breakdown({spend:20,impressions:100,clicks:10,leads:3,purchases:1,revenue:30}),
    breakdown({account_id:'account-2',spend:5,impressions:-25,clicks:-4,leads:-1,purchases:-2,revenue:-10}),
  ],[]).gender[0];
  assert.equal(result.spend,25);
  assert.equal(result.revenue,20); // legitimate refund
  for(const key of ['impressions','clicks','leads','purchases'] as const){
    assert.equal(result[key],null,key);
  }
});

test('creative and audience fallback treat invalid counts as unknown independently',()=>{
  const result=preparePerformanceRankings([],[
    ad({impressions:100,clicks:-1,leads:0,purchases:Number.POSITIVE_INFINITY}),
  ],[],[]);
  for(const type of ['creative','audience'] as const){
    const row=result[type][0];
    assert.equal(row.spend,10);
    assert.equal(row.impressions,100);
    assert.equal(row.clicks,null);
    assert.equal(row.leads,0);
    assert.equal(row.purchases,null);
  }
});

test('campaign rankings preserve zero, fractional attribution and signed revenue',()=>{
  const row=preparePerformanceRankings([campaign({
    spend:0,revenue:-7,impressions:-1,clicks:0,leads:0.25,purchases:Number.NaN,
  })],[],[],[]).campaign[0];
  assert.equal(row.spend,0);
  assert.equal(row.revenue,-7);
  assert.equal(row.impressions,null);
  assert.equal(row.clicks,0);
  assert.equal(row.leads,0.25);
  assert.equal(row.purchases,null);
});

test('overflowed counts stay unavailable without affecting other ranking metrics',()=>{
  const row=preparePerformanceRankings([],[],[
    breakdown({spend:5,impressions:1e308,clicks:1,leads:1,purchases:0}),
    breakdown({spend:10,impressions:1e308,clicks:2,leads:1,purchases:0}),
  ],[]).gender[0];
  assert.equal(row.impressions,null);
  assert.equal(row.clicks,3);
  assert.equal(row.leads,2);
  assert.equal(row.purchases,0);
  assert.equal(row.spend,15);
});


test('Meta account aliases share the correct creative and audience fallback ranking',()=>{
  // Two different daily observations from the same Meta account; IDs alone differ by act_.
  const facts=[
    ad({account_id:'act_123',metric_date:'2026-10-20',spend:10}),
    ad({account_id:'123',metric_date:'2026-10-21',spend:20}),
  ];
  const creatives=[{organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'123',ad_id:'ad-1',caption:'Peça sintética'} as Row<'creatives'>];
  const first=preparePerformanceRankings([],facts,[],creatives);
  const reversed=preparePerformanceRankings([],[...facts].reverse(),[],creatives);
  for(const dimension of ['creative','audience'] as const){
    assert.equal(first[dimension].length,1,dimension);
    assert.equal(first[dimension][0].spend,30);
    assert.equal(first[dimension][0].clicks,20);
    assert.deepEqual(first[dimension],reversed[dimension]);
  }
  assert.equal(first.creative[0].label,'Peça sintética');
});

test('non-Meta providers keep act_ as literal account ID in fallback rankings',()=>{
  const facts=[
    ad({platform:'google_ads',account_id:'act_123'}),
    ad({platform:'google_ads',account_id:'123'}),
  ];
  const creatives=[{organization_id:'11111111-1111-4111-8111-111111111111',platform:'google_ads',account_id:'123',ad_id:'ad-1',caption:'Google synthetic'} as Row<'creatives'>];
  const result=preparePerformanceRankings([],facts,[],creatives);
  assert.equal(result.audience.length,2);
  assert.equal(result.creative.length,2);
  assert.deepEqual(result.creative.map(row=>row.label).sort(),['Criativo ad-1','Google synthetic']);
});

test('conflicting creative names across Meta aliases use a neutral label regardless of source order',()=>{
  const creatives=[
    {organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'act_123',ad_id:'ad-1',caption:'Versão A'} as Row<'creatives'>,
    {organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',account_id:'123',ad_id:'ad-1',caption:'Versão B'} as Row<'creatives'>,
  ];
  const first=preparePerformanceRankings([],[ad({account_id:'123'})],[],creatives);
  const reversed=preparePerformanceRankings([],[ad({account_id:'123'})],[],[...creatives].reverse());
  assert.equal(first.creative[0].label,'Criativo ad-1');
  assert.deepEqual(first.creative,reversed.creative);
});

test('RANK-SOURCE-GRAIN-001: incomplete Meta account markers cannot appear as ranking identities',()=>{
  for (const account_id of ['act_', '', 'act_ ', 'act_ 123', ' 123', '123 ']) {
    assert.throws(() => preparePerformanceRankings([], [ad({account_id})], [], []), /intact source identifiers/, account_id);
  }
});


test('single-source tenant mismatch is rejected for all four ranking inputs',()=>{
  const wrongCreative = {organization_id:'22222222-2222-4222-8222-222222222222',platform:'meta_ads',account_id:'account-1',ad_id:'ad-1'} as Row<'creatives'>;
  assert.throws(()=>scopedRankings([campaign({organizationId:'22222222-2222-4222-8222-222222222222'})],[],[],[],'11111111-1111-4111-8111-111111111111','BRL'),/single organization/);
  assert.throws(()=>scopedRankings([],[ad({organization_id:'22222222-2222-4222-8222-222222222222'})],[],[],'11111111-1111-4111-8111-111111111111','BRL'),/single organization/);
  assert.throws(()=>scopedRankings([],[],[breakdown({organization_id:'22222222-2222-4222-8222-222222222222'})],[],'11111111-1111-4111-8111-111111111111','BRL'),/single organization/);
  assert.throws(()=>scopedRankings([],[],[],[wrongCreative],'11111111-1111-4111-8111-111111111111','BRL'),/single organization/);
});

test('rankings reject single-currency mismatches and invalid expected scopes',()=>{
  assert.throws(()=>scopedRankings([], [ad({currency:'USD'})], [], [], '11111111-1111-4111-8111-111111111111', 'BRL'),/one known source currency/);
  assert.throws(()=>scopedRankings([campaign({currency:'USD'})], [], [], [], '11111111-1111-4111-8111-111111111111', 'BRL'),/one known source currency/);
  assert.throws(()=>scopedRankings([], [], [breakdown({currency:'USD'})], [], '11111111-1111-4111-8111-111111111111', 'BRL'),/one known source currency/);
  assert.throws(()=>scopedRankings([], [], [], [], '', 'BRL'),/single organization/);
  assert.throws(()=>scopedRankings([], [], [], [], '11111111-1111-4111-8111-111111111111', 'brl'),/one known source currency/);
  assert.deepEqual(scopedRankings([], [], [], [], '11111111-1111-4111-8111-111111111111', 'BRL'), preparePerformanceRankings([], [], [], []));
});

test('authenticated tenant dashboard supplies organization and selected currency to rankings',()=>{
  const source = readFileSync(new URL('../src/app/(tenant)/[organizationSlug]/[section]/page.tsx',import.meta.url),'utf8');
  assert.match(source,/const measuredCampaigns = scopedWorkspaceMeasurements\(currentCampaigns, org\.id, f\.currency\)/);
  assert.match(source,/preparePerformanceRankings\(measuredCampaigns, ads, breakdowns, filteredCreatives, org\.id, f\.currency\)/);
});

test('SEC-CAMP-UUID-001: ranking rejects non-RFC tenant scope on empty sources',()=>{
  for(const invalidId of [
    'tenant-a','11111111-1111-0111-8111-111111111111',
    '11111111-1111-9111-8111-111111111111',
    '11111111-1111-4111-7111-111111111111',
    '11111111-1111-4111-8111-11111111111x',
    '11111111-1111-4111-8111-111111111111 ',
  ]){
    assert.throws(()=>scopedRankings([],[],[],[],invalidId,'BRL'),/single organization/,invalidId);
  }
  const validV7='01933a7b-4f88-7a12-8d29-111111111111';
  assert.equal(scopedRankings([],[],[],[],validV7,'BRL').campaign.length,0);
});

test('SEC-CAMP-UUID-001: matching invalid organization in source rows still fails closed',()=>{
  const invalid='11111111-1111-0111-8111-111111111111';
  assert.throws(()=>scopedRankings([campaign({organizationId:invalid})],[],[],[],invalid,'BRL'),/single organization/);
});


test('RANK-DIM-LABEL-001: conflicting dimension labels resolve to the stable source value',()=>{
  const rows=[
    breakdown({dimension_value:'female',dimension_label:'Mulheres',spend:10}),
    breakdown({account_id:'account-2',dimension_value:'female',dimension_label:'Women',spend:20}),
  ];
  const normal=preparePerformanceRankings([],[],rows,[]).gender;
  const reversed=preparePerformanceRankings([],[],[...rows].reverse(),[]).gender;
  assert.equal(normal.length,1);
  assert.equal(normal[0].label,'female');
  assert.equal(normal[0].spend,30);
  assert.equal(normal[0].leads,4);
  assert.deepEqual(normal,reversed);
});

test('RANK-DIM-LABEL-001: consistent labels are retained and absent labels fall back to source value',()=>{
  const rows=[
    breakdown({dimension_value:'female',dimension_label:' Mulheres ',spend:5}),
    breakdown({dimension_value:'female',dimension_label:'Mulheres',spend:7}),
    breakdown({dimension_value:'male',dimension_label:' ',spend:8}),
  ];
  const result=preparePerformanceRankings([],[],rows,[]).gender;
  assert.equal(result.length,2);
  assert.equal(result.find(item=>item.label==='Mulheres')?.spend,12);
  assert.equal(result.find(item=>item.label==='male')?.spend,8);
  const reversed=preparePerformanceRankings([],[],[...rows].reverse(),[]).gender;
  assert.deepEqual(new Map(result.map(item=>[item.key,item])),new Map(reversed.map(item=>[item.key,item])));
});


test('RANK-SOURCE-GRAIN-001: invalid identities in any ranking source fail closed before aggregation',()=>{
  const bad: Array<() => unknown> = [
    () => preparePerformanceRankings([campaign({campaignId:'campaign-1 '})],[],[],[]),
    () => preparePerformanceRankings([campaign({accountId:' account-1'})],[],[],[]),
    () => preparePerformanceRankings([campaign({platform:'meta_ads ' as CampaignPerformance['platform']})],[],[],[]),
    () => preparePerformanceRankings([],[ad({account_id:'act_'})],[],[]),
    () => preparePerformanceRankings([],[ad({ad_id:' ad-1'})],[],[]),
    () => preparePerformanceRankings([],[ad({adset_id:'set-1\n'})],[],[]),
    () => preparePerformanceRankings([],[],[breakdown({dimension_value:'female '})],[]),
    () => preparePerformanceRankings([],[],[breakdown({account_id:'\t'})],[]),
    () => preparePerformanceRankings([],[],[],[{
      organization_id:'11111111-1111-4111-8111-111111111111', platform:'meta_ads', account_id:'act_', ad_id:'ad-1',
    } as Row<'creatives'>]),
    () => preparePerformanceRankings([],[],[],[{
      organization_id:'11111111-1111-4111-8111-111111111111', platform:'meta_ads', account_id:'123', ad_id:'ad-1 ',
    } as Row<'creatives'>]),
  ];
  for (const attempt of bad) assert.throws(attempt, /intact source identifiers/);
  // Even an otherwise valid campaign cannot excuse malformed source metadata.
  assert.throws(() => preparePerformanceRankings([campaign()],[],[breakdown({dimension_value:' '})],[]), /intact source identifiers/);
});

test('RANK-SOURCE-GRAIN-001: valid opaque IDs, Meta aliases, absent fallback IDs and zero remain supported',()=>{
  const creative = {organization_id:'11111111-1111-4111-8111-111111111111',platform:'meta_ads',
    account_id:'123',ad_id:'ad:part 2',caption:'Peça válida'} as Row<'creatives'>;
  const result=preparePerformanceRankings(
    [campaign({accountId:'act_123',campaignId:'campaign internal space',spend:0,leads:0})],
    [ad({account_id:'act_123',ad_id:'ad:part 2',adset_id:null})],
    [breakdown({account_id:'act_123',dimension_value:'female: segment'})],
    [creative],
  );
  assert.equal(result.campaign[0].spend,0);
  assert.equal(result.campaign[0].leads,0);
  assert.equal(result.creative[0].label,'Peça válida');
  assert.equal(result.gender[0].label,'Mulheres');
  assert.equal(preparePerformanceRankings([],[ad({ad_id:null,adset_id:null})],[],[]).creative.length,0);
});
