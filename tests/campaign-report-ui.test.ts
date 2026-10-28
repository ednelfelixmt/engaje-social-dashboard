import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Row} from '../src/types/database.types';
import {buildCampaignReport} from '../src/lib/reports/campaign-report';
import {buildPerformanceReport,type PerformanceScope} from '../src/lib/reports/performance-report';
import {CampaignReportView} from '../src/components/dashboard/campaign-report';
import {loadTypescript} from './helpers/load-typescript';
const scope:PerformanceScope={organizationId:'11111111-1111-4111-8111-111111111111',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',from:'2026-10-20',to:'2026-10-21',compare:'previous_period',generatedAt:'2026-10-26T12:00:00.000Z'};
const selection={platform:'meta_ads' as const,account:'123',campaign:'synthetic'};
const fact={id:'synthetic',organization_id:scope.organizationId,metric_date:scope.from,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic',campaign_name:'Campaign <script>unsafe</script>',ad_id:'synthetic-ad',currency:'BRL',spend:0,impressions:0,clicks:0,leads:0,attribution_window:'7d_click'} as Row<'metrics_ads'>;

test('campaign UI distinguishes received sums from incomplete calendar totals and shows safe provenance',()=>{
 const html=renderToStaticMarkup(React.createElement(CampaignReportView,{report:buildCampaignReport([fact],[],scope,selection)}));
 for(const text of ['Calendário completo','Observado nos registros recebidos','1/2 dias','Sem registro','Variação indisponível','Imprimir / salvar PDF','não representam zero','7d_click'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>unsafe'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(html.includes('>0</td>'));
});

test('empty campaign cannot print and none-comparison never renders prior tables',()=>{
 const html=renderToStaticMarkup(React.createElement(CampaignReportView,{report:buildCampaignReport([],[],{...scope,compare:'none'},selection)}));assert.ok(html.includes('Sem registros desta campanha'));assert.ok(html.includes('disabled=""'));assert.ok(!html.includes('Comparativo:'));assert.ok(!html.includes('Comparativo observado'));
});

const {PerformanceReportView}=loadTypescript<typeof import('../src/components/dashboard/performance-report-view')>(new URL('../src/components/dashboard/performance-report-view.tsx',import.meta.url),(id,native)=>id==='next/link'?({children,...props}:{children:React.ReactNode})=>React.createElement('a',props,children):native(id));
test('executive campaign drill-down links retain exact platform/account/campaign and current filter scope',()=>{
 const html=renderToStaticMarkup(React.createElement(PerformanceReportView,{report:buildPerformanceReport([fact],[],scope)}));
 const links=[...html.matchAll(/href="([^"]*reports\/campaign[^"]*)"/g)].map(match=>new URL(match[1].replaceAll('&amp;','&'),'https://example.test'));assert.ok(links.length>0);
 for(const link of links){assert.equal(link.pathname,'/synthetic-a/reports/campaign');assert.equal(link.searchParams.get('platform'),'meta_ads');assert.equal(link.searchParams.get('account'),'123');assert.equal(link.searchParams.get('campaign'),'synthetic');assert.equal(link.searchParams.get('from'),scope.from);assert.equal(link.searchParams.get('compare'),'previous_period');}
});

test('ambiguous already-canonical Meta prefixes cannot generate a link to a different account',()=>{
 const report=buildPerformanceReport([{...fact,account_id:'act_act_123'}],[],scope);const html=renderToStaticMarkup(React.createElement(PerformanceReportView,{report}));assert.ok(!html.includes('/reports/campaign?'));
});
