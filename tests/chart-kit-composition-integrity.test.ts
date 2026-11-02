import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadTypescript} from './helpers/load-typescript';

function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{
 if(!React.isValidElement(node))return [];
 const element=node as React.ReactElement<Record<string,unknown>>;
 return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];
}
const flow=()=>loadTypescript<typeof import('../src/components/charts/flow-charts')>(new URL('../src/components/charts/flow-charts.tsx',import.meta.url),(id,native)=>native(id));
const budget=()=>loadTypescript<typeof import('../src/components/dashboard/analytics-chart-library')>(new URL('../src/components/dashboard/analytics-chart-library.tsx',import.meta.url),(id,native)=>id==='react'?{...React,useMemo:(fn:()=>unknown)=>fn(),useState:(initial:unknown)=>[initial,()=>{}]}:native(id));
const campaign=(i:number,spend=10)=>({id:'synthetic-'+i,name:'Campanha sintética '+i,platform:'meta_ads',spend,leads:null,clicks:null,impressions:null});

test('standalone funnel initializes its own chart theme without requiring a frame',()=>{
 const tree=flow().FunnelBarsChart({stages:[{id:'seen',label:'Impressões',value:100},{id:'clicked',label:'Cliques',value:10}],ariaLabel:'Funil sintético'});
 assert.ok(String(tree.props.className).split(/\s+/).includes('chart-kit'),'standalone caller must receive the theme variables');
 assert.equal(nodes(tree).filter(n=>n.type==='li').length,2);
});

test('budget treemap conserves the whole portfolio and matches table shares beyond twelve campaigns',()=>{
 const rows=Array.from({length:20},(_,i)=>campaign(i));const before=structuredClone(rows);
 const tree=budget().BudgetTreemap({rows,currency:'BRL'});
 const chart=nodes(tree).find(n=>typeof n.type==='function'&&n.type.name==='TreemapChart');assert.ok(chart);
 const items=chart.props.items as {id:string;value:number}[];
 assert.equal(items.reduce((sum,item)=>sum+item.value,0),200,'omitted campaigns remain in the denominator and visible composition');
 const rendered=flow().TreemapChart(chart.props as Parameters<ReturnType<typeof flow>['TreemapChart']>[0]);
 const primitive=nodes(rendered).find(n=>Array.isArray(n.props.data));assert.ok(primitive);
 const plotted=primitive.props.data as {id:string;share:string;amount:number}[];
 const first=plotted.find(item=>item.id==='synthetic-0');assert.ok(first);assert.equal(first.share,'5%');
 const remainder=plotted.find(item=>item.amount===80);assert.ok(remainder);assert.equal(remainder.share,'40%');
 const frame=nodes(tree).find(n=>typeof n.type==='function'&&n.type.name==='ChartFrame');assert.ok(frame);
 const table=frame.props.table as {rows:string[][]};assert.ok(table.rows.some(row=>row[0]==='Campanha sintética 0'&&row[2]==='5%'));
 assert.deepEqual(rows,before);
});

test('budget rejects invalid or overflowing spend without a partial treemap',()=>{
 for(const rows of [[campaign(0,10),campaign(1,NaN)],[campaign(0,10),campaign(1,Infinity)],[campaign(0,10),campaign(1,-1)],[campaign(0,1e308),campaign(1,1e308)]]){
  const tree=budget().BudgetTreemap({rows,currency:'BRL'});
  assert.ok(!nodes(tree).some(n=>typeof n.type==='function'&&n.type.name==='TreemapChart'),'invalid portfolio cannot expose partial shares');
 }
});

test('funnel bar lengths preserve observed zeros and tiny positive proportions',()=>{
 const tree=flow().FunnelBarsChart({stages:[{id:'all',label:'Eventos',value:1000},{id:'zero',label:'Zero observado',value:0},{id:'small',label:'Pequeno valor observado',value:0.5}],ariaLabel:'Proporções sintéticas'});
 const bars=nodes(tree).filter(n=>n.type==='i');
 assert.deepEqual(bars.map(n=>(n.props.style as {width:string}).width),['100%','0%','0.05%']);
});
