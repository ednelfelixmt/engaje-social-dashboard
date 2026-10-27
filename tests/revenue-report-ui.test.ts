import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RevenueReportView} from '../src/components/dashboard/revenue-report-view';
import {buildRevenueReport} from '../src/lib/reports/revenue-report';
import type {Row} from '../src/types/database.types';
const scope={organizationId:'synthetic-a',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',source:'crm' as const,from:'2026-10-20',to:'2026-10-21',compare:'previous_period' as const};
const fact={id:'synthetic<script>private</script>',organization_id:scope.organizationId,source:'crm',metric_date:scope.from,currency:'BRL',channel:'unattributed',account_id:'',campaign_id:'',revenue:-20,purchases:0,leads:null,checkouts:2,is_complete:true,synced_at:'2026-10-22T12:00:00.000Z'} as Row<'metrics_crm'>;
test('daily revenue view makes gaps, source choice, zero, provenance and limits visible',()=>{
 const html=renderToStaticMarkup(React.createElement(RevenueReportView,{report:buildRevenueReport([fact],[],scope)}));
 for(const text of ['Fonte selecionada: CRM','1 de 2 dias','Sem registro','Declarada pela origem','Comparativo: 2026-10-18','Variação indisponível','Estornos podem produzir receita negativa','não são pessoas únicas','nem substitui conciliação financeira','Última sincronização recebida'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('Exportar CSV de receita'));
 assert.ok(html.includes('synthetic&lt;script&gt;'));assert.ok(!html.includes('<script>private'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(html.includes('>0</td>'));
});
test('empty or unselected comparisons cannot pretend that a source or a total exists',()=>{
 const html=renderToStaticMarkup(React.createElement(RevenueReportView,{report:buildRevenueReport([],[],{...scope,source:'spreadsheet',compare:'none'})}));
 assert.ok(html.includes('Fonte selecionada: Planilha'));assert.ok(html.includes('Sem registros da fonte selecionada'));assert.ok(html.includes('0 de 2 dias'));assert.ok(/disabled=""[^>]*>Exportar CSV de receita/.test(html));
 assert.ok(!html.includes('Comparativo:'));assert.ok(!html.includes('<strong class="mt-2 block text-2xl">0'));
});
