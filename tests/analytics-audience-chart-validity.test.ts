import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';

type AudienceRow={value:string;label:string;current:number|null;previous:number|null};
const load=()=>loadTypescript<typeof import('../src/components/dashboard/analytics-charts')>(
  new URL('../src/components/dashboard/analytics-charts.tsx',import.meta.url),
  (id,native)=>native(id),
);
function plottedRows(node:React.ReactNode):AudienceRow[]|null {
  if (!React.isValidElement(node)) return null;
  const props=node.props as {layout?:string;data?:AudienceRow[];children?:React.ReactNode};
  if (props.layout==='vertical'&&Array.isArray(props.data)) return props.data;
  for (const child of React.Children.toArray(props.children)) {
    const found=plottedRows(child);
    if (found) return found;
  }
  return null;
}
const make=(rows:AudienceRow[],comparing:boolean)=>load().AnalyticsAudienceChart({
  rows,color:'#64a5ff',currency:'BRL',metric:'impressions',comparing,onSelect:()=>{},
});

test('audience chart hides historical-only categories without comparison and preserves observed zero',()=>{
  const rows:AudienceRow[]=[
    {value:'past',label:'Apenas histórico',current:null,previous:40},
    {value:'zero',label:'Zero observado',current:0,previous:8},
  ];
  const before=structuredClone(rows);
  const current=plottedRows(make(rows,false));
  assert.ok(current);
  assert.deepEqual(current.map(row=>[row.value,row.current,row.previous]),[['zero',0,null]]);
  const empty=renderToStaticMarkup(make([rows[0]],false));
  assert.ok(empty.includes('Nenhum valor válido recebido'));
  assert.ok(!empty.includes('analytics-audience-chart'));
  assert.deepEqual(rows,before,'projection must not rewrite source observations');
});

test('audience chart rejects negative, missing and non-finite coordinates while allowing previous-only comparisons',()=>{
  const rows:AudienceRow[]=[
    {value:'invalid',label:'Inválido',current:NaN,previous:Infinity},
    {value:'negative',label:'Negativo',current:-5,previous:-1},
    {value:'past',label:'Apenas comparativo',current:null,previous:3},
    {value:'zero',label:'Zero observado',current:0,previous:0},
    {value:'current',label:'Atual',current:20,previous:25},
    {value:'bad-prior',label:'Sem histórico válido',current:5,previous:NaN},
  ];
  const before=rows.map(row=>({...row}));
  const shown=plottedRows(make(rows,true));
  assert.ok(shown);
  assert.deepEqual(shown.map(row=>row.value),['current','bad-prior','zero','past']);
  assert.deepEqual(shown.find(row=>row.value==='bad-prior')?.previous,null);
  assert.deepEqual(shown.find(row=>row.value==='past')?.current,null);
  assert.ok(shown.every(row=>[row.current,row.previous].every(value=>value===null||(Number.isFinite(value)&&value>=0))));
  assert.deepEqual(rows,before,'no measurement is mutated');
  const unavailable=renderToStaticMarkup(make(rows.slice(0,2),true));
  assert.ok(unavailable.includes('Nenhum valor válido recebido'));
});
