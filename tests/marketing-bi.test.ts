import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildAnalyticsWorkspace,analyticsCampaignKey} from '../src/lib/reports/analytics-workspace';
import {biAccountKey,selectMarketingBI,marketingDrivers,marketingTrendPoints} from '../src/lib/reports/marketing-bi';
import {input,fact} from './helpers/analytics-fixture';
import {loadTypescript} from './helpers/load-typescript';

const selected=()=>selectMarketingBI(buildAnalyticsWorkspace(input()),{platform:'all',account:'all',campaign:'all'});

test('BI account filtering uses canonical provider/account identity without mutating source totals or calendar',()=>{
 const data=input();data.ads.push(fact({id:'another',ad_id:'other-ad',account_id:'act_456',spend:50}));
 const model=buildAnalyticsWorkspace(data),result=selectMarketingBI(model,{platform:'meta_ads',account:biAccountKey('meta_ads','123'),campaign:'all'});
 assert.equal(result.totals.spend,100);assert.equal(result.priorTotals.spend,80);assert.equal(result.compatible,true);assert.equal(model.current.length,2);assert.equal(result.timeline.length,2);assert.equal(result.timeline[1].current,null);
 assert.notEqual(biAccountKey('google_ads','123'),biAccountKey('meta_ads','123'));
 assert.equal(biAccountKey('meta_ads','act_123'),biAccountKey('meta_ads','123'));
 assert.equal(selectMarketingBI(model,{platform:'all',account:biAccountKey('meta_ads','456'),campaign:'all'}).totals.spend,50);
 assert.equal(selectMarketingBI(model,{platform:'all',account:'missing',campaign:'all'}).totals.spend,null);
});

test('BI selection keeps campaign IDs scoped to account and provider',()=>{
 const data=input();data.ads.push(fact({id:'another',ad_id:'other-ad',account_id:'456',campaign_id:data.ads[0].campaign_id,spend:50}));
 const model=buildAnalyticsWorkspace(data),result=selectMarketingBI(model,{platform:'all',account:'all',campaign:analyticsCampaignKey('meta_ads','456',data.ads[0].campaign_id)});
 assert.equal(result.current.length,1);assert.equal(result.totals.spend,50);assert.equal(result.previous.length,0);assert.ok(result.timeline.every(row=>row.previous===null));
});

test('waterfall reconciles additive paired observations and explicitly excludes unmatched campaigns',()=>{
 const data=input();data.ads.push(fact({id:'new',ad_id:'new-ad',campaign_id:'new-campaign',spend:50}));
 const selection=selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'}),result=marketingDrivers(selection,'spend');
 assert.equal(result.available,true);assert.equal(result.start,80);assert.equal(result.end,100);assert.equal(result.excluded,1);assert.equal(result.rows.length,1);assert.equal(result.rows.reduce((sum,row)=>sum+row.change,0),result.end!-result.start!);assert.equal(result.rows[0].change,20);
 assert.throws(()=>marketingDrivers(selection,'cpl' as 'spend'));
});

test('waterfall preserves observed zero and suppresses unproven attributed lead comparisons',()=>{
 const data=input();data.ads[0].leads=0;
 let result=marketingDrivers(selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'}),'leads');
 assert.equal(result.end,0);assert.equal(result.rows[0].change,-10);
 data.priorAds[0].attribution_window='1d_click';
 result=marketingDrivers(selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'}),'leads');assert.equal(result.available,false);assert.equal(result.end,null);
});

test('BI does not invent previous measurements when comparison is disabled',()=>{
 const data=input();data.scope={...data.scope,compare:'none'};data.priorAds=[];data.priorBreakdowns=[];data.priorCrm=[];
 const result=marketingDrivers(selectMarketingBI(buildAnalyticsWorkspace(data),{platform:'all',account:'all',campaign:'all'}),'spend');assert.equal(result.available,false);assert.equal(result.start,null);assert.equal(result.rows.length,0);
});

test('BI waterfall rejects nonfinite aggregate reconciliation',()=>{
 const s=selected();s.current=[{...s.current[0],spend:Number.MAX_VALUE},{...s.current[0],accountId:'second',spend:Number.MAX_VALUE}];s.previous=[{...s.previous[0],spend:1},{...s.previous[0],accountId:'second',spend:1}];const r=marketingDrivers(s,'spend');assert.equal(r.available,false);assert.equal(r.end,null);
});

test('reference BI renders observed sources, account/campaign controls and no imported client branding or fabricated CRM',()=>{
 const {MarketingBIBoard}=loadTypescript<typeof import('../src/components/dashboard/marketing-bi-board')>(new URL('../src/components/dashboard/marketing-bi-board.tsx',import.meta.url),(id,native)=>native(id));
 const html=renderToStaticMarkup(React.createElement(MarketingBIBoard,{model:buildAnalyticsWorkspace(input())}));
 for(const text of ['Visão geral','Meta Ads','Google Ads','Comparativo','Ofensores','Conta do BI','Campanha do BI','Campanhas e resultados','Consolidado do recorte','CSV'])assert.ok(html.includes(text),text);
 for(const forbidden of ['RegisteredResources','Report/StaticResources','NaN','Infinity','Conectado ao RD','pessoas únicas convertidas'])assert.ok(!html.includes(forbidden),forbidden);
 assert.ok(!html.includes('<form'));assert.ok(html.includes('TikTok'));assert.ok(html.includes('2026-10-20 a 2026-10-21'));assert.ok(html.includes('· comparativo'),'historical series legend');
});

test('BI page navigation preserves canonical account/campaign scope for comparison and resets it for another provider',()=>{
 const data=input();data.ads.push(fact({id:'other-account',ad_id:'other-ad',account_id:'456',spend:50}));const model=buildAnalyticsWorkspace(data);const states:unknown[]=[];let cursor=0;
 const {MarketingBIBoard}=loadTypescript<typeof import('../src/components/dashboard/marketing-bi-board')>(new URL('../src/components/dashboard/marketing-bi-board.tsx',import.meta.url),(id,native)=>id==='react'?{...React,useMemo:(fn:()=>unknown)=>fn(),useState:(initial:unknown)=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],(next:unknown)=>{states[i]=typeof next==='function'?next(states[i]):next;}];}}:native(id));
 const render=()=>{cursor=0;return MarketingBIBoard({model});};
 function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{if(!React.isValidElement(node))return[];const element=node as React.ReactElement<Record<string,unknown>>;return[element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];}
 let tree=render();const click=(text:string)=>{const button=nodes(tree).find(el=>el.type==='button'&&el.props.children===text);assert.ok(button,text);(button.props.onClick as()=>void)();tree=render();};
 const choose=(name:string,value:string)=>{const select=nodes(tree).find(el=>el.props['aria-label']===name);assert.ok(select,name);(select.props.onChange as(e:unknown)=>void)({target:{value}});tree=render();};
 click('Meta Ads');choose('Conta do BI',biAccountKey('meta_ads','123'));choose('Campanha do BI',analyticsCampaignKey('meta_ads','123',data.ads[0].campaign_id));click('Comparativo');
 assert.equal(nodes(tree).find(el=>el.props['aria-label']==='Plataforma do BI')?.props.value,'meta_ads');assert.equal(nodes(tree).find(el=>el.props['aria-label']==='Conta do BI')?.props.value,biAccountKey('meta_ads','123'));
 const snapshot=nodes(tree).find(el=>typeof el.type==='function'&&el.type.name==='PeriodSnapshot');assert.equal((snapshot?.props.totals as {spend:number}).spend,100);
 click('Google Ads');assert.equal(nodes(tree).find(el=>el.props['aria-label']==='Conta do BI')?.props.value,'all');assert.equal(nodes(tree).find(el=>el.props['aria-label']==='Campanha do BI')?.props.value,'all');
});

test('BI trend compares calendar positions, keeps missing values null and preserves observed zero',()=>{
 const points=marketingTrendPoints(selected(),'spend','clicks');
 assert.deepEqual(points.map(p=>[p.currentDate,p.previousDate,p.primary,p.previous,p.secondary]),[
  ['2026-10-20','2026-10-18',100,80,20],
  ['2026-10-21','2026-10-19',null,null,null],
 ]);
 const zero=input();zero.ads[0].spend=0;zero.priorAds[0].spend=0;
 const zeroSeries=marketingTrendPoints(selectMarketingBI(buildAnalyticsWorkspace(zero),{platform:'all',account:'all',campaign:'all'}),'spend');
 assert.equal(zeroSeries[0].primary,0);assert.equal(zeroSeries[0].previous,0);
 const previousOnly=input();previousOnly.ads=[];previousOnly.breakdowns=[];
 const priorSeries=marketingTrendPoints(selectMarketingBI(buildAnalyticsWorkspace(previousOnly),{platform:'all',account:'all',campaign:'all'}),'spend');
 assert.equal(priorSeries[0].primary,null);assert.equal(priorSeries[0].previous,80);
 const none=input();none.scope={...none.scope,compare:'none'};none.priorAds=[];none.priorBreakdowns=[];none.priorCrm=[];
 const noComparison=marketingTrendPoints(selectMarketingBI(buildAnalyticsWorkspace(none),{platform:'all',account:'all',campaign:'all'}),'spend');
 assert.ok(noComparison.every(p=>p.previous===null&&p.previousDate===null));
});
