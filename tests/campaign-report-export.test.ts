import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import Papa from 'papaparse';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Row} from '../src/types/database.types';
import {buildCampaignReport,campaignDelta} from '../src/lib/reports/campaign-report';
import type {PerformanceScope} from '../src/lib/reports/performance-report';
import {campaignReportCsv,campaignReportFilename} from '../src/lib/export/campaign-report';
import {loadTypescript} from './helpers/load-typescript';

const scope:PerformanceScope={organizationId:'synthetic-a',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',from:'2026-10-20',to:'2026-10-21',compare:'previous_period',generatedAt:'2026-10-26T12:00:00.000Z'};
const selection={platform:'meta_ads' as const,account:'123',campaign:'synthetic-campaign'};
const fact=(patch:Partial<Row<'metrics_ads'>>={})=>({id:'PRIVATE-SOURCE-ID',organization_id:scope.organizationId,platform:'meta_ads',account_id:'act_123',campaign_id:selection.campaign,campaign_name:'Synthetic campaign',ad_id:'PRIVATE-AD-ID',metric_date:scope.from,currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads'>);
const parse=(csv:string)=>{const result=Papa.parse<Record<string,string>>(csv,{header:true,delimiter:';'});assert.deepEqual(result.errors,[]);return result.data;};
const metricColumns={spend:'investimento',impressions:'impressoes',clicks:'cliques',leads:'leads_atribuidos',ctr:'ctr_pct',cpc:'cpc',cpm:'cpm',cpl:'cpl_atribuido'} as const;

test('campaign CSV matches all authorized observed/calendar/daily values, metadata and comparison eligibility',()=>{
 const report=buildCampaignReport([fact(),fact({id:'PRIVATE-SECOND-ID',metric_date:scope.to,spend:0,impressions:100,clicks:0,leads:0})],[fact({id:'PRIVATE-PRIOR-1',metric_date:'2026-10-18',spend:50}),fact({id:'PRIVATE-PRIOR-2',metric_date:'2026-10-19',spend:0})],scope,selection);
 const before=JSON.stringify(report),csv=campaignReportCsv(report),rows=parse(csv);assert.equal(JSON.stringify(report),before);assert.equal(campaignReportCsv(report),csv);assert.equal(rows.length,8);assert.ok(csv.startsWith('\ufeff"versao";'));assert.ok(!csv.includes('PRIVATE-'));assert.ok(!csv.includes(scope.organizationId));
 for(const [label,period] of [['atual',report.current],['comparativo',report.previous!]] as const){
  const observed=rows.find(r=>r.periodo===label&&r.tipo_linha==='total_observado_recebido')!;
  const complete=rows.find(r=>r.periodo===label&&r.tipo_linha==='periodo_componentes_completos')!;
  assert.equal(observed.conta,'123');assert.equal(observed.campanha_id,selection.campaign);assert.equal(observed.plataforma,'meta_ads');assert.equal(observed.moeda,'BRL');assert.equal(observed.fuso_cadastral,scope.timezone);assert.equal(observed.gerado_em_utc,scope.generatedAt);assert.equal(observed.dias_esperados,'2');assert.equal(observed.registros_periodo,'2');assert.equal(observed.anuncios_distintos_periodo,'1');assert.equal(observed.janelas_atribuicao_periodo,JSON.stringify(period.attribution));
  for(const key of Object.keys(metricColumns) as (keyof typeof metricColumns)[]){const col=metricColumns[key];assert.equal(observed[col],String(period.totals[key]));assert.equal(complete[col],String(period.completeTotals[key]));assert.equal(complete['dias_'+col+'_com_componentes_periodo'],'2');const delta=label==='atual'?campaignDelta(report,key):null;assert.equal(complete['variacao_'+(key==='ctr'?'ctr':col)+'_pct'],delta===null?'':String(delta));assert.equal(observed['variacao_'+(key==='ctr'?'ctr':col)+'_pct'],'');}
  for(const day of period.days){const row=rows.find(r=>r.periodo===label&&r.dia===day.date)!;assert.equal(row.registros_dia,String(day.records));assert.equal(row.anuncios_distintos_dia,String(day.ads));for(const key of Object.keys(metricColumns) as (keyof typeof metricColumns)[])assert.equal(row[metricColumns[key]],day.totals[key]===null?'':String(day.totals[key]));}
 }
});

test('missing calendar dates preserve received sums but cannot become complete totals, deltas or delivery zeros',()=>{
 const report=buildCampaignReport([fact()],[fact({metric_date:'2026-10-18'})],scope,selection);const rows=parse(campaignReportCsv(report));const observed=rows.find(r=>r.periodo==='atual'&&r.tipo_linha==='total_observado_recebido')!,complete=rows.find(r=>r.periodo==='atual'&&r.tipo_linha==='periodo_componentes_completos')!,missing=rows.find(r=>r.dia===scope.to)!;
 assert.equal(observed.investimento,'100');assert.equal(observed.dias_investimento_com_componentes_periodo,'1');assert.equal(complete.investimento,'');assert.equal(complete.variacao_investimento_pct,'');assert.equal(missing.registros_dia,'0');assert.equal(missing.anuncios_distintos_dia,'0');for(const col of Object.values(metricColumns))assert.equal(missing[col],'');
});

test('independent missing metrics, real zeros and overflowing sums remain distinct in CSV',()=>{
 const report=buildCampaignReport([fact({spend:Number.MAX_VALUE,leads:null,clicks:0}),fact({id:'PRIVATE-2',metric_date:scope.to,spend:Number.MAX_VALUE,leads:0,clicks:0})],[],{...scope,compare:'none'},selection);const rows=parse(campaignReportCsv(report)),complete=rows.find(r=>r.tipo_linha==='periodo_componentes_completos')!,first=rows.find(r=>r.dia===scope.from)!;
 assert.equal(complete.investimento,'');assert.equal(complete.leads_atribuidos,'');assert.equal(complete.cliques,'0');assert.equal(complete.ctr_pct,'0');assert.equal(complete.cpc,'');assert.equal(first.leads_atribuidos,'');assert.equal(first.cliques,'0');assert.equal(complete.dias_leads_atribuidos_com_componentes_periodo,'1');assert.ok(!campaignReportCsv(report).includes('Infinity'));assert.ok(!campaignReportCsv(report).includes('NaN'));
});

test('unknown or incompatible attribution withholds only lead/CPL deltas and keeps measured values',()=>{
 const one={...scope,to:scope.from};for(const window of ['', '1d_click']){const report=buildCampaignReport([fact()],[fact({metric_date:'2026-10-19',spend:50,attribution_window:window})],one,selection),row=parse(campaignReportCsv(report)).find(r=>r.periodo==='atual'&&r.tipo_linha==='periodo_componentes_completos')!;assert.equal(row.leads_atribuidos,'5');assert.equal(row.variacao_leads_atribuidos_pct,'');assert.equal(row.variacao_cpl_atribuido_pct,'');assert.equal(row.variacao_investimento_pct,'100');}
});

test('none comparison emits current calendar only; an empty source has empty metrics and explicit coverage',()=>{
 const report=buildCampaignReport([],[],{...scope,compare:'none'},selection),rows=parse(campaignReportCsv(report));assert.equal(rows.length,4);assert.ok(rows.every(r=>r.periodo==='atual'&&r.registros_periodo==='0'&&r.janelas_atribuicao_periodo===''));for(const row of rows)for(const col of Object.values(metricColumns))assert.equal(row[col],'');assert.equal(rows.find(r=>r.dia===scope.from)?.registros_dia,'0');
});

test('formula-like external labels and opaque IDs use the shared sanitizer without leaking source/ad IDs',()=>{
 const malicious={...selection,account:'\u200b=123',campaign:'＠SUM(1;2)'};const report=buildCampaignReport([fact({account_id:malicious.account,campaign_id:malicious.campaign,campaign_name:'＝SUM(1;2);"quoted"\nname'})],[],{...scope,organizationName:'\u2066+Unsafe',compare:'none'},malicious);const row=parse(campaignReportCsv(report))[0];assert.equal(row.conta,"'"+malicious.account);assert.equal(row.campanha_id,"'"+malicious.campaign);assert.equal(row.campanha,"'"+report.name);assert.equal(row.cliente,"'"+report.scope.organizationName);assert.ok(!campaignReportCsv(report).includes('PRIVATE-'));
});

test('campaign filename is deterministic, bounded and safe for opaque identities and organization paths',()=>{
 const report=buildCampaignReport([],[],{...scope,compare:'none'},selection);assert.equal(campaignReportFilename(report),'synthetic-a-campanha-meta_ads-123-synthetic-campaign-2026-10-20-2026-10-21-none.csv');const name=campaignReportFilename({...report,scope:{...scope,organizationSlug:'../Unsafe /'.repeat(100)},selection:{...selection,account:'../act/12'.repeat(100),campaign:'../=unsafe\n'.repeat(100)}});assert.ok(!/[\/\\\n\r]/.test(name));assert.ok(name.length<210);assert.ok(name.endsWith('-previous_period.csv'));
});

let error='',clicks=0,fail=false;
const {CampaignReportExport}=loadTypescript<typeof import('../src/components/dashboard/campaign-report-export')>(new URL('../src/components/dashboard/campaign-report-export.tsx',import.meta.url),(id,native)=>{
 if(id==='react')return {...React,useId:()=> 'campaign-csv-note',useState:()=>[error,(value:string)=>{error=value;}]};
 if(id==='@/lib/export/download')return {downloadCsv:()=>{clicks++;if(fail)throw new Error('PRIVATE UPSTREAM ERROR');}};return native(id);
});
function button(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined{
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return;if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;for(const child of React.Children.toArray(node.props.children)){const found=button(child);if(found)return found;}
}
test('campaign CSV download is click-only and blocks disabled or empty contents even through the handler',()=>{
 error='';clicks=0;fail=false;const tree=CampaignReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false});assert.equal(clicks,0);assert.ok(renderToStaticMarkup(tree).includes('aria-describedby="campaign-csv-note"'));assert.ok(renderToStaticMarkup(tree).includes('não some'));button(tree)!.props.onClick();assert.equal(clicks,1);button(CampaignReportExport({content:'synthetic',filename:'synthetic.csv',disabled:true}))!.props.onClick();button(CampaignReportExport({content:'',filename:'synthetic.csv',disabled:false}))!.props.onClick();assert.equal(clicks,1);
});
test('download failure is announced safely and a later successful click clears the error',()=>{
 error='';clicks=0;fail=true;button(CampaignReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false}))!.props.onClick();const html=renderToStaticMarkup(CampaignReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false}));assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('PRIVATE UPSTREAM ERROR'));fail=false;button(CampaignReportExport({content:'synthetic',filename:'synthetic.csv',disabled:false}))!.props.onClick();assert.equal(error,'');assert.equal(clicks,2);
});
