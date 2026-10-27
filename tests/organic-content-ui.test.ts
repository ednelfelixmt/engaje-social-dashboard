import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {OrganicContentReportView} from '../src/components/dashboard/organic-content-report';
import {buildOrganicContentReport,type OrganicContentRecord,type OrganicContentScope} from '../src/lib/reports/organic-content';

const scope:OrganicContentScope={organizationId:'10000000-0000-4000-8000-000000000001',organizationName:'Synthetic <script>organization</script>',organizationSlug:'synthetic',timezone:'America/Cuiaba',platform:'all',from:'2026-10-20',to:'2026-10-20',generatedAt:'2026-10-27T13:00:00Z'};
const record:OrganicContentRecord={id:'synthetic-post',organization_id:scope.organizationId,platform:'instagram_organic',account_id:'synthetic-account',external_id:'synthetic-external',kind:'image',name:null,caption:'Synthetic <img src=x> caption',published_at:'2026-10-20T00:00:00Z',synced_at:'2026-10-27T12:00:00Z',lifetime_metrics:{likes:0,comments:null,saved:2}};
test('organic presentation escapes content and exposes snapshot provenance without fabricated period or user totals',()=>{
 const html=renderToStaticMarkup(React.createElement(OrganicContentReportView,{report:buildOrganicContentReport([record],scope)}));
 for(const text of ['contadores acumulados','Não representam atividade gerada no período','pessoas únicas','Não são somados','1 conteúdo(s)','por data UTC','America/Cuiaba','2026-10-27T12:00:00.000Z','Exportar conteúdos CSV','Última coleta','Synthetic &lt;script&gt;organization&lt;/script&gt;','&lt;img src=x&gt;'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('src="http'));assert.ok(!html.includes('<script>organization'));assert.ok(!html.includes('Taxa de engajamento'));
 assert.ok(html.includes('>0</td>'));assert.ok(html.includes('>—</td>'));
});
test('organic UI preserves empty, invalid-collection and explicitly truncated states',()=>{
 const empty=renderToStaticMarkup(React.createElement(OrganicContentReportView,{report:buildOrganicContentReport([],scope)}));
 assert.ok(empty.includes('Nenhum conteúdo orgânico recebido'));assert.ok(!empty.includes('<table'));assert.match(empty,/<button type="button" disabled=""/);
 const invalid=renderToStaticMarkup(React.createElement(OrganicContentReportView,{report:buildOrganicContentReport([{...record,synced_at:'invalid'}],scope)}));
 assert.ok(invalid.includes('Coleta inválida ou não informada'));assert.ok(!invalid.includes('>0</td>'));
 const records=Array.from({length:501},(_,i)=>({...record,id:'post-'+i,external_id:'post-'+i}));
 const capped=renderToStaticMarkup(React.createElement(OrganicContentReportView,{report:buildOrganicContentReport(records,scope)}));
 assert.ok(capped.includes('limitado aos 500 conteúdos'));assert.ok(capped.includes('CSV e a impressão contêm somente as linhas exibidas'));
});
let count=0,error='',failed=false;
const {OrganicContentExport}=loadTypescript<typeof import('../src/components/dashboard/organic-content-export')>(new URL('../src/components/dashboard/organic-content-export.tsx',import.meta.url),(id,native)=>{
 if(id==='react')return {...React,useId:()=> 'organic-export-note',useState:()=>[error,(value:string)=>{error=value;}]};
 if(id==='@/lib/export/download')return {downloadCsv:()=>{count++;if(failed)throw new Error('PRIVATE_DOWNLOAD_DETAIL');}};
 return native(id);
});
function button(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined{
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return;
 if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;
 for(const child of React.Children.toArray(node.props.children)){const result=button(child);if(result)return result;}
}
test('organic CSV download is user-initiated and empty/disabled handlers cannot download',()=>{
 count=0;failed=false;error='';
 const control=OrganicContentExport({content:'synthetic',filename:'synthetic.csv',disabled:false});
 assert.equal(count,0);button(control)!.props.onClick();assert.equal(count,1);
 for(const props of [{content:'synthetic',disabled:true},{content:'',disabled:false}])button(OrganicContentExport({...props,filename:'synthetic.csv'}))!.props.onClick();
 assert.equal(count,1);
});
test('organic download failures are announced without exposing internal data or claiming success',()=>{
 failed=true;error='';
 button(OrganicContentExport({content:'synthetic',filename:'synthetic.csv',disabled:false}))!.props.onClick();
 const html=renderToStaticMarkup(OrganicContentExport({content:'synthetic',filename:'synthetic.csv',disabled:false}));
 assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Não foi possível preparar'));assert.ok(!html.includes('PRIVATE_DOWNLOAD_DETAIL'));
 failed=false;
});

test('content print document retains selected scope, snapshot caveats and long-caption limits without external resources',()=>{
 const selected={...scope,platform:'instagram_organic' as const};
 const report=buildOrganicContentReport([{...record,caption:'Synthetic caption\n'+'x'.repeat(2100),synced_at:'invalid'}],selected);
 const html=renderToStaticMarkup(React.createElement(OrganicContentReportView,{report}));
 for(const text of ['organic-report organic-content-report','Publicações e contadores orgânicos','Plataforma selecionada: Instagram',scope.from,scope.to,scope.timezone,scope.generatedAt,'contadores acumulados','Não representam atividade gerada no período','Coleta inválida','Legenda truncada','Conta synthetic-account','Conteúdo synthetic-external','Imprimir / salvar PDF'])assert.ok(html.includes(text),text);
 assert.match(html,/<button type="button"(?![^>]*\sdisabled=)[^>]*>Imprimir \/ salvar PDF<\/button>/);
 assert.ok(html.includes('Synthetic caption'));assert.ok(!html.includes('x'.repeat(2100)));
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('>0</td>'));
 const empty=renderToStaticMarkup(React.createElement(OrganicContentReportView,{report:buildOrganicContentReport([],scope)}));
 assert.match(empty,/<button type="button" disabled=""[^>]*>Imprimir \/ salvar PDF<\/button>/);
 assert.ok(empty.includes('Plataforma selecionada: Facebook e Instagram'));
});
