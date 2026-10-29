import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import {buildAudienceReport, breakdownMetricValue, type AudienceReportScope} from '../src/lib/reports/audience-report';
import {audienceReportCsv, audienceReportFilename} from '../src/lib/export/audience-report';
import type {Row} from '../src/types/database.types';
const scope: AudienceReportScope = {organizationId:'11111111-1111-4111-8111-111111111111',organizationName:'Synthetic organization',organizationSlug:'synthetic',timezone:'America/Cuiaba',platform:'meta_ads',currency:'BRL',from:'2026-10-20',to:'2026-10-21',generatedAt:'2026-10-26T12:00:00.000Z'};
let id=0;
const fact=(patch:Partial<Row<'metrics_ads_breakdowns'>>={})=>({id:'synthetic-'+(++id),organization_id:scope.organizationId,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic-campaign',metric_date:'2026-10-20',dimension_type:'gender',dimension_value:'male',dimension_label:'male',currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads_breakdowns'>);
const build=(rows:Row<'metrics_ads_breakdowns'>[])=>buildAudienceReport(rows,scope);

test('audience scope requires a UUID even for reports without any facts',()=>{
 for(const organizationId of ['', 'synthetic', '11111111-1111-0111-8111-111111111111', '11111111-1111-4111-7111-111111111111', scope.organizationId+' ']){
  assert.throws(()=>buildAudienceReport([],{...scope,organizationId}),/Invalid audience report scope/);
 }
});

test('matched invalid organization identifiers never become valid audience or CSV data',()=>{
 for(const organizationId of ['synthetic','11111111-1111-0111-8111-111111111111', '11111111-1111-4111-7111-111111111111']){
  assert.throws(()=>buildAudienceReport([fact({organization_id:organizationId})],{...scope,organizationId}),/Invalid audience report scope/);
 }
 const report=build([fact({spend:0,impressions:0,clicks:0,leads:0})]);
 assert.equal(report.groups.gender[0].spend,0);
 assert.equal(report.groups.gender[0].impressions,0);
 assert.equal(report.groups.gender[0].leads,0);
});

test('report consolidates only complete observations and retains provenance',()=>{
 const a=fact(),b=fact({metric_date:'2026-10-21',spend:50,clicks:10,leads:0.5});
 const report=build([a,b]);const row=report.groups.gender[0];
 assert.equal(row.spend,150);assert.equal(row.impressions,2000);assert.equal(row.clicks,30);assert.equal(row.leads,5.5);
 assert.equal(row.label,'Masculino');assert.deepEqual(row.sourceIds,[a.id,b.id].sort((x,y)=>x.localeCompare(y)));
 assert.deepEqual(row.coverage,{spend:2,impressions:2,clicks:2,leads:2});assert.equal(breakdownMetricValue(row,'cpc'),5);
 assert.equal(report.attributionWindow,'7d_click');assert.equal(report.scope.timezone,'America/Cuiaba');
});

test('missing or invalid component blocks the total and dependent cost without erasing other metrics',()=>{
 for(const clicks of [null,Number.NaN,Number.POSITIVE_INFINITY,-1,'20' as unknown as number]){
  const row=build([fact(),fact({metric_date:'2026-10-21',clicks})]).groups.gender[0];
  assert.equal(row.clicks,null);assert.equal(row.coverage.clicks,1);assert.equal(breakdownMetricValue(row,'cpc'),null);assert.equal(breakdownMetricValue(row,'ctr'),null);assert.equal(row.impressions,2000);
 }
});

test('zero and fractional observations are not dropped or divided by zero',()=>{
 const row=build([fact({spend:0,impressions:0,clicks:0,leads:0})]).groups.gender[0];
 assert.equal(row.clicks,0);assert.equal(row.spend,0);assert.equal(breakdownMetricValue(row,'ctr'),null);assert.equal(breakdownMetricValue(row,'cpl'),null);
 assert.equal(build([fact({leads:0.5})]).groups.gender[0].leads,0.5);
});

test('overflow and invalid investment stay unavailable instead of becoming zero or infinity',()=>{
 const row=build([fact({spend:1e308}),fact({metric_date:'2026-10-21',spend:1e308})]).groups.gender[0];
 assert.equal(row.spend,null);assert.equal(breakdownMetricValue(row,'cpc'),null);assert.equal(row.coverage.spend,2);
 for(const spend of [-1,Number.NaN,Number.POSITIVE_INFINITY])assert.equal(build([fact({spend})]).groups.gender[0].spend,null);
 assert.equal(breakdownMetricValue({label:'Synthetic',spend:1e308,clicks:1e-308,impressions:1,leads:1},'cpc'),null);
});

test('tenant, provider, currency and calendar bounds must all match before grouping',()=>{
 for(const patch of [{organization_id:'22222222-2222-4222-8222-222222222222'},{platform:'google_ads' as const},{currency:'USD'},{currency:'brl'},{metric_date:'2026-02-30'},{metric_date:'2026-10-22'}])assert.throws(()=>build([fact(),fact(patch)]),/scope mismatch/);
 assert.throws(()=>buildAudienceReport([], {...scope,currency:'brl'}),/scope/);
 assert.throws(()=>buildAudienceReport([], {...scope,generatedAt:'2026-10-26'}),/UTC/);
});

test('duplicate facts including legitimate Meta aliases fail closed, while Google account IDs stay literal',()=>{
 assert.throws(()=>build([fact({account_id:'act_123'}),fact({account_id:'123'})]),/Duplicate/);
 assert.throws(()=>build([fact({id:'same'}),fact({id:'same',metric_date:'2026-10-21'})]),/Duplicate/);
 assert.throws(()=>build([fact({account_id:'act_'})]),/Invalid.*grain/);
 const report=buildAudienceReport([fact({platform:'google_ads',account_id:'act_123'}),fact({platform:'google_ads',account_id:'123'})],{...scope,platform:'google_ads'});
 assert.equal(report.sourceRecords,2);assert.equal(report.groups.gender[0].spend,200);
});

test('different attribution windows are not silently consolidated',()=>{
 assert.throws(()=>build([fact(),fact({metric_date:'2026-10-21',attribution_window:'1d_click'})]),/attribution/);
 assert.equal(build([fact({attribution_window:''})]).attributionWindow,null);
});

test('dimensions remain independent and unsupported dimensions are not exported as demographic cuts',()=>{
 const report=build([fact(),fact({dimension_type:'age',dimension_value:'25-34'}),fact({dimension_type:'creative'})]);
 assert.equal(report.sourceRecords,2);assert.equal(report.omittedRecords,1);
 assert.equal(report.groups.gender[0].impressions,1000);assert.equal(report.groups.age[0].impressions,1000);
 assert.equal(Object.hasOwn(report,'totalImpressions'),false);
 const parsed=Papa.parse<Record<string,string>>(audienceReportCsv(report),{delimiter:';',header:true});
 assert.deepEqual(parsed.data.map(row=>row.dimensao).sort(),['age','gender']);assert.equal(parsed.data.length,2);
});

test('CSV preserves period, source, timezone, coverage, unavailable cells and source IDs',()=>{
 const a=fact(),b=fact({metric_date:'2026-10-21',clicks:null});const report=build([a,b]);
 const csv=audienceReportCsv(report);assert.ok(csv.startsWith('\ufeff'));
 const parsed=Papa.parse<Record<string,string>>(csv,{delimiter:';',header:true});assert.equal(parsed.errors.length,0);
 const row=parsed.data[0];assert.equal(row.inicio,scope.from);assert.equal(row.fim,scope.to);assert.equal(row.fuso_organizacao,scope.timezone);assert.equal(row.moeda,'BRL');assert.equal(row.fonte,'metrics_ads_breakdowns');assert.equal(row.cliques,'');assert.equal(row.cpc,'');assert.equal(row.registros_com_cliques,'1');assert.equal(row.registros_fonte,'2');assert.deepEqual(JSON.parse(row.ids_registros_fonte),report.groups.gender[0].sourceIds);
});

test('CSV neutralizes external formula text and quotes labels with separators and line breaks',()=>{
 const report=buildAudienceReport([fact({dimension_type:'city',dimension_value:'=1+1',dimension_label:'=HYPERLINK("example.invalid";"city")\nnext'})],{...scope,organizationName:'@external'});
 const parsed=Papa.parse<Record<string,string>>(audienceReportCsv(report),{delimiter:';',header:true});
 assert.equal(parsed.errors.length,0);assert.equal(parsed.data[0].cliente,"'@external");assert.equal(parsed.data[0].valor,"'=1+1");assert.ok(parsed.data[0].rotulo.startsWith("'=HYPERLINK"));assert.equal(parsed.data[0].investimento,'100');
 assert.ok(!audienceReportFilename({...report,scope:{...scope,organizationSlug:'../../client'}}).includes('/'));
});

test('empty source has no fabricated data rows',()=>{
 const report=build([]);assert.equal(report.sourceRecords,0);assert.equal(report.groups.gender.length,0);
 assert.equal(Papa.parse(audienceReportCsv(report),{delimiter:';'}).data.length,1);
});


test('AUDIENCE-LABEL-001: canonical labels apply only to their own dimension',()=>{
 const report=build([
  fact({dimension_type:'city',dimension_value:'male',dimension_label:'Cidade Male'}),
  fact({dimension_type:'age',dimension_value:'mobile',dimension_label:'Faixa Mobile'}),
  fact({dimension_type:'gender',dimension_value:'female',dimension_label:'External Female'}),
  fact({dimension_type:'device',dimension_value:'mobile_app',dimension_label:'External Device'}),
 ]);
 assert.equal(report.groups.city[0].label,'Cidade Male');
 assert.equal(report.groups.age[0].label,'Faixa Mobile');
 assert.equal(report.groups.gender[0].label,'Feminino');
 assert.equal(report.groups.device[0].label,'Mobile — aplicativo');
});

test('AUDIENCE-LABEL-001: conflicting source labels use dimension value instead of arbitrary fact',()=>{
 const first=fact({dimension_type:'city',dimension_value:'CUI',dimension_label:'Cuiabá'});
 const second=fact({metric_date:scope.to,dimension_type:'city',dimension_value:'CUI',dimension_label:'Grande Cuiabá'});
 const forward=build([first,second]).groups.city[0];
 const reversed=build([second,first]).groups.city[0];
 assert.equal(forward.label,'CUI');
 assert.deepEqual(forward,reversed);
 assert.equal(forward.spend,200);
 assert.equal(forward.leads,10);
 assert.deepEqual(forward.sourceIds,[first.id,second.id].sort((a,b)=>a.localeCompare(b)));
});

test('AUDIENCE-LABEL-001: consistent, blank and whitespace-only labels do not invent translations',()=>{
 const records=[
  fact({dimension_type:'state',dimension_value:'MT',dimension_label:' Mato Grosso '}),
  fact({metric_date:scope.to,dimension_type:'state',dimension_value:'MT',dimension_label:'Mato Grosso'}),
  fact({dimension_type:'city',dimension_value:'CUI',dimension_label:'  '}),
  fact({dimension_type:'city',dimension_value:'UNKNOWN_CITY',dimension_label:''}),
 ];
 // Different city values are intentionally separate source grains.
 const report=build(records);
 assert.equal(report.groups.state[0].label,'Mato Grosso');
 assert.equal(report.groups.city.find(row=>row.value==='CUI')?.label,'CUI');
 assert.equal(report.groups.city.find(row=>row.value==='UNKNOWN_CITY')?.label,'UNKNOWN_CITY');
 assert.equal(report.groups.state[0].impressions,2000);
});


test('AUDIENCE-SOURCE-GRAIN-001: padded and blank source identities reject the complete demographic report',()=>{
 const malformed: Partial<Row<'metrics_ads_breakdowns'>>[] = [
  {id:'  '},{id:'source-id '},{account_id:' act_123'},{account_id:'act_'},{account_id:'act_ '},
  {campaign_id:' synthetic-campaign'},{campaign_id:'\t'},{dimension_type:' gender'},
  {dimension_type:'  '},{dimension_value:' male'},{dimension_value:'\u00a0'}
 ];
 for(const patch of malformed){
  assert.throws(()=>build([fact(),fact(patch)]),/Invalid audience report grain/);
 }
 // A future/omitted dimension must not conceal an invalid originating source.
 for(const patch of [{id:'padded '},{account_id:'act_ '},{campaign_id:'bad\n'},{dimension_value:' city '}]){
  assert.throws(()=>build([fact(),fact({...patch,dimension_type:'creative'})]),/Invalid audience report grain/);
 }
 assert.throws(()=>build([fact({id:'duplicate-source'}),fact({id:'duplicate-source',dimension_type:'creative'})]),/Duplicate audience report grain/);
});

test('AUDIENCE-SOURCE-GRAIN-001: opaque internal spaces and unclassified empty dimension remain valid',()=>{
 const first=fact({id:'origin:A B',account_id:'act_vendor 12',campaign_id:'segment:A B',dimension_type:'city',dimension_value:'New York',dimension_label:'Nova York',spend:0,leads:0});
 const second=fact({id:'origin:unknown',account_id:'act_vendor 12',campaign_id:'segment:A B',dimension_type:'city',dimension_value:'',dimension_label:'',spend:0,leads:0});
 const report=build([first,second,fact({dimension_type:'creative'})]);
 assert.equal(report.sourceRecords,2);
 assert.equal(report.omittedRecords,1);
 assert.equal(report.groups.city.find(row=>row.value==='New York')?.spend,0);
 assert.equal(report.groups.city.find(row=>row.value==='')?.label,'Não informado');
 assert.equal(report.groups.city.find(row=>row.value==='New York')?.sourceIds[0],'origin:A B');
});
