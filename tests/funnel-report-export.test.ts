import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFunnelReport} from '../src/lib/reports/funnel-report';
import {funnelReportCsv,funnelReportFilename} from '../src/lib/export/funnel-report';
import {scope,fact,steps} from './helpers/funnel-report-fixture';
import Papa from 'papaparse';
test('funnel CSV preserves current/prior values, zero, gaps, cost formula and source metadata',()=>{
 const r=buildFunnelReport([fact({clicks:0})],[fact({id:'prior',metric_date:'2026-10-18'})],scope,steps);const csv=funnelReportCsv(r);
 const rows=Papa.parse<Record<string,string>>(csv.slice(1),{header:true,delimiter:';'}).data;
 assert.equal(rows.length,10);assert.equal(rows[0].valor,'1000');assert.equal(rows[0].custo,'100');assert.equal(rows[0].fonte,'metrics_ads');assert.equal(rows[0].registros_recebidos,'1');assert.equal(rows[0].inicio,'2026-10-20');assert.equal(rows[1].inicio,'2026-10-18');assert.equal(rows[2].valor,'0');assert.equal(rows[2].custo,'');assert.equal(rows[6].valor,'');assert.equal(rows[6].campanhas_com_valor,'0');assert.ok(rows[0].janelas_atribuicao.includes('7d_click'));
 assert.ok(!csv.includes('synthetic-fact'));assert.equal(funnelReportFilename(r),'synthetic-fixture-funil-todas-2026-10-20-2026-10-21-previous_period.csv');
});
test('untrusted labels are quoted and formula-neutralized in funnel exports',()=>{
 const label='=SYNTHETIC();"';
 const r=buildFunnelReport([fact()],[],{...scope,organizationName:'=SYNTHETIC()'},[{metric:'clicks',label},{metric:'leads',label:'Leads'}]);
 const csv=funnelReportCsv(r),rows=Papa.parse<Record<string,string>>(csv.slice(1),{header:true,delimiter:';'}).data;
 assert.equal(rows[0].cliente,"'=SYNTHETIC()");assert.equal(rows[0].etapa,"'"+label);assert.equal(csv.charCodeAt(0),0xfeff);
});
