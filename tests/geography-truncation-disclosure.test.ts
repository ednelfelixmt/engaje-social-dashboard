import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {BreakdownPoint} from '../src/lib/reports/audience-report';

type RegionProps={states:BreakdownPoint[];cities:BreakdownPoint[];currency:string};
const point=(label:string,spend:number|null):BreakdownPoint=>({label,spend,impressions:0,clicks:0,leads:0});

/** Render only synthetic, selected view state; never access Auth, tenant data or APIs. */
function renderRegion(states:BreakdownPoint[],cities:BreakdownPoint[]=[],group:'state'|'city'='state'){
 let hook=0;
 const {RegionPerformance}=loadTypescript<{RegionPerformance:React.ComponentType<RegionProps>}>(
  new URL('../src/components/dashboard/geography-cross-analysis.tsx',import.meta.url),
  (id,native)=>id==='react'
   ? {...React,useState:()=>[['Investimento',group][hook++],()=>{}]}
   : native(id),
 );
 return renderToStaticMarkup(React.createElement(RegionPerformance,{states,cities,currency:'BRL'}));
}

test('geography discloses precisely how many valid groups the top twelve omit',()=>{
 const states=Array.from({length:14},(_,i)=>point('Estado '+(i+1),i+1));
 const before=structuredClone(states);
 const html=renderRegion(states);
 assert.ok(html.includes('14 de 14 grupos recebidos com valor válido para investimento'));
 assert.ok(html.includes('Exibindo os 12 maiores valores entre 14 grupos válidos'));
 assert.ok(html.includes('Grupos válidos não exibidos nas barras: 2'));
 assert.match(html,/role="status"/);
 assert.ok(html.includes('Estado 14'));
 assert.ok(!html.includes('>Estado 1</span>'));
 assert.ok(!html.includes('>Estado 2</span>'));
 assert.deepEqual(states,before,'the disclosure must not mutate measurements');
});

test('exactly twelve valid groups show no top-twelve warning; missing is distinct from zero',()=>{
 const states=[...Array.from({length:11},(_,i)=>point('Estado '+(i+1),i+1)),point('Zero observado',0),point('Sem medição',null)];
 const before=structuredClone(states);
 const html=renderRegion(states);
 assert.ok(html.includes('12 de 13 grupos recebidos com valor válido para investimento'));
 assert.ok(html.includes('Recorte parcial'));
 assert.ok(html.includes('Zero observado'));
 assert.match(html,/width:0%/);
 assert.ok(!html.includes('Grupos válidos não exibidos nas barras:'));
 assert.ok(!html.includes('>Sem medição</span>'));
 assert.deepEqual(states,before);
});

test('city selection counts only omitted valid city groups, never unrelated state groups',()=>{
 const states=Array.from({length:20},(_,i)=>point('Estado '+(i+1),i+1));
 const cities=Array.from({length:13},(_,i)=>point('Cidade '+(i+1),i+1));
 const original={states:structuredClone(states),cities:structuredClone(cities)};
 const html=renderRegion(states,cities,'city');
 assert.ok(html.includes('13 de 13 grupos recebidos com valor válido para investimento'));
 assert.ok(html.includes('Grupos válidos não exibidos nas barras: 1'));
 assert.ok(html.includes('Cidade 13'));
 assert.ok(!html.includes('>Cidade 1</span>'));
 assert.ok(!html.includes('>Estado 20</span>'));
 assert.deepEqual({states,cities},original);
});
