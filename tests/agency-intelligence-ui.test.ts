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

function trendHarness(){
 const state:unknown[]=[];let cursor=0;
 const module=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>name==='react'?{...React,useId:()=> 'fixture',useState:(initial:unknown)=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],(value:unknown)=>{state[i]=typeof value==='function'?value(state[i]):value;}];}}:native(name));
 return {module,render:<T>(fn:()=>T)=>{cursor=0;return fn();}};
}

test('grouped comparison and interval inspection preserve dates, missing observations and full KPI totals',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[makeRows()[0]],previous:[fact({id:'prior-a',organization_id:a,metric_date:'2026-09-28',spend:80})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'}),before=JSON.stringify(selection);
 const f=trendHarness(),render=()=>f.render(()=>f.module.AgencyTrendChart({selection,metric:'spend',secondary:'none',currency:'BRL'}));let tree=render();
 assert.ok(nodes(tree).some(node=>node.props.dataKey==='previous'&&node.props.maxBarSize===22),'historical facts have grouped columns');
 assert.ok(!nodes(tree).some(node=>node.props.dataKey==='previous'&&node.props.strokeDasharray),'default comparison is not a fragmented line');
 const coverage=named(tree,'ObservationCoverage')!;assert.ok(coverage);const intervals=coverage.props.intervals as {received:boolean}[];assert.deepEqual(intervals.map(row=>row.received),[true,false,false]);
 (coverage.props.onSelect as(index:number)=>void)(1);tree=render();
 const inspection=nodes(tree).find(node=>node.props.className==='chart-inspection tv-hide');assert.ok(inspection);const html=renderToStaticMarkup(inspection);
 assert.ok(html.includes('02/10/2026'));assert.ok(html.includes('29/09/2026'));assert.ok(html.includes('—'),'absent interval is never shown as a zero');
 assert.equal(JSON.stringify(selection),before,'inspection cannot change totals, calendar or source measurements');
});

test('coverage describes weekly intervals and source records even when the selected ratio is unavailable',()=>{
 const model=buildAgencyIntelligence({clients:metadata,current:[fact({organization_id:a,metric_date:'2026-10-01',spend:100,leads:0})],previous:[],from:'2026-10-01',to:'2026-10-10',compare:'none'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a,b],currency:'BRL',platform:'all',granularity:'week'});
 const f=trendHarness();const tree=f.render(()=>f.module.AgencyTrendChart({selection,metric:'cpl',secondary:'none',currency:'BRL'}));
 const intervals=named(tree,'ObservationCoverage')!.props.intervals as {label:string;received:boolean;detail:string}[];
 assert.equal(intervals.length,2);assert.equal(intervals[0].label,'01/10/2026 a 07/10/2026');assert.equal(intervals[0].received,true);
 assert.ok(intervals[0].detail.includes('1 de 7 dias'));assert.ok(intervals[0].detail.includes('1 de 2 clientes'));assert.equal(intervals[1].received,false);
 assert.equal(selection.totals.cpl,null);
});

test('compact platform shares and efficiency summaries select exact authorized clients without inferring missing costs',()=>{
 const f=trendHarness();const selected:string[]=[];
 const sources=f.module.AgencyPlatformChart({rows:[{platform:'meta_ads',value:100,campaigns:1},{platform:'google_ads',value:300,campaigns:1},{platform:'tiktok_ads',value:null,campaigns:0}],currency:'BRL',selected:'all',onSelect:id=>selected.push(id)});
 assert.deepEqual(nodes(sources).filter(node=>node.type==='b').map(node=>node.props.children),['25%','75%','—']);
 (nodes(sources).filter(node=>node.type==='button')[1].props.onClick as()=>void)();assert.deepEqual(selected,['google_ads']);
 const data=fixture(),selection=selectAgencyIntelligence(data.model,{clientIds:[a,b],currency:'BRL',platform:'all',granularity:'day'});
 const rows=selection.clients.map((row,i)=>({...row,name:metadata[i].name,current:{...row.current,leads:i===0?0:2,cpl:i===0?null:25}})),before=JSON.stringify(rows);
 const tree=f.module.AgencyEfficiencySummary({rows,currency:'BRL',onSelect:id=>selected.push(id),page:0,onPage:()=>{}}),html=renderToStaticMarkup(tree);
 assert.ok(html.includes('Sem lead atribuído'));assert.ok(html.includes('25,00'));assert.ok(html.includes('—'));
 (nodes(tree).find(node=>node.type==='button')!.props.onClick as()=>void)();assert.deepEqual(selected,['google_ads',a]);assert.equal(JSON.stringify(rows),before);
});

test('efficiency pagination bounds TV rows while retaining access to every selected client',()=>{
 const f=trendHarness(),data=fixture(),selection=selectAgencyIntelligence(data.model,{clientIds:[a,b],currency:'BRL',platform:'all',granularity:'day'});
 const rows=Array.from({length:9},(_,i)=>({...selection.clients[0],id:'synthetic-client-'+i,name:'Cliente sintético '+i}));
 const before=JSON.stringify(rows),pages:number[]=[];const seen:string[]=[];
 for(let page=0;page<3;page++){
  const tree=f.module.AgencyEfficiencySummary({rows,currency:'BRL',page,onPage:value=>pages.push(value),onSelect:id=>seen.push(id)});
  const clients=nodes(tree).filter(node=>typeof node.props['aria-label']==='string'&&(node.props['aria-label'] as string).startsWith('Analisar eficiência de'));
  assert.equal(clients.length,page===2?1:4);for(const client of clients)(client.props.onClick as()=>void)();
  if(page===0){const next=nodes(tree).find(node=>node.props['aria-label']==='Próximos clientes no resumo de eficiência');assert.ok(next);(next.props.onClick as()=>void)();}
 }
 assert.deepEqual(seen,rows.map(row=>row.id));assert.deepEqual(pages,[1]);assert.equal(JSON.stringify(rows),before);
});

test('executive chart starts with one unit and shares totals and coverage with the selected facts',()=>{
 const f=harness(),data=fixture();const tree=f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));
 const props=named(tree,'AgencyTrendChart')!.props;
 assert.equal(props.secondary,'none','a second unit is an explicit choice');
 const {AgencyTrendChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>name==='react'?{...React,useId:()=> 'fixture',useState:(initial:unknown)=>[initial,()=>{}]}:native(name));
 const chart=AgencyTrendChart(props as Parameters<typeof AgencyTrendChart>[0]);
 const summary=nodes(chart).find(node=>node.props.className==='agency-chart-summary');
 assert.ok(summary);const html=renderToStaticMarkup(summary);
 assert.ok(html.includes('150,00'));assert.ok(html.includes(' / 3 dias'));assert.ok(html.includes('Dias com registros'));
 const dataNode=nodes(chart).find(node=>Array.isArray(node.props.data))!;
 const points=dataNode.props.data as {current:number|null}[];
 assert.deepEqual(points.map(point=>point.current),[150,null,null],'missing collection days remain absent');
 assert.ok(nodes(chart).some(node=>node.props.dataKey==='current'&&node.props.maxBarSize===28),'observed daily values start as columns');
});

test('client ranking uses one scale for current and historical amounts, preserves names and selects exact client',()=>{
 const {AgencyClientRanking}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>native(name));
 const data=fixture(),selection=selectAgencyIntelligence(data.model,{clientIds:[a,b],currency:'BRL',platform:'all',granularity:'day'});
 const rows=selection.clients.map((row,i)=>({...row,name:metadata[i].name,previous:{...row.previous,spend:i===0?200:null}}));
 const before=JSON.stringify(rows),selected:string[]=[];
 const tree=AgencyClientRanking({rows,metric:'spend',currency:'BRL',comparing:true,onSelect:id=>selected.push(id)});
 const buttons=nodes(tree).filter(node=>node.type==='button');assert.equal(buttons.length,2);
 const widths=nodes(buttons[0]).filter(node=>node.type==='i').map(node=>(node.props.style as {width:string}).width);
 assert.deepEqual(widths,['50%','100%'],'100 current and 200 historical share the same maximum');
 const html=renderToStaticMarkup(tree);assert.ok(html.includes(metadata[0].name));assert.ok(html.includes('100,00'));assert.ok(html.includes('200,00'));assert.ok(html.includes('mesma escala'));
 (buttons[1].props.onClick as()=>void)();assert.deepEqual(selected,[b]);assert.equal(JSON.stringify(rows),before);
});

test('agency source shares withhold an overflowing sum instead of displaying invented percentages',()=>{
 const {AgencyPlatformChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>native(name));
 const tree=AgencyPlatformChart({rows:[{platform:'meta_ads',value:Number.MAX_VALUE,campaigns:1},{platform:'google_ads',value:Number.MAX_VALUE,campaigns:1}],currency:'BRL',selected:'all',onSelect:()=>{}});
 const shares=nodes(tree).filter(node=>node.type==='b');assert.equal(shares.length,2);assert.ok(shares.every(node=>node.props.children==='—'));
 assert.ok(renderToStaticMarkup(tree).includes('Distribuição indisponível'));assert.ok(!renderToStaticMarkup(tree).includes('50%'));
});

test('a zero observation keeps a visible marker while missing dates remain null in default columns',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[fact({organization_id:a,metric_date:'2026-10-01',spend:0})],previous:[],from:'2026-10-01',to:'2026-10-03',compare:'none'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'});
 const {AgencyTrendChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>name==='react'?{...React,useId:()=> 'fixture',useState:(initial:unknown)=>[initial,()=>{}]}:native(name));
 const tree=AgencyTrendChart({selection,metric:'spend',secondary:'none',currency:'BRL'}),all=nodes(tree);
 const chart=all.find(node=>Array.isArray(node.props.data))!;
 assert.deepEqual((chart.props.data as {current:number|null}[]).map(row=>row.current),[0,null,null]);
 const markers=all.find(node=>node.props.dataKey==='zeroCurrent'&&node.props.stroke==='none');
 assert.ok(markers);assert.ok(markers.props.dot);assert.equal(markers.props.connectNulls,false);
});
test('ranking cross-selection updates KPI, temporal series, funnel and campaign rows together without changing source facts',()=>{
 const f=harness(),data=fixture(),before=JSON.stringify(data.model);let selectedClient='all';const render=()=>f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient,onSelectClient:id=>{selectedClient=id;}}));let tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number}}).totals.spend,150);
 (named(tree,'AgencyClientRanking')?.props.onSelect as(id:string)=>void)(b);tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number}}).totals.spend,50);assert.equal((named(tree,'AgencyEfficiencySummary')?.props.rows as unknown[]).length,1);assert.ok(!renderToStaticMarkup(tree).includes('synthetic-a/reports/campaign'));assert.ok(renderToStaticMarkup(tree).includes('synthetic-b/reports/campaign'));
 const leads=nodes(tree).find(node=>node.props['aria-label']==='Analisar Leads atribuídos na carteira');assert.ok(leads);(leads.props.onClick as()=>void)();tree=render();assert.equal(named(tree,'AgencyTrendChart')?.props.metric,'leads');assert.equal(named(tree,'AgencyTrendChart')?.props.secondary,'none');assert.equal(JSON.stringify(data.model),before);
});
test('platform and granularidade controls alter all projections while table search limits only table and full CSV',()=>{
 const f=harness(),data=fixture(),render=()=>f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));let tree=render();change(tree,'Granularidade da análise da agência','week');tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {timeline:unknown[]}).timeline.length,1);
 (named(tree,'AgencyPlatformChart')?.props.onSelect as(value:string)=>void)('google_ads');tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number|null}}).totals.spend,null);(named(tree,'AgencyPlatformChart')?.props.onSelect as(value:string)=>void)('all');tree=render();
 change(tree,'Buscar campanha ou cliente na carteira','Aurora');tree=render();assert.equal((named(tree,'AgencyTrendChart')?.props.selection as {totals:{spend:number}}).totals.spend,150);const csv=nodes(tree).find(node=>node.type==='button'&&Array.isArray(node.props.children)&&React.Children.toArray(node.props.children as React.ReactNode).some(child=>child==='CSV · '));assert.ok(csv);(csv.props.onClick as()=>void)();assert.equal(f.downloads.length,1);assert.ok(f.downloads[0].includes('Aurora sintética'));assert.ok(!f.downloads[0].includes('Horizonte sintético'));
});

test('changing the primary indicator clears an identical secondary instead of restoring a hidden axis later',()=>{
 const f=harness(),data=fixture(),before=JSON.stringify(data.model),render=()=>f.render(()=>f.module.AgencyIntelligenceWorkbench({...data,selectedClient:'all',onSelectClient:()=>{}}));let tree=render();
 change(tree,'Indicador secundário da carteira','leads');tree=render();assert.equal(named(tree,'AgencyTrendChart')?.props.secondary,'leads');
 change(tree,'Indicador principal da carteira','leads');tree=render();assert.equal(named(tree,'AgencyTrendChart')?.props.secondary,'none');
 change(tree,'Indicador principal da carteira','spend');tree=render();assert.equal(named(tree,'AgencyTrendChart')?.props.secondary,'none');assert.equal(JSON.stringify(data.model),before);
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

test('agency scatter exposes keyboard-operable selection for every visible client without changing source data',()=>{
 const {AgencyEfficiencyChart}=loadTypescript<typeof import('../src/components/agency/agency-intelligence-charts')>(new URL('../src/components/agency/agency-intelligence-charts.tsx',import.meta.url),(name,native)=>native(name));
 const data=fixture(),before=JSON.stringify(data.model);
 const selection=selectAgencyIntelligence(data.model,{clientIds:[a,b],currency:'BRL',platform:'all',granularity:'day'});
 const rows=selection.clients.map(row=>({...row,name:metadata.find(client=>client.id===row.id)!.name}));
 const picked:string[]=[];
 const tree=AgencyEfficiencyChart({rows,currency:'BRL',onSelect:id=>picked.push(id)});
 const details=nodes(tree).find(node=>node.type==='details'&&node.props.className==='agency-bi-scatter-navigation');
 assert.ok(details,'a chart-only pointer action must have a keyboard alternative');
 const buttons=nodes(details).filter(node=>node.type==='button');
 assert.deepEqual(buttons.map(button=>button.props['aria-label']),['Analisar Aurora sintética na dispersão da agência','Analisar Horizonte sintético na dispersão da agência']);
 (buttons[1].props.onClick as()=>void)();assert.deepEqual(picked,[b],'the alternative selects the exact tenant already in the authorized chart scope');
 assert.ok(renderToStaticMarkup(details).includes('Selecionar cliente sem utilizar o gráfico (2)'));
 const empty=AgencyEfficiencyChart({rows:rows.map(row=>({...row,current:{...row.current,spend:null}})),currency:'BRL',onSelect:()=>{}});
 assert.ok(!nodes(empty).some(node=>node.type==='details'),'no selectable controls without plotted pairs of measures');
 assert.ok(renderToStaticMarkup(empty).includes('Dispersão indisponível'));
 assert.equal(JSON.stringify(data.model),before,'selection UI must never mutate campaign facts');
});

test('Recharts discovers current, prior and zero markers as direct series in every agency mode',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[makeRows()[0]],previous:[fact({id:'prior-direct',organization_id:a,metric_date:'2026-09-28',spend:80})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'});
 const f=trendHarness(),render=()=>f.render(()=>f.module.AgencyTrendChart({selection,metric:'spend',secondary:'none',currency:'BRL'}));let tree=render();
 for(const mode of ['Colunas','Área','Linhas']){
  const button=nodes(tree).find(node=>node.type==='button'&&node.props.children===mode);assert.ok(button);(button.props.onClick as()=>void)();tree=render();
  const chart=nodes(tree).find(node=>Array.isArray(node.props.data))!;
  const direct=React.Children.toArray(chart.props.children as React.ReactNode).filter(React.isValidElement) as React.ReactElement<Record<string,unknown>>[];
  assert.ok(!direct.some(node=>node.type===React.Fragment),'Fragment discovery differs in the optimized App Router runtime');
  assert.ok(direct.some(node=>node.props.dataKey==='current'));
  assert.ok(direct.some(node=>node.props.dataKey==='previous'));
  if(mode==='Colunas'){assert.ok(direct.some(node=>node.props.dataKey==='current'&&node.props.maxBarSize===28));assert.ok(direct.some(node=>node.props.dataKey==='previous'&&node.props.maxBarSize===22));assert.ok(direct.some(node=>node.props.dataKey==='zeroCurrent'));assert.ok(direct.some(node=>node.props.dataKey==='zeroPrevious'));}
 }
});

test('agency historical-only trend is not mistaken for current data when comparison is hidden',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[],previous:[fact({id:'history-only',organization_id:a,metric_date:'2026-09-28',spend:80})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'}),before=JSON.stringify(selection);
 const f=trendHarness(),render=()=>f.render(()=>f.module.AgencyTrendChart({selection,metric:'spend',secondary:'none',currency:'BRL'}));
 let tree=render();
 assert.equal(selection.priorTotals.spend,80);
 assert.ok(nodes(tree).some(node=>node.props.className==='agency-bi-trend'),'initially show valid historical observations');
 const toggle=nodes(tree).find(node=>node.type==='button'&&node.props['aria-pressed']===true&&renderToStaticMarkup(node).includes('Comparativo'));
 assert.ok(toggle);(toggle.props.onClick as()=>void)();tree=render();
 assert.ok(!nodes(tree).some(node=>node.props.className==='agency-bi-trend'),'hidden history must not keep an empty chart');
 assert.ok(renderToStaticMarkup(tree).includes('Sem medições atuais para este indicador; reative o comparativo'));
 const restore=nodes(tree).find(node=>node.type==='button'&&node.props['aria-pressed']===false&&renderToStaticMarkup(node).includes('Comparativo'));
 assert.ok(restore);(restore.props.onClick as()=>void)();tree=render();
 assert.ok(nodes(tree).some(node=>node.props.className==='agency-bi-trend'));
 assert.equal(JSON.stringify(selection),before,'UI toggles do not change analytical facts or tenant selection');
});

test('agency trend keeps an observed current zero visible when the historical series is hidden',()=>{
 const model=buildAgencyIntelligence({clients:[metadata[0]],current:[fact({organization_id:a,metric_date:'2026-10-01',spend:0})],previous:[fact({id:'history-zero',organization_id:a,metric_date:'2026-09-28',spend:80})],from:'2026-10-01',to:'2026-10-03',compare:'previous_period'});
 const selection=selectAgencyIntelligence(model,{clientIds:[a],currency:'BRL',platform:'all',granularity:'day'}),before=JSON.stringify(selection);
 const f=trendHarness(),render=()=>f.render(()=>f.module.AgencyTrendChart({selection,metric:'spend',secondary:'none',currency:'BRL'}));
 let tree=render();const toggle=nodes(tree).find(node=>node.type==='button'&&node.props['aria-pressed']===true&&renderToStaticMarkup(node).includes('Comparativo'));
 assert.ok(toggle);(toggle.props.onClick as()=>void)();tree=render();
 const chart=nodes(tree).find(node=>Array.isArray(node.props.data));assert.ok(chart);
 const values=chart.props.data as {current:number|null;previous:number|null;zeroCurrent:number|null}[];
 assert.equal(values[0].current,0);assert.equal(values[0].zeroCurrent,0);assert.equal(values[1].current,null);
 assert.ok(nodes(tree).some(node=>node.props.dataKey==='zeroCurrent'),'zero remains an observed marker');
 assert.equal(JSON.stringify(selection),before);
});
