import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {model} from './helpers/analytics-fixture';
const {AnalyticsWorkspace}=loadTypescript<typeof import('../src/components/dashboard/analytics-workspace')>(new URL('../src/components/dashboard/analytics-workspace.tsx',import.meta.url),(id,native)=>id==='next/link'?({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children):native(id));
test('BI renders real period context, semantic deltas, platform/campaign controls, full source tables and unhomologated CRM state',()=>{
 const html=renderToStaticMarkup(React.createElement(AnalyticsWorkspace,{model:model(),canManage:false}));
 for(const text of ['2026-10-20 a 2026-10-21','Comparativo: 2026-10-18 a 2026-10-19','Filtrar campanha','Indicador da série analítica','data-tone="good"','data-tone="bad"','data-tone="neutral"','Funil de marketing','Gênero','Idade','País','Cidade','RD Station Marketing e CRM','aguardando integração e homologação','Consultar valores diários','Mostrar','CSV'])if(text!=='Mostrar')assert.ok(html.includes(text),text);
 assert.ok(!html.includes('settings/integrations'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(html.includes('data-tv-panel'));assert.ok(html.includes('não são aplicados a negócios sem vínculo comprovado'));
});
test('only authorized agency administrators see integration management, without a client-side mutation form',()=>{
 const html=renderToStaticMarkup(React.createElement(AnalyticsWorkspace,{model:model(),canManage:true}));assert.ok(html.includes('/synthetic-fixture/settings/integrations'));assert.ok(!html.includes('<form'));assert.ok(!html.includes('Conectado'));
});

test('tiny real deltas retain direction without presenting a rounded negative zero as improvement',()=>{const data=model();data.previous[0].spend=100.000001;data.previous[0].impressions=1000;const html=renderToStaticMarkup(React.createElement(AnalyticsWorkspace,{model:data,canManage:false}));assert.ok(html.includes('&lt;0,1%'));assert.ok(!html.includes('>-0%'));});

test('clicking a Recharts audience bar selects its original category rather than its composed numeric value',()=>{
 const {AnalyticsAudienceChart}=loadTypescript<typeof import('../src/components/dashboard/analytics-charts')>(new URL('../src/components/dashboard/analytics-charts.tsx',import.meta.url),(id,native)=>native(id));
 const selected:string[]=[],tree=AnalyticsAudienceChart({rows:[{value:'female',label:'Feminino',current:1000,previous:900}],color:'#64a5ff',currency:'BRL',metric:'impressions',comparing:true,onSelect:value=>selected.push(value)});
 function find(node:React.ReactNode):React.ReactElement<{onClick:(entry:unknown)=>void}>|undefined{if(!React.isValidElement(node))return;const props=node.props as {dataKey?:string;onClick?:(entry:unknown)=>void;children?:React.ReactNode};if(props.dataKey==='current'&&props.onClick)return node as React.ReactElement<{onClick:(entry:unknown)=>void}>;for(const child of React.Children.toArray(props.children)){const result=find(child);if(result)return result;}}
 const bar=find(tree);assert.ok(bar);bar.props.onClick({value:1000,payload:{value:'female'}});bar.props.onClick({value:1000,payload:{value:1000}});assert.deepEqual(selected,['female']);
});
