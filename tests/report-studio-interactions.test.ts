import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {AnalyticsSparkline} from '../src/components/dashboard/analytics-sparkline';

function harness<T>(url:URL,pathname='/synthetic/reports/analytics') {
 const states:unknown[]=[];let cursor=0;
 const module=loadTypescript<T>(url,(id,native)=>id==='react'?{...React,useId:()=> 'synthetic',useMemo:(fn:()=>unknown)=>fn(),useEffect:()=>{},useState:(initial:unknown)=>{const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],(next:unknown)=>{states[index]=typeof next==='function'?next(states[index]):next;}];}}:id==='next/navigation'?{usePathname:()=>pathname}:id==='next/link'?({href,children}:{href:string;children:React.ReactNode})=>React.createElement('a',{href},children):native(id));
 return {module,render:<R>(fn:()=>R)=>{cursor=0;return fn();}};
}
function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{if(!React.isValidElement(node))return [];const element=node as React.ReactElement<Record<string,unknown>>;return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];}

test('sparklines split missing calendar observations and retain isolated measured zero',()=>{
 const html=renderToStaticMarkup(React.createElement(AnalyticsSparkline,{values:[10,null,0],color:'#098d91'}));assert.equal((html.match(/<circle/g)??[]).length,2);assert.ok(html.includes('cx="0"'));assert.ok(html.includes('cx="110"'));assert.ok(!html.includes('NaN'));assert.ok(html.includes('aria-hidden="true"'));
 const absent=renderToStaticMarkup(React.createElement(AnalyticsSparkline,{values:[null,null],color:'#098d91'}));assert.ok(absent.includes('Sem série diária'));assert.ok(!absent.includes('<svg'));
});

test('funnel selection opens the clicked stage and scale changes only visual geometry',()=>{
 const f=harness<typeof import('../src/components/dashboard/funnel-explorer')>(new URL('../src/components/dashboard/funnel-explorer.tsx',import.meta.url));
 const props={currency:'BRL',comparing:true,stages:[{metric:'impressions',label:'Impressões',value:1000,previousValue:800,cost:20,costLabel:'CPM',detail:'Cobertura sintética',target:null},{metric:'leads',label:'Leads',value:0,previousValue:null,cost:null,costLabel:'CPL',detail:'Zero observado',target:null}]};
 const render=()=>f.render(()=>f.module.FunnelExplorer(props));let tree=render();const before=renderToStaticMarkup(tree);assert.ok(before.includes('logarítmica (log1p)'));
 const buttons=nodes(tree).filter(el=>el.props.className==='studio-funnel-step');(buttons[1].props.onClick as ()=>void)();tree=render();const detail=nodes(tree).find(el=>el.props['aria-label']==='Detalhe da etapa selecionada');assert.ok(detail);const html=renderToStaticMarkup(detail);assert.ok(html.includes('Leads'));assert.ok(html.includes('Zero observado'));assert.ok(html.includes('>0</strong>'));assert.ok(html.includes('>—</strong>'));
 const scale=nodes(tree).find(el=>el.props['aria-label']==='Escala visual do funil');(scale?.props.onChange as (e:unknown)=>void)({target:{value:'linear'}});assert.ok(renderToStaticMarkup(render()).includes('Escala linear'));assert.equal(props.stages[1].value,0);
});

test('report appearance defaults to light, tolerates denied storage and does not style unrelated routes',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:{getItem(){throw new Error('Denied');},setItem(){throw new Error('Denied');}},configurable:true});
 try{const f=harness<typeof import('../src/components/dashboard/report-studio-frame')>(new URL('../src/components/dashboard/report-studio-frame.tsx',import.meta.url));const render=()=>f.render(()=>f.module.ReportStudioFrame({children:'synthetic'}));let tree=render();assert.equal(tree.props['data-studio-theme'],'day');const button=nodes(tree).find(el=>el.type==='button');(button?.props.onClick as ()=>void)();tree=render();assert.equal(tree.props['data-studio-theme'],'night');const other=harness<typeof import('../src/components/dashboard/report-studio-frame')>(new URL('../src/components/dashboard/report-studio-frame.tsx',import.meta.url),'/synthetic/settings/branding');assert.equal(other.render(()=>other.module.ReportStudioFrame({children:'private'})).props.className,undefined);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('report search and category filters preserve disabled modules instead of enabling links',()=>{
 const f=harness<typeof import('../src/components/dashboard/report-center')>(new URL('../src/components/dashboard/report-center.tsx',import.meta.url));const props={slug:'synthetic',enabled:[],context:{from:'2026-10-01',to:'2026-10-07',currency:'BRL',compare:'none' as const}};
 const render=()=>f.render(()=>f.module.ReportCenter(props));let tree=render();const input=nodes(tree).find(el=>el.props['aria-label']==='Buscar relatórios');(input?.props.onChange as (e:unknown)=>void)({target:{value:'Meta Ads'}});tree=render();let html=renderToStaticMarkup(tree);assert.ok(html.includes('Público do Meta Ads'));assert.ok(!html.includes('<a '));assert.ok(!html.includes('Funil de mídia paga'));
 (nodes(tree).find(el=>el.props['aria-label']==='Buscar relatórios')?.props.onChange as (e:unknown)=>void)({target:{value:'NO_MATCH_SYNTHETIC'}});html=renderToStaticMarkup(render());assert.ok(html.includes('Nenhum relatório encontrado'));assert.ok(!html.includes('<a '));
});

test('KPI selection controls the primary chart without changing the authorized totals',()=>{
 const {model}=loadTypescript<typeof import('./helpers/analytics-fixture')>(new URL('./helpers/analytics-fixture.ts',import.meta.url),(id,native)=>native(id));const f=harness<typeof import('../src/components/dashboard/analytics-workspace')>(new URL('../src/components/dashboard/analytics-workspace.tsx',import.meta.url));const data=model(),props={model:data,canManage:false},render=()=>f.render(()=>f.module.AnalyticsWorkspace(props));let tree=render();const button=nodes(tree).find(el=>el.props['aria-label']==='Analisar Cliques');assert.ok(button);(button.props.onClick as ()=>void)();tree=render();const trend=nodes(tree).find(el=>typeof el.type==='function'&&el.type.name==='AnalyticsTrend');assert.equal(trend?.props.metric,'clicks');assert.equal(data.current[0].spend,100);
});

test('visual chart window and column mode preserve the full calendar input and totals',()=>{
 const f=harness<typeof import('../src/components/dashboard/analytics-charts')>(new URL('../src/components/dashboard/analytics-charts.tsx',import.meta.url));const rows=Array.from({length:20},(_,i)=>({index:i+1,currentDate:'2026-10-'+String(i+1).padStart(2,'0'),previousDate:null,current:{spend:10,impressions:100,clicks:5,leads:1,ctr:5,cpc:2,cpm:100,cpl:10},previous:null}));const props={rows,metric:'clicks' as const,currency:'BRL',comparing:false},render=()=>f.render(()=>f.module.AnalyticsTrend(props));let tree=render();const window=nodes(tree).find(el=>el.props['aria-label']==='Janela visual do gráfico');(window?.props.onChange as(e:unknown)=>void)({target:{value:'7'}});tree=render();const chart=nodes(tree).find(el=>Array.isArray(el.props.data));assert.equal((chart?.props.data as unknown[]).length,7);const column=nodes(tree).find(el=>el.type==='button'&&el.props.children==='Colunas');(column?.props.onClick as()=>void)();tree=render();assert.ok(nodes(tree).some(el=>el.props.dataKey==='current'&&el.props.maxBarSize===26));assert.equal(rows.length,20);
});

test('interactive KPI buttons describe the measured total, delta and prior period to assistive technology',()=>{
 const {model}=loadTypescript<typeof import('./helpers/analytics-fixture')>(new URL('./helpers/analytics-fixture.ts',import.meta.url),(id,native)=>native(id));
 const f=harness<typeof import('../src/components/dashboard/analytics-workspace')>(new URL('../src/components/dashboard/analytics-workspace.tsx',import.meta.url));
 const tree=f.render(()=>f.module.AnalyticsWorkspace({model:model(),canManage:false}));
 const button=nodes(tree).find(el=>el.props['aria-label']==='Analisar Cliques');
 assert.ok(button,'the clickable KPI still has an action label');
 const ids=String(button.props['aria-describedby']).split(' ');
 assert.equal(ids.length,3,'measured current total, delta and previous period must all be described');
 const descendants=nodes(button);
 const elements=ids.map(id=>descendants.find(el=>el.props.id===id));
 assert.ok(elements.every(Boolean),'each referenced description must exist inside the KPI');
 assert.ok(renderToStaticMarkup(elements[0]).includes('Atual:'));
 assert.ok(renderToStaticMarkup(elements[0]).includes('20'),'current synthetic clicks remain available');
 assert.ok(renderToStaticMarkup(elements[1]).includes('%'),'the delta must be announced alongside its direction');
 assert.ok(renderToStaticMarkup(elements[2]).includes('Anterior: 40'),'the baseline must remain available');
 assert.equal(button.props['aria-pressed'],false,'accessibility does not change KPI selection state');
});

test('KPI buttons without a comparison do not reference absent baseline descriptions',()=>{
 const {input}=loadTypescript<typeof import('./helpers/analytics-fixture')>(new URL('./helpers/analytics-fixture.ts',import.meta.url),(id,native)=>native(id));
 const {buildAnalyticsWorkspace}=loadTypescript<typeof import('../src/lib/reports/analytics-workspace')>(new URL('../src/lib/reports/analytics-workspace.ts',import.meta.url),(id,native)=>native(id));
 const data=input();data.scope={...data.scope,compare:'none'};data.priorAds=[];data.priorBreakdowns=[];data.priorCrm=[];
 const f=harness<typeof import('../src/components/dashboard/analytics-workspace')>(new URL('../src/components/dashboard/analytics-workspace.tsx',import.meta.url));
 const tree=f.render(()=>f.module.AnalyticsWorkspace({model:buildAnalyticsWorkspace(data),canManage:false}));
 const button=nodes(tree).find(el=>el.props['aria-label']==='Analisar Cliques');
 assert.ok(button);
 const ids=String(button.props['aria-describedby']).split(' ');
 assert.equal(ids.length,2,'only current total and an unavailable comparison state can be referenced');
 for(const id of ids)assert.ok(nodes(button).some(el=>el.props.id===id));
 assert.ok(!renderToStaticMarkup(button).includes('Anterior:'),'no historical value is fabricated');
});
