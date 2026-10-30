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

test('BI CSV labels attribution pairing per exported campaign, never by another campaign pair',()=>{
  const data=input();
  data.ads.push(fact({id:'synthetic-current-only',ad_id:'synthetic-ad-current',campaign_id:'campaign-current-only',campaign_name:'Current only',spend:15,leads:0}));
  data.priorAds.push(fact({id:'synthetic-prior-only',ad_id:'synthetic-ad-prior',metric_date:'2026-10-18',campaign_id:'campaign-prior-only',campaign_name:'Prior only',spend:25}));
  const {model,selection}=choose(data);
  const baseline=JSON.stringify(model);
  const rows=parse(marketingBICsv(model,selection));
  assert.equal(rows.length,4);
  const status=(period:string,campaign:string)=>{
    const row=rows.find(item=>item.periodo===period&&item.campanha===campaign);
    assert.ok(row,`Missing ${period}/${campaign}`);
    return row.comparacao_leads_cpl;
  };
  assert.equal(status('atual',data.ads[0].campaign_name),'equivalente');
  assert.equal(status('comparativo',data.priorAds[0].campaign_name),'equivalente');
  assert.equal(status('atual','Current only'),'sem_par_observado');
  assert.equal(status('comparativo','Prior only'),'sem_par_observado');
  assert.equal(rows.find(row=>row.campanha==='Current only')?.leads,'0');
  assert.equal(JSON.stringify(model),baseline,'CSV may not mutate or enrich source facts');

  data.priorAds[0].attribution_window='1d_click';
  const incompatible=choose(data),mixed=parse(marketingBICsv(incompatible.model,incompatible.selection));
  assert.equal(mixed.find(row=>row.periodo==='atual'&&row.campanha===data.ads[0].campaign_name)?.comparacao_leads_cpl,'nao_equivalente');
  assert.equal(mixed.find(row=>row.campanha==='Current only')?.comparacao_leads_cpl,'sem_par_observado');
});


test('BI CSV checks attribution per paired campaign even when another campaign makes the global selection incompatible',()=>{
  const data=input();
  data.ads.push(fact({id:'current-b',ad_id:'current-b-ad',campaign_id:'campaign-b',campaign_name:'Campaign B',spend:50}));
  data.priorAds.push(fact({id:'prior-b',ad_id:'prior-b-ad',campaign_id:'campaign-b',campaign_name:'Campaign B',metric_date:'2026-10-18',spend:60,attribution_window:'1d_click'}));
  const {model,selection}=choose(data);
  assert.equal(selection.compatible,false,'global comparison is incompatible because campaign B changed window');
  const before=JSON.stringify(model),rows=parse(marketingBICsv(model,selection));
  assert.equal(rows.length,4);
  assert.ok(rows.filter(row=>row.campanha==='Synthetic campaign').every(row=>row.comparacao_leads_cpl==='equivalente'));
  assert.ok(rows.filter(row=>row.campanha==='Campaign B').every(row=>row.comparacao_leads_cpl==='nao_equivalente'));
  assert.ok(parse(marketingBICsv(model,selection,'synthetic campaign')).every(row=>row.comparacao_leads_cpl==='equivalente'),'search should not inherit an unrelated campaign mismatch');
  assert.ok(parse(marketingBICsv(model,selection,'campaign b')).every(row=>row.comparacao_leads_cpl==='nao_equivalente'));
  assert.equal(JSON.stringify(model),before,'CSV attribution checks must not mutate source facts or lineage');
});

test('BI CSV fails closed for missing or duplicate attribution lineage without suppressing observed values',()=>{
  const {model,selection}=choose();
  assert.equal(selection.compatible,true);
  for(const lineage of [[],[...model.lineage,...model.lineage]]){
    const synthetic={...model,lineage};
    const rows=parse(marketingBICsv(synthetic,selection));
    assert.equal(rows.length,2);
    assert.ok(rows.every(row=>row.comparacao_leads_cpl==='nao_equivalente'));
    assert.equal(rows[0].spend,'100');
    assert.equal(rows[1].spend,'80');
  }
});

test('BI CSV refuses ambiguous canonical pairs without downgrading independent campaigns',()=>{
  const data=input();
  data.ads.push(fact({id:'now-b',ad_id:'ad-now-b',campaign_id:'campaign-b',campaign_name:'Independent B',spend:25}));
  data.priorAds.push(fact({id:'prior-b',ad_id:'ad-prior-b',campaign_id:'campaign-b',campaign_name:'Independent B',metric_date:'2026-10-18',spend:20}));
  const {model,selection}=choose(data);
  const before=JSON.stringify({model,selection});
  const aId=data.ads[0].campaign_id;
  const a=selection.current.find(row=>row.campaignId===aId);
  const prior=selection.previous.find(row=>row.campaignId===aId);
  assert.ok(a);assert.ok(prior);
  const statuses=(rows:ReturnType<typeof parse>,id:string)=>rows.filter(row=>row.campanha_id===id).map(row=>row.comparacao_leads_cpl);

  // Meta 123 and act_123 identify the same campaign. Both observations must
  // remain in the CSV, but no 1:1 historical comparison can be claimed.
  const duplicateNow={...selection,current:[...selection.current,{...a,accountId:'123',campaignName:'Duplicate now',spend:0,leads:0}]};
  const nowRows=parse(marketingBICsv(model,duplicateNow));
  assert.equal(nowRows.length,5);
  assert.deepEqual(statuses(nowRows,aId),['nao_equivalente','nao_equivalente','nao_equivalente']);
  assert.deepEqual(statuses(nowRows,'campaign-b'),['equivalente','equivalente']);
  assert.equal(nowRows.find(row=>row.campanha==='Duplicate now')?.spend,'0');

  const duplicatePrior={...selection,previous:[...selection.previous,{...prior,accountId:'123',campaignName:'Duplicate prior',spend:0,leads:0}]};
  const priorRows=parse(marketingBICsv(model,duplicatePrior));
  assert.equal(priorRows.length,5);
  assert.deepEqual(statuses(priorRows,aId),['nao_equivalente','nao_equivalente','nao_equivalente']);
  assert.deepEqual(statuses(priorRows,'campaign-b'),['equivalente','equivalente']);
  assert.equal(priorRows.find(row=>row.campanha==='Duplicate prior')?.spend,'0');
  assert.equal(JSON.stringify({model,selection}),before,'no mutation of source models or selected rows');
});

test('BI CSV name search cannot hide a duplicate canonical source identity',()=>{
  const {model,selection}=choose();
  const original=selection.current[0];
  const duplicate={...selection,current:[...selection.current,{...original,accountId:'123',campaignName:'Excluded by search'}]};
  const rows=parse(marketingBICsv(model,duplicate,'Synthetic campaign'));
  assert.equal(rows.length,2,'the unselected alias remains outside the exported rows');
  assert.ok(rows.every(row=>row.comparacao_leads_cpl==='nao_equivalente'));
  assert.ok(rows.every(row=>row.campanha!=='Excluded by search'));
});
