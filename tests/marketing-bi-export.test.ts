import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import {analyticsCampaignKey,buildAnalyticsWorkspace} from '../src/lib/reports/analytics-workspace';
import {selectMarketingBI} from '../src/lib/reports/marketing-bi';
import {marketingBICsv} from '../src/lib/export/marketing-bi';
import {fact,input} from './helpers/analytics-fixture';

const choose = (data = input()) => {
  const model = buildAnalyticsWorkspace(data);
  const selection = selectMarketingBI(model,{platform:'all',account:'all',campaign:'all'});
  return {model,selection};
};
const parse = (csv: string) => {
  const result = Papa.parse<Record<string,string>>(csv,{header:true,delimiter:';'});
  assert.deepEqual(result.errors,[]);
  return result.data;
};

test('BI CSV exports measured current and historical facts with provenance, null and zero intact',()=>{
  const data=input();
  data.ads[0].id='PRIVATE-SYNTHETIC-FACT-IDENTIFIER';
  data.ads[0].campaign_name='=SUM(1;2)';
  data.ads[0].leads=0;
  data.ads[0].clicks=null;
  const {model,selection}=choose(data),before=JSON.stringify(model);
  const csv=marketingBICsv(model,selection),rows=parse(csv);
  assert.equal(JSON.stringify(model),before,'export must not mutate the model');
  assert.equal(marketingBICsv(model,selection),csv,'export must be deterministic');
  assert.equal(rows.length,2);
  assert.equal(rows[0].cliente,model.scope.organizationName);
  assert.equal(rows[0].fonte,'metrics_ads');
  assert.equal(rows[0].fuso_cadastral,'America/Cuiaba');
  assert.equal(rows[0].modo_comparacao,'previous_period');
  assert.equal(rows[0].comparacao_leads_cpl,'equivalente');
  assert.equal(rows[0].periodo,'atual');
  assert.equal(rows[0].leads,'0');
  assert.equal(rows[0].clicks,'');
  assert.equal(rows[0].cpl,'');
  assert.equal(rows[0].campanha,"'=SUM(1;2)");
  assert.equal(rows[1].periodo,'comparativo');
  assert.equal(rows[1].inicio,'2026-10-18');
  assert.equal(rows[1].leads,'10');
  assert.ok(!csv.includes('PRIVATE-SYNTHETIC-FACT-IDENTIFIER'));
  assert.ok(!csv.includes('NaN')&&!csv.includes('Infinity'));
});

test('BI CSV marks attribution-mismatched historical leads/CPL without erasing their raw measurements',()=>{
  const data=input(); data.priorAds[0].attribution_window='1d_click';
  const {model,selection}=choose(data);
  assert.equal(selection.compatible,false);
  const rows=parse(marketingBICsv(model,selection));
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.comparacao_leads_cpl==='nao_equivalente'));
  assert.equal(rows[0].leads,'5');
  assert.equal(rows[1].leads,'10');
});

test('BI CSV excludes prior data when comparison disabled, and preserves empty exports',()=>{
  const data=input(); data.scope={...data.scope,compare:'none'};
  data.priorAds=[];data.priorBreakdowns=[];data.priorCrm=[];
  const {model,selection}=choose(data);
  const rows=parse(marketingBICsv(model,selection));
  assert.equal(rows.length,1);
  assert.equal(rows[0].periodo,'atual');
  assert.equal(rows[0].comparacao_leads_cpl,'desativado');
  assert.equal(parse(marketingBICsv(model,selection,'no matching campaign')).length,0);
});

test('BI CSV respects canonical selected campaign scope and free-text search',()=>{
  const data=input();
  data.ads.push(fact({id:'synthetic-other-id',ad_id:'synthetic-other-ad',campaign_id:'other-campaign',campaign_name:'Other name',spend:25}));
  const model=buildAnalyticsWorkspace(data);
  const selection=selectMarketingBI(model,{platform:'meta_ads',account:'all',campaign:analyticsCampaignKey('meta_ads','123',data.ads[0].campaign_id)});
  const rows=parse(marketingBICsv(model,selection,'SYNTHETIC'));
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.campanha!=='Other name'));
  assert.equal(parse(marketingBICsv(model,selection,'not there')).length,0);
});

test('BI CSV marks search-only campaigns and renamed observations as unpaired, not equivalent',()=>{
  const withUnmatched=input();
  withUnmatched.ads.push(fact({id:'current-b',ad_id:'current-b-ad',campaign_id:'campaign-b',campaign_name:'Only B',spend:25}));
  const first=choose(withUnmatched);
  assert.equal(first.selection.compatible,true);
  const onlyB=parse(marketingBICsv(first.model,first.selection,'ONLY B'));
  assert.equal(onlyB.length,1);
  assert.equal(onlyB[0].periodo,'atual');
  assert.equal(onlyB[0].comparacao_leads_cpl,'sem_par_observado');

  const renamed=input();
  renamed.ads[0].campaign_name='Renamed only current';
  const second=choose(renamed);
  assert.equal(second.selection.compatible,true);
  const currentOnly=parse(marketingBICsv(second.model,second.selection,'renamed only current'));
  assert.equal(currentOnly.length,1);
  assert.equal(currentOnly[0].comparacao_leads_cpl,'sem_par_observado');
});

test('BI CSV fails closed on selection crossing tenant, currency or a disabled comparison',()=>{
  const {model,selection}=choose();
  for (const patch of [{organizationId:'22222222-2222-4222-8222-222222222222'},{currency:'USD'}]) {
    const bad={...selection,previous:[{...selection.previous[0],...patch}]};
    assert.throws(()=>marketingBICsv(model,bad),/scope mismatch/);
  }
  assert.throws(()=>marketingBICsv({...model,scope:{...model.scope,compare:'none'}},selection),/scope mismatch/);
});
