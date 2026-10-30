import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {fact} from './helpers/analytics-fixture';
import {buildAgencyIntelligence,selectAgencyIntelligence} from '../src/lib/reports/agency-intelligence';
import {summarizeClientAds} from '../src/lib/metrics/agency-overview';
import type {AgencyClientCard} from '../src/lib/reports/agency-portfolio';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const metadata=[{id:a,name:'Aurora sintética',slug:'synthetic-a',currency:'BRL',timezone:'America/Cuiaba'},{id:b,name:'Horizonte sintético',slug:'synthetic-b',currency:'BRL',timezone:'America/Cuiaba'}];
const makeRows=()=>[fact({organization_id:a,metric_date:'2026-10-01',spend:100}),fact({id:'b',organization_id:b,metric_date:'2026-10-01',spend:50})];
function fixture(){const rows=makeRows(),model=buildAgencyIntelligence({clients:metadata,current:rows,previous:[],from:'2026-10-01',to:'2026-10-03',compare:'none'}),clients:AgencyClientCard[]=metadata.map(client=>({...client,summary:summarizeClientAds(client.id,client.currency,rows.filter(row=>row.organization_id===client.id)),hasData:true,connected:true,lastSync:null,logoUrl:null}));return {model,clients};}
function harness(){const state:unknown[]=[];let cursor=0;const downloads:string[]=[];const module=loadTypescript<typeof import('../src/components/agency/agency-intelligence-workbench')>(new URL('../src/components/agency/agency-intelligence-workbench.tsx',import.meta.url),(name,native)=>name==='react'?{...React,useId:()=> 'fixture',useMemo:(fn:()=>unknown)=>fn(),useState:(initial:unknown)=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],(next:unknown)=>{state[i]=typeof next==='function'?next(state[i]):next;}];}}:name==='@/lib/export/download'?{downloadCsv:(csv:string)=>downloads.push(csv)}:native(name));return {module,downloads,render:<T>(fn:()=>T)=>{cursor=0;return fn();}};}
function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{if(!React.isValidElement(node))return [];const element=node as React.ReactElement<Record<string,unknown>>;return[element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];}
const named=(tree:React.ReactNode,name:string)=>nodes(tree).find(node=>typeof node.type==='function'&&node.type.name===name);
function change(tree:React.ReactNode,label:string,value:string){const select=nodes(tree).find(node=>node.props['aria-label']===label);assert.ok(select,label);(select.props.onChange as(e:unknown)=>void)({target:{value}});}
test('ranking cross-selection updates KPI, temporal series, funnel and campaign rows together without changing source facts',()=>{
 const f=harness(),data=fixture(),before=JSON.stringify(data.model);let selectedClient='all';const render=()=>f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient,onSelectClient:id=>{selectedClient=id;}}));let tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number}}).totals.spend,150);
 (named(tree,'AgencyClientRanking')?.props.onSelect as(id:string)=>void)(b);tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number}}).totals.spend,50);assert.equal((named(tree,'AgencyEfficiencyChart')?.props.rows as unknown[]).length,1);assert.ok(!renderToStaticMarkup(tree).includes('synthetic-a/reports/campaign'));assert.ok(renderToStaticMarkup(tree).includes('synthetic-b/reports/campaign'));
 const leads=nodes(tree).find(node=>node.props['aria-label']==='Analisar Leads atribuídos na carteira');assert.ok(leads);(leads.props.onClick as()=>void)();tree=render();assert.equal(named(tree,'AgencyTrendChart')?.props.metric,'leads');assert.equal(named(tree,'AgencyTrendChart')?.props.secondary,'none');assert.equal(JSON.stringify(data.model),before);
});
test('platform and granularidade controls alter all projections while table search limits only table and full CSV',()=>{
 const f=harness(),data=fixture(),render=()=>f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));let tree=render();change(tree,'Granularidade da análise da agência','week');tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {timeline:unknown[]}).timeline.length,1);
 (named(tree,'AgencyPlatformChart')?.props.onSelect as(value:string)=>void)('google_ads');tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number|null}}).totals.spend,null);(named(tree,'AgencyPlatformChart')?.props.onSelect as(value:string)=>void)('all');tree=render();
 change(tree,'Buscar campanha ou cliente na carteira','Aurora');tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number}}).totals.spend,150);const csv=nodes(tree).find(node=>node.type==='button'&&Array.isArray(node.props.children)&&React.Children.toArray(node.props.children as React.ReactNode).some(child=>child==='CSV · '));assert.ok(csv);(csv.props.onClick as()=>void)();assert.equal(f.downloads.length,1);assert.ok(f.downloads[0].includes('Aurora sintética'));assert.ok(!f.downloads[0].includes('Horizonte sintético'));
});
test('numeric chart positions cannot be mistaken for client identity',()=>{
 const {agencyChartIdentity}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>native(name));assert.equal(agencyChartIdentity({value:100,payload:{id:a}}),a);assert.equal(agencyChartIdentity({value:a,payload:{id:100}}),null);assert.equal(agencyChartIdentity({id:b}),b);
});

test('campaign pagination limits presentation while CSV exports all matching campaigns safely',()=>{
 const f=harness(),data=fixture();const current=Array.from({length:23},(_,i)=>fact({id:'campaign-'+i,ad_id:'ad-'+i,campaign_id:'campaign-'+i,campaign_name:i===22?'=FORMULA_SYNTHETIC':'Campanha sintética '+i,organization_id:a,metric_date:'2026-10-01'}));data.model=buildAgencyIntelligence({clients:metadata,current,previous:[],from:'2026-10-01',to:'2026-10-03',compare:'none'});const tree=f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));const campaignSection=nodes(tree).find(node=>node.props.className==='agency-bi-panel agency-bi-campaigns');assert.ok(campaignSection);const body=nodes(campaignSection).find(node=>node.type==='tbody');assert.equal(React.Children.count(body?.props.children as React.ReactNode),10);const csv=nodes(tree).find(node=>node.type==='button'&&Array.isArray(node.props.children)&&React.Children.toArray(node.props.children as React.ReactNode).includes('CSV · '));assert.ok(csv);(csv.props.onClick as()=>void)();assert.equal(f.downloads[0].split('\r\n').length,24);assert.ok(f.downloads[0].includes('campaign-22'));assert.ok(f.downloads[0].includes("'=FORMULA_SYNTHETIC"));
});

test('incompatible lead and CPL KPI baselines are withheld while current values and historical spend remain available',()=>{
 const f=harness(),data=fixture();data.model=buildAgencyIntelligence({clients:metadata,current:makeRows().map(row=>({...row,leads:10})),previous:[fact({id:'prior-a',organization_id:a,metric_date:'2026-09-28',spend:80,leads:999,attribution_window:'1d_click'}),fact({id:'prior-b',organization_id:b,metric_date:'2026-09-28',spend:40,leads:888,attribution_window:'1d_click'})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});const tree=f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));
 for(const label of ['Analisar Leads atribuídos na carteira','Analisar CPL na carteira']){const button=nodes(tree).find(node=>node.props['aria-label']===label);assert.ok(button);const html=renderToStaticMarkup(button);assert.ok(html.includes('atribuição não comparável'));assert.ok(html.includes('Sem base comparável'));assert.ok(!html.includes('1.887'));}
 const spend=nodes(tree).find(node=>node.props['aria-label']==='Analisar Investimento na carteira');assert.ok(spend);const html=renderToStaticMarkup(spend);assert.ok(!html.includes('atribuição não comparável'));assert.ok(html.includes('120,00'));
});

test('agency trend retains prior calendar in tooltip when previous period has no observations',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[makeRows()[0]],previous:[],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'}),before=JSON.stringify(selection);
 const {AgencyTrendChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>name==='react'?{...React,useId:()=> 'fixture',useState:(initial:unknown)=>[initial,()=>{}]}:native(name));
 const tree=AgencyTrendChart({selection,metric:'spend',secondary:'none',currency:'BRL'}),all=nodes(tree);
 const chart=all.find(node=>Array.isArray(node.props.data)),tooltip=all.find(node=>typeof node.props.content==='function');
 assert.ok(chart);assert.ok(tooltip);const point=(chart.props.data as unknown[])[0];
 const html=renderToStaticMarkup((tooltip.props.content as (props:unknown)=>React.ReactElement)({active:true,payload:[{payload:point}]}));
 assert.ok(html.includes('28/09/2026'),'calendar date survives absence of historical facts');
 assert.ok(html.includes('Comparativo'));
 assert.ok(all.some(node=>node.type==='p'&&node.props.children==='Sem medições históricas para este indicador; datas do calendário comparativo permanecem disponíveis.'));
 assert.ok(!all.some(node=>node.props.dataKey==='previous'),'no synthetic historical series');
 assert.equal(JSON.stringify(selection),before);
});

test('agency trend keeps prior dates without disclosing incompatible historical lead measurements',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[makeRows()[0]],previous:[fact({id:'incompatible-prior',organization_id:a,metric_date:'2026-09-28',spend:80,leads:987654,attribution_window:'1d_click'})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'});
 assert.equal(selection.compatible,false);
 const {AgencyTrendChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>name==='react'?{...React,useId:()=> 'fixture',useState:(initial:unknown)=>[initial,()=>{}]}:native(name));
 const tree=AgencyTrendChart({selection,metric:'leads',secondary:'none',currency:'BRL'}),all=nodes(tree);
 const chart=all.find(node=>Array.isArray(node.props.data)),tooltip=all.find(node=>typeof node.props.content==='function');
 assert.ok(chart);assert.ok(tooltip);const point=(chart.props.data as unknown[])[0];
 const html=renderToStaticMarkup((tooltip.props.content as (props:unknown)=>React.ReactElement)({active:true,payload:[{payload:point}]}));
 assert.ok(html.includes('28/09/2026'));
 assert.ok(html.includes('atribuição não comparável'));
 assert.ok(!html.includes('987.654'),'historical lead total must not be displayed');
 assert.ok(all.some(node=>node.type==='p'&&node.props.children==='Comparativo de leads/CPL indisponível: atribuição histórica não comparável.'));
 assert.ok(!all.some(node=>node.props.dataKey==='previous'));
});

test('agency platform mix does not coerce an unavailable campaign spend to zero',()=>{
 const f=harness(),data=fixture();
 data.model.datasets[0].current[0].spend=null as unknown as number;
 const tree=f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));
 const chart=named(tree,'AgencyPlatformChart');assert.ok(chart);
 const meta=(chart.props.rows as {platform:string;value:number|null;campaigns:number}[]).find(row=>row.platform==='meta_ads');
 assert.ok(meta);assert.equal(meta.campaigns,2);assert.equal(meta.value,null);
 const {AgencyPlatformChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>native(name));
 assert.ok(renderToStaticMarkup(AgencyPlatformChart({rows:chart.props.rows as {platform:string;value:number|null;campaigns:number}[],currency:'BRL',selected:'all',onSelect:()=>{}})).includes('Distribuição indisponível'));
});
test('agency platform doughnut with individually finite but overflowing total fails closed',()=>{
 const {AgencyPlatformChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>native(name));
 const tree=AgencyPlatformChart({rows:[{platform:'meta_ads',value:1e308,campaigns:1},{platform:'google_ads',value:1e308,campaigns:1},{platform:'tiktok_ads',value:null,campaigns:0}],currency:'BRL',selected:'all',onSelect:()=>{}});
 const pie=nodes(tree).find(node=>node.props.dataKey==='value');
 assert.ok(pie);assert.deepEqual(pie.props.data,[],'do not render Infinity as a pie');
 assert.ok(renderToStaticMarkup(tree).includes('Distribuição indisponível'));
});
