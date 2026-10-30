import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {model} from './helpers/analytics-fixture';
import {AnalyticsSparkline} from '../src/components/dashboard/analytics-sparkline';
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

test('signed finite extremes retain distinct sparkline coordinates and missing-day breaks',()=>{
 const values=[-Number.MAX_VALUE,null,0,Number.MAX_VALUE,Infinity,NaN],original=[...values];
 const html=renderToStaticMarkup(React.createElement(AnalyticsSparkline,{values,color:'#123456'}));
 assert.ok(html.includes('<svg'));
 assert.ok(!html.includes('NaN')&&!html.includes('Infinity'),'no invalid SVG coordinates or paths');
 assert.ok(html.includes('M0.00,30.00'),'the minimum remains at the lower edge');
 assert.ok(html.includes('M44.00,17.00'),'the measured zero remains between the extremes');
 assert.ok(html.includes('L66.00,4.00'),'the maximum remains at the upper edge');
 assert.equal((html.match(/<circle/g)??[]).length,1,'missing day separates the first observed point');
 assert.deepEqual(values,original,'source readings are immutable');
});

test('subnormal finite sparkline readings remain distinct without inventing missing points',()=>{
 const values=[0,Number.MIN_VALUE,Number.MIN_VALUE*2,null,Infinity];
 const html=renderToStaticMarkup(React.createElement(AnalyticsSparkline,{values,color:'#123456'}));
 assert.ok(!html.includes('NaN')&&!html.includes('Infinity'));
 assert.ok(html.includes('M0.00,30.00'));
 assert.ok(html.includes('L27.50,17.00'));
 assert.ok(html.includes('L55.00,4.00'));
 const absent=renderToStaticMarkup(React.createElement(AnalyticsSparkline,{values:[null,Infinity,NaN],color:'#123456'}));
 assert.ok(absent.includes('Sem série diária'));
 assert.ok(!absent.includes('<svg'));
});
