import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {OrganicAccountsReportView} from '../src/components/dashboard/organic-accounts-report';
import {OrganicReportNavigation} from '../src/components/dashboard/organic-report-navigation';
import {buildOrganicAccountsReport,type OrganicAccountRecord} from '../src/lib/reports/organic-accounts';
import type {OrganicScope} from '../src/lib/reports/organic-scope';
const scope:OrganicScope={organizationId:'10000000-0000-4000-8000-000000000001',organizationName:'Synthetic <script>client</script>',organizationSlug:'synthetic',from:'2026-10-20',to:'2026-10-22',timezone:'America/Cuiaba',platform:'instagram_organic',generatedAt:'2026-10-27T13:00:00Z'};
const record:OrganicAccountRecord={id:'row-1',organization_id:scope.organizationId,platform:'instagram_organic',account_id:'<script>synthetic-account</script>',metric_date:'2026-10-20',source_period:'day',synced_at:'2026-10-27T12:00:00Z',impressions:0,reach:null,interactions:4,followers:0,website_clicks:2};
test('account presentation prominently preserves source-window uncertainty, non-additivity and escaped tenant data',()=>{
 const html=renderToStaticMarkup(React.createElement(OrganicAccountsReportView,{report:buildOrganicAccountsReport([record],scope)}));
 for(const text of ['Janela original de medição não confirmada','não comprova atividade diária','Seguidores são estoque','sem crescimento inferido','cliques no site do Instagram continua pendente','Data registrada','Rótulo armazenado','2026-10-27T12:00:00.000Z','2 datas sem registro','campo aceito em 1 de 1 registros','Synthetic &lt;script&gt;client&lt;/script&gt;'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<script>client'));assert.ok(!html.includes('<script>synthetic-account'));assert.ok(html.includes('>0</td>'));assert.ok(html.includes('>—</td>'));
 assert.ok(!html.includes('Taxa de engajamento'));assert.ok(!html.includes('Crescimento:'));assert.ok(!html.includes('<img'));
});
test('unknown collection never claims field coverage and empty account data cannot download',()=>{
 const invalid=renderToStaticMarkup(React.createElement(OrganicAccountsReportView,{report:buildOrganicAccountsReport([{...record,synced_at:'invalid'}],scope)}));
 assert.ok(invalid.includes('Coleta desconhecida'));assert.ok(invalid.includes('campo aceito em 0 de 1 registros'));assert.ok(!invalid.includes('>0</td>'));
 const empty=renderToStaticMarkup(React.createElement(OrganicAccountsReportView,{report:buildOrganicAccountsReport([],scope)}));
 assert.ok(empty.includes('Nenhum registro com rótulo diário'));assert.ok(!empty.includes('<table'));assert.match(empty,/<button type="button" disabled=""/);
});
test('organic report links retain selected dates and provider, without adding currency, mutations or public URLs',()=>{
 const html=renderToStaticMarkup(React.createElement(OrganicReportNavigation,{scope,active:'accounts'}));
 assert.ok(html.includes('/synthetic/reports/organic-accounts?from=2026-10-20&amp;to=2026-10-22&amp;platform=instagram_organic'));
 assert.ok(html.includes('/synthetic/reports/organic-content?from=2026-10-20'));assert.ok(html.includes('aria-current="page"'));
 assert.ok(!html.includes('currency='));assert.ok(!html.includes('compare='));assert.ok(!html.includes('https://'));
});
let count=0,error='',failure=false;
const {OrganicAccountExport}=loadTypescript<typeof import('../src/components/dashboard/organic-account-export')>(new URL('../src/components/dashboard/organic-account-export.tsx',import.meta.url),(id,native)=>{
 if(id==='react')return {...React,useId:()=> 'synthetic-account-export',useState:()=>[error,(value:string)=>{error=value;}]};
 if(id==='@/lib/export/download')return {downloadCsv:()=>{count++;if(failure)throw new Error('PRIVATE_ACCOUNT_DOWNLOAD');}};
 return native(id);
});
function button(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined{
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return;
 if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;
 for(const child of React.Children.toArray(node.props.children)){const found=button(child);if(found)return found;}
}
test('account CSV only downloads after click, blocks empty/disabled content and reports safe errors',()=>{
 count=0;error='';failure=false;
 const enabled=OrganicAccountExport({content:'synthetic',filename:'synthetic.csv',disabled:false});
 assert.equal(count,0);button(enabled)!.props.onClick();assert.equal(count,1);
 button(OrganicAccountExport({content:'synthetic',filename:'synthetic.csv',disabled:true}))!.props.onClick();
 button(OrganicAccountExport({content:'',filename:'synthetic.csv',disabled:false}))!.props.onClick();assert.equal(count,1);
 failure=true;button(enabled)!.props.onClick();
 const html=renderToStaticMarkup(OrganicAccountExport({content:'synthetic',filename:'synthetic.csv',disabled:false}));
 assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('PRIVATE_ACCOUNT_DOWNLOAD'));failure=false;
});
