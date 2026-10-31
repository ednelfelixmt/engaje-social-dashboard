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
