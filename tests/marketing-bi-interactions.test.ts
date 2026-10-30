import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadTypescript} from './helpers/load-typescript';
import {model,input,fact} from './helpers/analytics-fixture';
import {buildAnalyticsWorkspace,analyticsCampaignKey} from '../src/lib/reports/analytics-workspace';
import {selectMarketingBI} from '../src/lib/reports/marketing-bi';
function harness<T>(path:string){const state:unknown[]=[];let cursor=0;const module=loadTypescript<T>(new URL(path,import.meta.url),(id,native)=>id==='react'?{...React,useId:()=> 'fixture-id',useMemo:(fn:()=>unknown)=>fn(),useState:(initial:unknown)=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],(value:unknown)=>{state[i]=typeof value==='function'?value(state[i]):value;}];}}:native(id));return{module,render:<R>(fn:()=>R)=>{cursor=0;return fn();}};}
function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{if(!React.isValidElement(node))return [];const element=node as React.ReactElement<Record<string,unknown>>;return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];}
function event(tree:React.ReactNode,label:string,value:string){const select=nodes(tree).find(node=>node.props['aria-label']===label);assert.ok(select,label);(select.props.onChange as(e:unknown)=>void)({target:{value}});}
test('BI chart modes, series toggles and visual zoom preserve full daily measurements and null gaps',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-charts')>('../src/components/dashboard/marketing-bi-charts.tsx');const selection=selectMarketingBI(model(),{platform:'all',account:'all',campaign:'all'});
 selection.timeline=Array.from({length:20},(_,i)=>({...selection.timeline[i%2],currentDate:'2026-10-'+String(i+1).padStart(2,'0')}));const before=JSON.stringify(selection);
 const render=()=>f.render(()=>f.module.MarketingBITrend({selection,metric:'spend',currency:'BRL'}));let tree=render();const columns=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Colunas');assert.ok(columns);(columns.props.onClick as()=>void)();tree=render();assert.ok(nodes(tree).some(node=>node.props.dataKey==='primary'&&node.props.maxBarSize===28));
 event(tree,'Janela visual da série BI','7');tree=render();const chart=nodes(tree).find(node=>Array.isArray(node.props.data));assert.equal((chart?.props.data as {primary:number|null}[]).length,7);assert.ok((chart?.props.data as {primary:number|null}[]).some(p=>p.primary===null));
 assert.equal(nodes(tree).filter(node=>node.type==='tbody').flatMap(node=>React.Children.toArray(node.props.children as React.ReactNode)).length,20);
 const legend=nodes(tree).find(node=>node.props['aria-label']==='Mostrar Investimento · atual');assert.ok(legend);(legend.props.onClick as()=>void)();tree=render();assert.ok(nodes(tree).some(node=>node.props.dataKey==='primary'&&node.props.hide===true));assert.equal(JSON.stringify(selection),before);
});
test('campaign ranking cross-filters by platform, account and campaign and can be cleared',()=>{
 const f=harness<typeof import('../src/components/dashboard/marketing-bi-board')>('../src/components/dashboard/marketing-bi-board.tsx');const data=input();data.ads.push(fact({id:'second',ad_id:'second-ad',account_id:'456',spend:50}));const m=buildAnalyticsWorkspace(data),render=()=>f.render(()=>f.module.MarketingBIBoard({model:m}));let tree=render();const key=analyticsCampaignKey('meta_ads','456',data.ads[0].campaign_id);
 const ranking=nodes(tree).find(node=>typeof node.type==='function'&&node.type.name==='CampaignRanking');assert.ok(ranking);(ranking.props.onSelect as(key:string)=>void)(key);tree=render();assert.equal(nodes(tree).find(node=>node.props['aria-label']==='Campanha do BI')?.props.value,key);
 const trend=nodes(tree).filter(node=>typeof node.type==='function'&&node.type.name==='MarketingBITrend').at(-1);assert.equal((trend?.props.selection as {totals:{spend:number}}).totals.spend,50);
 const clear=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Limpar seleção');assert.ok(clear);(clear.props.onClick as()=>void)();tree=render();assert.equal(nodes(tree).find(node=>node.props['aria-label']==='Campanha do BI')?.props.value,'all');assert.equal(m.current.reduce((total,row)=>total+(row.spend??0),0),150);
});
