import test from 'node:test';
import Papa from 'papaparse';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildPerformanceReport, type PerformanceScope} from '../src/lib/reports/performance-report';
import {performanceReportCsv, performanceReportFilename} from '../src/lib/export/performance-report';
import {loadTypescript} from './helpers/load-typescript';
import type {Row} from '../src/types/database.types';

const scope: PerformanceScope = {
 organizationId:'synthetic-a', organizationName:'Synthetic A', organizationSlug:'synthetic-a',
 timezone:'America/Cuiaba', currency:'BRL', from:'2026-10-20', to:'2026-10-20',
 compare:'previous_period', generatedAt:'2026-10-26T12:00:00.000Z',
};
const fact = (patch: Partial<Row<'metrics_ads'>> = {}) => ({
 id:'synthetic-secret-source-id', organization_id:scope.organizationId, metric_date:scope.from,
 platform:'meta_ads', account_id:'act_123', campaign_id:'synthetic-campaign', campaign_name:'Synthetic',
 ad_id:'synthetic-ad', currency:'BRL', spend:0, impressions:100, clicks:0,
 leads:null, attribution_window:'7d_click', ...patch,
} as Row<'metrics_ads'>);

test('executive CSV is UTF-8, deterministic, period-scoped, and never exports source record IDs', () => {
 const current = fact({campaign_name:'=HYPERLINK("https://example.test","unsafe")'});
 const previous = fact({id:'synthetic-prior-source-id',metric_date:'2026-10-19',leads:2});
 const report = buildPerformanceReport([current],[previous],scope);
 const csv = performanceReportCsv(report);
 const reversed = performanceReportCsv(buildPerformanceReport([current],[previous],scope));
 assert.equal(csv,reversed);
 assert.ok(csv.startsWith('\ufeff"versao";"gerado_em_utc"'));
 assert.equal(csv.replace(/^\ufeff/, '').split('\r\n').length, 1+2+2+2);
 assert.ok(csv.includes('"comparativo";"2026-10-19";"2026-10-19"'));
 assert.ok(csv.includes('"atual";"2026-10-20";"2026-10-20"'));
 assert.ok(csv.includes(`"'=HYPERLINK(`));
 assert.ok(!csv.includes('"=HYPERLINK('));
 assert.ok(!csv.includes('synthetic-secret-source-id'));
 assert.ok(!csv.includes('synthetic-prior-source-id'));
 assert.ok(csv.includes('"0"'));
 assert.ok(csv.includes('""')); // null measurement remains empty, not zero
 assert.ok(csv.includes('"metrics_ads"'));
 assert.ok(csv.includes('"America/Cuiaba"'));
 assert.ok(csv.includes('"7d_click"'));
});

test('CSV omits comparison when not requested and empty exports contain no invented rows', () => {
 const report = buildPerformanceReport([],[],{...scope,compare:'none'});
 const rows=performanceReportCsv(report).replace(/^\ufeff/,'').split('\r\n');
 assert.equal(rows.length,2); // header plus current (empty) summary
 assert.ok(rows[1].includes('"atual"'));assert.ok(!rows[1].includes('"comparativo"'));
 assert.deepEqual(rows[1].split(';').slice(-8),Array(8).fill('""')); // coverage counts may be 0; missing totals must stay blank
 assert.ok(!performanceReportCsv(report).includes('"undefined"'));
});

test('file name is scoped, bounded, and cannot contain path traversal', () => {
 const filename=performanceReportFilename({...scope,organizationSlug:'../Client / C\n=1'});
 assert.ok(filename.endsWith('-2026-10-20-2026-10-20-previous_period.csv'));
 assert.ok(filename.startsWith('---Client---C--1-relatorio-executivo-'));
 assert.ok(!filename.includes('/'));assert.ok(!filename.includes('\\'));
});

let message='',count=0,fail=false;
const {PerformanceReportExport}=loadTypescript<{PerformanceReportExport:(p:{content:string;filename:string;disabled:boolean})=>React.ReactElement}>(
 new URL('../src/components/dashboard/performance-report-export.tsx',import.meta.url),(id,native)=>{
  if(id==='react') return {...React,useId:()=>'synthetic-csv-note',useState:()=>[message,(value:string)=>{message=value;}]};
  if(id==='@/lib/export/download')return {downloadCsv:()=>{count++;if(fail)throw new Error('Synthetic internal error');}};
  return native(id);
 });
function button(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined {
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return;
 if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;
 for(const child of React.Children.toArray(node.props.children)){const hit=button(child);if(hit)return hit;}
}

test('CSV download is click-only and cannot run for empty or disabled reports', () => {
 message='';count=0;fail=false;
 const enabled=PerformanceReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false});
 assert.equal(count,0);
 assert.equal(button(enabled)?.props.disabled,false);
 assert.ok(renderToStaticMarkup(enabled).includes('aria-describedby="synthetic-csv-note"'));
 button(enabled)!.props.onClick();assert.equal(count,1);
 button(PerformanceReportExport({content:'synthetic',filename:'synthetic.csv',disabled:true}))!.props.onClick();
 button(PerformanceReportExport({content:'',filename:'synthetic.csv',disabled:false}))!.props.onClick();
 assert.equal(count,1);
});

test('download failure is sanitized and never exposes internal errors', () => {
 message='';count=0;fail=true;
 button(PerformanceReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false}))!.props.onClick();
 const html=renderToStaticMarkup(PerformanceReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false}));
 assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Não foi possível preparar o CSV'));
 assert.ok(!html.includes('Synthetic internal error'));fail=false;
});


test('parsed CSV matches canonical period totals and campaign grain without averaging rates or adding summary levels',()=>{
 const rows=[fact({id:'one',spend:100,impressions:1000,clicks:10,leads:2}),fact({id:'two',ad_id:'another-ad',spend:200,impressions:9000,clicks:90,leads:8}),fact({id:'google',platform:'google_ads',spend:50,impressions:100,clicks:0,leads:null})];
 const report=buildPerformanceReport(rows,[],{...scope,compare:'none'});
 const parsed=Papa.parse<Record<string,string>>(performanceReportCsv(report),{header:true,delimiter:';'});
 assert.deepEqual(parsed.errors,[]);assert.equal(parsed.data.length,1+report.platforms.length+report.campaigns.length);
 const summary=parsed.data.find(row=>row.tipo_linha==='resumo')!;
 for(const [column,key] of [['investimento','spend'],['impressoes','impressions'],['cliques','clicks'],['leads_atribuidos','leads'],['ctr_pct','ctr'],['cpc','cpc'],['cpm','cpm'],['cpl_atribuido','cpl']] as const)assert.equal(summary[column],report.current.totals[key]===null?'':String(report.current.totals[key]),column);
 for(const group of report.campaigns){const exported=parsed.data.find(row=>row.tipo_linha==='campanha'&&row.plataforma===group.platform&&row.conta===group.account&&row.campanha_id===group.campaignId)!;assert.equal(exported.investimento,String(group.current.totals.spend));assert.equal(exported.registros_recebidos,String(group.current.sourceIds.length));}
 assert.equal(summary.registros_com_leads,'2');assert.equal(summary.leads_atribuidos,'');assert.equal(summary.cpl_atribuido,'');
 assert.ok(!performanceReportCsv(report).includes('synthetic-secret-source-id'));
});

test('CSV parser round-trips quoted source labels without permitting spreadsheet formulas',()=>{
 const name=' =SUM(1;2)\n"Synthetic"';
 const report=buildPerformanceReport([fact({campaign_name:name})],[],{...scope,compare:'none',organizationName:'@SUM(1;2)'});
 const parsed=Papa.parse<Record<string,string>>(performanceReportCsv(report),{header:true,delimiter:';'});
 assert.deepEqual(parsed.errors,[]);assert.equal(parsed.data.length,3);
 assert.ok(parsed.data.every(row=>row.cliente==="'@SUM(1;2)"));
 assert.equal(parsed.data.find(row=>row.tipo_linha==='campanha')!.campanha,"'"+name);
});
