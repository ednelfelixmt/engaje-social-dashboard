import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import type {Row} from '../src/types/database.types';
import {buildTargetReferences, targetFields, type TargetConfig, type TargetScope} from '../src/lib/reports/target-references';
import {targetReferencesCsv, targetReferencesFilename} from '../src/lib/export/target-references';

const scope: TargetScope = {organizationId:'22222222-2222-4222-8222-222222222222',organizationName:'Synthetic client',organizationSlug:'synthetic',timezone:'America/Cuiaba',currency:'BRL',referenceCurrency:'BRL',from:'2026-10-20',to:'2026-10-20',generatedAt:'2026-10-26T12:00:00.000Z'};
const config = (patch: Partial<TargetConfig> = {}) => ({...Object.fromEntries(targetFields.map(key=>[key,null])),organization_id:scope.organizationId,target_spend:0,target_leads:5,target_ctr:2,...patch} as TargetConfig);
const fact = (patch: Partial<Row<'metrics_ads'>> = {}) => ({id:'synthetic-one',organization_id:scope.organizationId,metric_date:scope.from,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic',campaign_name:'Synthetic',ad_id:'synthetic-ad',currency:'BRL',spend:0,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads'>);
const parse = (csv: string) => {
 const parsed = Papa.parse<Record<string,string>>(csv,{delimiter:';',header:true});
 assert.deepEqual(parsed.errors,[]);
 return parsed.data;
};

test('CSV exports ten independent references with observed zero, unit, date, provenance counts and comparison status',()=>{
 const report=buildTargetReferences([fact()],config(),scope);
 const csv=targetReferencesCsv(report);
 assert.ok(csv.startsWith('\ufeff'));
 const rows=parse(csv);
 assert.equal(rows.length,10);
 const spend=rows.find(row=>row.campo==='target_spend')!;
 assert.equal(spend.valor_observado,'0');assert.equal(spend.valor_referencia,'0');
 assert.equal(spend.diferenca,'0');assert.equal(spend.situacao,'equal');
 assert.equal(spend.moeda_observada,'BRL');assert.equal(spend.moeda_referencia,'BRL');
 assert.equal(spend.dias_com_componentes,'1');assert.equal(spend.dias_esperados,'1');
 assert.equal(spend.registros_fonte,'1');assert.equal(spend.inicio,scope.from);
 assert.equal(spend.fuso_cadastral,scope.timezone);assert.equal(spend.fonte,'metrics_ads');
 assert.equal(rows.find(row=>row.campo==='target_ctr')?.valor_observado,'2');
 assert.equal(rows.find(row=>row.campo==='target_roi')?.situacao,'not_configured');
 assert.ok(!csv.includes('synthetic-one'));assert.ok(!csv.includes('act_123'));
});

test('missing source facts preserve target but never invent measured values or coverage',()=>{
 const rows=parse(targetReferencesCsv(buildTargetReferences([],config(),scope)));
 const spend=rows.find(row=>row.campo==='target_spend')!;
 assert.equal(spend.valor_referencia,'0');assert.equal(spend.valor_observado,'');
 assert.equal(spend.diferenca,'');assert.equal(spend.situacao,'insufficient_data');
 assert.equal(spend.dias_com_componentes,'0');assert.equal(spend.dias_recebidos,'0');
});

test('mismatched currency must retain separate units and no fabricated comparison',()=>{
 const report=buildTargetReferences([fact({currency:'USD'})],config(),{...scope,currency:'USD'});
 const spend=parse(targetReferencesCsv(report)).find(row=>row.campo==='target_spend')!;
 assert.equal(spend.moeda_observada,'USD');assert.equal(spend.moeda_referencia,'BRL');
 assert.equal(spend.valor_observado,'0');assert.equal(spend.valor_referencia,'0');
 assert.equal(spend.diferenca,'');assert.equal(spend.situacao,'currency_mismatch');
});

test('invalid references, unsupported sources and impossible numbers never serialize as numeric measurements',()=>{
 const report=buildTargetReferences([fact()],config({target_spend:Number.NaN,target_roi:9}),scope);
 const rows=parse(targetReferencesCsv(report));
 const spend=rows.find(row=>row.campo==='target_spend')!;
 assert.equal(spend.valor_referencia,'');assert.equal(spend.diferenca,'');
 assert.equal(spend.situacao,'invalid_target');
 const roi=rows.find(row=>row.campo==='target_roi')!;
 assert.equal(roi.situacao,'unsupported');assert.equal(roi.valor_observado,'');
 assert.ok(!targetReferencesCsv(report).includes('NaN'));
 assert.ok(!targetReferencesCsv(report).includes('Infinity'));
});

test('CSV neutralizes external spreadsheet formulas, delimiter and quotes without altering trusted quantities',()=>{
 const report=buildTargetReferences([fact()],config(),{...scope,organizationName:'=HYPERLINK("example.invalid";"open")\nnext'});
 const rows=parse(targetReferencesCsv(report));
 assert.ok(rows[0].cliente.startsWith("'=HYPERLINK"));
 assert.equal(rows[0].valor_observado,'0');
 assert.equal(rows[0].situacao,'equal');
});

test('filename is deterministic and strips traversal, separators and external characters',()=>{
 const report=buildTargetReferences([fact()],config(),scope);
 assert.equal(targetReferencesFilename(report),'synthetic-referencias-2026-10-20-2026-10-20.csv');
 const unsafe={...report,scope:{...scope,organizationSlug:'../../=other\\sub'}};
 const filename=targetReferencesFilename(unsafe);
 assert.ok(!filename.includes('/'));assert.ok(!filename.includes('\\'));
 assert.ok(!filename.includes('='));
 assert.ok(filename.endsWith('.csv'));
});


test('CSV labels CTR differences as percentage points, independently of the measured percent unit',()=>{
 const report=buildTargetReferences([fact()],config({target_ctr:1}),scope);const ctr=parse(targetReferencesCsv(report)).find(row=>row.campo==='target_ctr')!;assert.equal(ctr.versao,'2');assert.equal(ctr.unidade,'percent');assert.equal(ctr.diferenca,'1');assert.equal(ctr.unidade_diferenca,'percentage_points');
});
