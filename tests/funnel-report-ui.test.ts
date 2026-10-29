import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {buildFunnelReport} from '../src/lib/reports/funnel-report';
import {scope,fact,steps} from './helpers/funnel-report-fixture';
const {FunnelReportView}=loadTypescript<typeof import('../src/components/dashboard/funnel-report-view')>(new URL('../src/components/dashboard/funnel-report-view.tsx',import.meta.url),(id,native)=>id==='next/link'?({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children):native(id));
test('funnel UI shows configured order, independent snapshots, coverage, targets and local export/print',()=>{
 const html=renderToStaticMarkup(React.createElement(FunnelReportView,{report:buildFunnelReport([fact()],[fact({id:'prior',metric_date:'2026-10-18',attribution_window:'1d_click'})],scope,steps)}));
 for(const text of ['Etapa 1','Etapa 5','Comparativo: 2026-10-18 a 2026-10-19','Leads qualificados','CPL','Cobertura: 1 de 1','Referência cadastrada: 25','Vigência não confirmada','Exportar CSV','Imprimir / salvar PDF','pessoas únicas','7d_click','1d_click'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('Maior perda'));assert.ok(!html.includes('% vs.'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(!html.includes('/settings/'));assert.ok(html.includes('performance-report'));assert.ok(html.includes('Plataforma do funil'));assert.ok(html.includes('cada etapa e período'));
});
test('empty funnel disables both document actions and retains unavailable instead of fabricated zero',()=>{
 const html=renderToStaticMarkup(React.createElement(FunnelReportView,{report:buildFunnelReport([],[],{...scope,compare:'none'},steps)}));assert.ok(html.includes('Sem registros'));assert.equal((html.match(/disabled=""/g)??[]).length,2);assert.ok(html.includes('—'));assert.ok(!html.includes('Comparativo:'));
});
