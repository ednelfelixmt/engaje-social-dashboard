import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {model,input,fact} from './helpers/analytics-fixture';
import {buildAnalyticsWorkspace,analyticsCampaignKey} from '../src/lib/reports/analytics-workspace';
import {selectMarketingBI} from '../src/lib/reports/marketing-bi';
function harness<T>(path:string){const state:unknown[]=[];let cursor=0;const module=loadTypescript<T>(new URL(path,import.meta.url),(id,native)=>id==='react'?{...React,useId:()=> 'fixture-id',useMemo:(fn:()=>unknown)=>fn(),useState:(initial:unknown)=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],(value:unknown)=>{state[i]=typeof value==='function'?value(state[i]):value;}];}}:native(id));return{module,render:<R>(fn:()=>R)=>{cursor=0;return fn();}};}
function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{if(!React.isValidElement(node))return [];const element=node as React.ReactElement<Record<string,unknown>>;return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];}
function event(tree:React.ReactNode,label:string,value:string){const select=nodes(tree).find(node=>node.props['aria-label']===label);assert.ok(select,label);(select.props.onChange as(e:unknown)=>void)({target:{value}});}

test('client BI starts with one unit, allows an explicit second indicator and preserves full totals',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-board')>('../src/components/dashboard/marketing-bi-board.tsx');
 const m=model(),before=JSON.stringify(m),render=()=>f.render(()=>f.module.MarketingBIBoard({model:m}));let tree=render();
 const trend=()=>nodes(tree).find(node=>typeof node.type==='function'&&node.type.name==='MarketingBITrend')!;
 assert.equal(trend().props.secondary,undefined);const totals=JSON.stringify((trend().props.selection as {totals:unknown}).totals);
 event(tree,'Indicador secundário do resumo BI','leads');tree=render();assert.equal(trend().props.secondary,'leads');
 assert.equal(JSON.stringify((trend().props.selection as {totals:unknown}).totals),totals);
 event(tree,'Indicador secundário do resumo BI','none');tree=render();assert.equal(trend().props.secondary,undefined);assert.equal(JSON.stringify(m),before);
 event(tree,'Indicador secundário do resumo BI','leads');tree=render();
 const leads=nodes(tree).find(node=>node.props['aria-label']==='Explorar Leads atribuídos');assert.ok(leads);(leads.props.onClick as()=>void)();tree=render();
 assert.equal(nodes(tree).find(node=>node.props['aria-label']==='Indicador secundário do resumo BI')!.props.value,'none');
 assert.equal(trend().props.secondary,undefined,'the selected primary indicator cannot remain hidden in secondary state');
});
test('BI chart modes, series toggles and visual zoom preserve full daily measurements and null gaps',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');const selection=selectMarketingBI(model(),{platform:'all',account:'all',campaign:'all'});
 selection.timeline=Array.from({length:20},(_,i)=>({...selection.timeline[i%2],currentDate:'2026-10-'+String(i+1).padStart(2,'0')}));const before=JSON.stringify(selection);
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'spend',currency:'BRL'}));let tree=render();const columns=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Colunas');assert.ok(columns);(columns.props.onClick as()=>void)();tree=render();assert.ok(nodes(tree).some(node=>node.props.dataKey==='primary'&&node.props.maxBarSize===28));
 event(tree,'Janela visual da série BI','7');tree=render();const chart=nodes(tree).find(node=>Array.isArray(node.props.data));assert.equal((chart?.props.data as {primary:number|null}[]).length,7);assert.ok((chart?.props.data as {primary:number|null}[]).some(p=>p.primary===null));
 assert.equal(nodes(tree).filter(node=>node.type==='tbody').flatMap(node=>React.Children.toArray(node.props.children as React.ReactNode)).length,20);
 const legend=nodes(tree).find(node=>node.props['aria-label']==='Mostrar Investimento · atual');assert.ok(legend);(legend.props.onClick as()=>void)();tree=render();assert.ok(nodes(tree).some(node=>node.props.dataKey==='primary'&&node.props.hide===true));assert.equal(JSON.stringify(selection),before);
});

test('BI calendar inspection keeps source presence independent of the selected metric and preserves real comparison dates',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const data=input();data.ads[0].leads=0;data.priorAds=[];
 const selection=selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'}),before=JSON.stringify(selection);
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'cpl',currency:'BRL'}));let tree=render();
 const calendar=nodes(tree).find(node=>typeof node.type==='function'&&node.type.name==='ObservationCoverage');assert.ok(calendar);
 const intervals=calendar.props.intervals as {received:boolean}[];assert.deepEqual(intervals.map(row=>row.received),[true,false],'a zero-lead record is still a received observation');
 (calendar.props.onSelect as(index:number)=>void)(1);tree=render();
 const inspection=nodes(tree).find(node=>node.props.className==='chart-inspection tv-hide');assert.ok(inspection);
 const html=renderToStaticMarkup(inspection);assert.ok(html.includes('2026-10-21'));assert.ok(html.includes('2026-10-19'));assert.ok(html.includes('—'));assert.equal(JSON.stringify(selection),before);
});
test('campaign ranking cross-filters by platform, account and campaign and can be cleared',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-board')>('../src/components/dashboard/marketing-bi-board.tsx');const data=input();data.ads.push(fact({id:'second',ad_id:'second-ad',account_id:'456',spend:50}));const m=buildAnalyticsWorkspace(data),render=()=>f.render(()=>f.module.MarketingBIBoard({model:m}));let tree=render();const key=analyticsCampaignKey('meta_ads','456',data.ads[0].campaign_id);
 const ranking=nodes(tree).find(node=>typeof node.type==='function'&&node.type.name==='CampaignRanking');assert.ok(ranking);(ranking.props.onSelect as(key:string)=>void)(key);tree=render();assert.equal(nodes(tree).find(node=>node.props['aria-label']==='Campanha do BI')?.props.value,key);
 const trend=nodes(tree).filter(node=>typeof node.type==='function'&&node.type.name==='MarketingBITrend').at(-1);assert.equal((trend?.props.selection as {totals:{spend:number}}).totals.spend,50);
 const clear=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Limpar seleção');assert.ok(clear);(clear.props.onClick as()=>void)();tree=render();assert.equal(nodes(tree).find(node=>node.props['aria-label']==='Campanha do BI')?.props.value,'all');assert.equal(m.current.reduce((total,row)=>total+(row.spend??0),0),150);
});

test('BI trend keeps historical dates visible when the comparative period has no observed leads',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const data=input();data.priorAds=[];data.priorBreakdowns=[];
 const selection=selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'});
 assert.equal(selection.priorTotals.leads,null);
 assert.equal(selection.compatible,false,'no previous attribution lineage exists');
 assert.ok(selection.timeline.some(row=>row.previousDate!==null));
 const before=JSON.stringify(selection);
 const tree=f.render(()=>f.module.MarketingBITrend({selection,metric:'leads',currency:'BRL'}));
 const all=nodes(tree);
 assert.ok(all.some(node=>node.type==='th'&&node.props.children==='Data comparativa'));
 assert.ok(all.some(node=>node.type==='p'&&node.props.children==='Sem medições históricas para este indicador no período comparativo; a ausência não foi convertida em zero.'));
 assert.ok(!all.some(node=>node.type==='p'&&node.props.children==='Comparativo histórico de leads/CPL indisponível: janelas de atribuição não equivalentes.'));
 assert.ok(!all.some(node=>node.props.dataKey==='previous'),'do not invent a line when the source has no historical observations');
 assert.equal(all.filter(node=>node.type==='tbody').flatMap(node=>React.Children.toArray(node.props.children as React.ReactNode)).length,selection.timeline.length);
 assert.equal(JSON.stringify(selection),before);
});
test('BI trend preserves historical dates without revealing attribution-incompatible lead values',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const data=input();data.priorAds[0].attribution_window='1d_click';
 const selection=selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'});
 assert.equal(selection.compatible,false);
 const before=JSON.stringify(selection),tree=f.render(()=>f.module.MarketingBITrend({selection,metric:'leads',currency:'BRL'}));
 const all=nodes(tree);
 assert.ok(all.some(node=>node.type==='th'&&node.props.children==='Data comparativa'));
 assert.ok(all.some(node=>node.type==='p'&&node.props.children==='Comparativo histórico de leads/CPL indisponível: janelas de atribuição não equivalentes.'));
 assert.ok(!all.some(node=>node.type==='p'&&node.props.children==='Sem medições históricas para este indicador no período comparativo; a ausência não foi convertida em zero.'));
 assert.equal(JSON.stringify(selection),before);
});

test('client BI exposes historical bars and zero markers directly to Recharts in every mode',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const selection=selectMarketingBI(model(),{platform:'all',account:'all',campaign:'all'});
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'spend',currency:'BRL'}));let tree=render();
 for(const mode of ['Colunas','Área','Linhas']){
  const button=nodes(tree).find(node=>node.type==='button'&&node.props.children===mode);assert.ok(button);(button.props.onClick as()=>void)();tree=render();
  const chart=nodes(tree).find(node=>Array.isArray(node.props.data))!;
  const direct=React.Children.toArray(chart.props.children as React.ReactNode).filter(React.isValidElement) as React.ReactElement<Record<string,unknown>>[];
  assert.ok(!direct.some(node=>node.type===React.Fragment));
  assert.ok(direct.some(node=>node.props.dataKey==='primary'));assert.ok(direct.some(node=>node.props.dataKey==='previous'));
  if(mode==='Colunas'){assert.ok(direct.some(node=>node.props.dataKey==='previous'&&node.props.maxBarSize===22));assert.ok(direct.some(node=>node.props.dataKey==='zeroPrevious'));}
 }
});
test('historical-only BI measurements cannot keep an empty plot visible after the comparison series is hidden',()=>{
 const data=input();data.ads=[];data.breakdowns=[];
 const selection=selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'});
 const before=JSON.stringify(selection);
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'spend',currency:'BRL'}));
 let tree=render();
 const plot=()=>nodes(tree).some(node=>node.props.className==='bi-trend-plot');
 const toggle=()=>{const button=nodes(tree).find(node=>node.props['aria-label']==='Mostrar Investimento · comparativo');assert.ok(button);(button.props.onClick as()=>void)();tree=render();};
 assert.equal(plot(),true,'a measured historical bar remains visible');
 toggle();
 assert.equal(plot(),false,'hidden historical values cannot justify an empty Recharts surface');
 assert.ok(nodes(tree).some(node=>node.props.className==='bi-empty'&&String(node.props.children).includes('Reative uma série')));
 const tbody=nodes(tree).find(node=>node.type==='tbody');assert.ok(tbody);
 assert.equal(React.Children.toArray(tbody.props.children as React.ReactNode).length,selection.timeline.length,'the audit table retains every calendar position');
 toggle();
 assert.equal(plot(),true,'reactivating the historical series restores the plot');
 assert.equal(JSON.stringify(selection),before,'legend changes never modify the source facts');
});

test('observed zero remains a BI measurement, but hiding its only series produces an explicit empty state',()=>{
 const data=input();data.scope={...data.scope,compare:'none'};data.priorAds=[];data.priorBreakdowns=[];data.priorCrm=[];data.ads[0].spend=0;
 const selection=selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'});
 const before=JSON.stringify(selection);
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'spend',currency:'BRL'}));
 let tree=render();
 const plot=()=>nodes(tree).some(node=>node.props.className==='bi-trend-plot');
 const toggle=()=>{const button=nodes(tree).find(node=>node.props['aria-label']==='Mostrar Investimento · atual');assert.ok(button);(button.props.onClick as()=>void)();tree=render();};
 assert.equal(plot(),true,'zero actually received is not missing');
 toggle();
 assert.equal(plot(),false,'a hidden zero cannot justify an empty graph');
 toggle();
 assert.equal(plot(),true);
 assert.equal(JSON.stringify(selection),before);
});

test('a visual BI window with no measurements explains the empty plot without altering full-period totals',()=>{
 const selection=selectMarketingBI(model(),{platform:'all',account:'all',campaign:'all'});
 const absent=selection.timeline[1];
 selection.timeline=[selection.timeline[0],...Array.from({length:9},(_,i)=>({...absent,index:i+1,currentDate:'2026-10-'+String(i+21).padStart(2,'0')}))];
 const before=JSON.stringify(selection);
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'spend',currency:'BRL'}));
 let tree=render();
 assert.ok(nodes(tree).some(node=>node.props.className==='bi-trend-plot'));
 event(tree,'Janela visual da série BI','7');tree=render();
 assert.ok(!nodes(tree).some(node=>node.props.className==='bi-trend-plot'));
 assert.ok(nodes(tree).some(node=>node.props.className==='bi-empty'&&String(node.props.children).includes('Todo o período')));
 event(tree,'Janela visual da série BI','all');tree=render();
 assert.ok(nodes(tree).some(node=>node.props.className==='bi-trend-plot'));
 assert.equal(JSON.stringify(selection),before);
});
