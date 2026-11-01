import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {PaidTotals} from '../src/lib/metrics/paid-metrics';
import {loadTypescript} from './helpers/load-typescript';

type DailyRow = {
 index:number; currentDate:string|null; previousDate:string|null;
 current:PaidTotals|null; previous:PaidTotals|null;
};
const observed=(spend:number):PaidTotals=>({
 spend,impressions:null,clicks:null,leads:null,ctr:null,cpc:null,cpm:null,cpl:null,
});
const row=(current:PaidTotals|null,previous:PaidTotals|null):DailyRow=>({
 index:1,currentDate:'2026-10-30',previousDate:'2026-10-29',current,previous,
});
const load=()=>loadTypescript<typeof import('../src/components/dashboard/analytics-charts')>(
 new URL('../src/components/dashboard/analytics-charts.tsx',import.meta.url),
 (id,native)=>native(id),
);
function html(rows:DailyRow[],comparing:boolean):string{
 const {AnalyticsTrend}=load();
 return renderToStaticMarkup(React.createElement(AnalyticsTrend,{
  rows,metric:'spend',currency:'BRL',comparing,
 }));
}

test('trend does not display an empty current plot using historical-only facts when comparison is off',()=>{
 const rows=[row(null,observed(45))],before=structuredClone(rows);
 const current=html(rows,false);
 assert.ok(current.includes('Sem medições diárias no recorte.'),current);
 assert.ok(!current.includes('analytics-trend'));
 const compared=html(rows,true);
 assert.ok(compared.includes('analytics-trend'),'historical measurements remain available when explicitly comparing');
 assert.ok(!compared.includes('Sem medições diárias'));
 assert.deepEqual(rows,before,'rendering must not edit the period observations');
});

test('observed current zero remains a measurement without requiring historical comparison',()=>{
 const rows=[row(observed(0),observed(45))],before=structuredClone(rows);
 const current=html(rows,false);
 assert.ok(current.includes('analytics-trend'));
 assert.ok(!current.includes('Sem medições diárias'));
 assert.deepEqual(rows,before);
});

test('invalid current and historical values never create a trend',()=>{
 for(const invalid of [NaN,Infinity,-Infinity,-1]){
  const rows=[row(observed(invalid),observed(invalid))],before=structuredClone(rows);
  const current=html(rows,false),compared=html(rows,true);
  assert.ok(current.includes('Sem medições diárias'),String(invalid));
  assert.ok(compared.includes('Sem medições diárias'),String(invalid));
  assert.ok(!current.includes('analytics-trend'),String(invalid));
  assert.deepEqual(rows,before);
 }
});

test('disabled comparison cannot label an unmatched current day with a historical date',()=>{
 const {AnalyticsTrend}=loadTypescript<typeof import('../src/components/dashboard/analytics-charts')>(
  new URL('../src/components/dashboard/analytics-charts.tsx',import.meta.url),
  (id,native)=>id==='react'?{...React,useState:(initial:unknown)=>[initial,()=>{}]}:native(id),
 );
 const rows=[
  {...row(observed(10),observed(20)),currentDate:'2026-10-01',previousDate:'2026-09-01'},
  {...row(null,observed(30)),index:2,currentDate:null,previousDate:'2026-09-02'},
 ];
 const before=structuredClone(rows);
 function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{
  if(!React.isValidElement(node))return [];
  const element=node as React.ReactElement<Record<string,unknown>>;
  return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];
 }
 const tick=(comparing:boolean)=>{
  const tree=AnalyticsTrend({rows,metric:'spend',currency:'BRL',comparing});
  const axis=nodes(tree).find(node=>node.props.dataKey==='index'&&typeof node.props.tickFormatter==='function');
  assert.ok(axis);
  return (axis.props.tickFormatter as (value:number)=>string)(2);
 };
 assert.equal(tick(false),'','hidden history cannot supply a date on the current-period axis');
 assert.equal(tick(true),'02/09','explicit comparison retains the known historical date');
 assert.deepEqual(rows,before);
});
