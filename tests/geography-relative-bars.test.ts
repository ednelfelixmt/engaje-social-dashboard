import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {BreakdownPoint} from '../src/lib/reports/audience-report';

type RegionProps={states:BreakdownPoint[];cities:BreakdownPoint[];currency:string};
type RegionComponent=React.ComponentType<RegionProps>;
const point=(label:string,spend:number|null):BreakdownPoint=>({label,spend,impressions:0,clicks:0,leads:0});

/** Select only the view state; never request live tenant data or credentials. */
function renderRegion(states:BreakdownPoint[],cities:BreakdownPoint[]=[],group:'state'|'city'='state'){
 let hook=0;
 const {RegionPerformance}=loadTypescript<{RegionPerformance:RegionComponent}>(
  new URL('../src/components/dashboard/geography-cross-analysis.tsx',import.meta.url),
  (id,native)=>id==='react'
   ? {...React,useState:()=>[['Investimento',group][hook++],()=>{}]}
   : native(id),
 );
 return renderToStaticMarkup(React.createElement(RegionPerformance,{states,cities,currency:'BRL'}));
}

test('regional investment fractions use the largest observed value, not a floor of one',()=>{
 const rows=[point('Maior',0.25),point('Metade',0.125),point('Zero observado',0)];
 const before=structuredClone(rows);
 const html=renderRegion(rows);
 assert.match(html,/width:100%/);
 assert.match(html,/width:50%/);
 assert.match(html,/width:0%/);
 assert.ok(html.includes('3 de 3 grupos recebidos com valor válido para investimento'));
 assert.ok(html.includes('Zero observado'));
 assert.doesNotMatch(html,/width:(?:NaN|Infinity|-Infinity)%/);
 assert.deepEqual(rows,before,'visual projection must not alter its inputs');
});

test('all observed zero stays zero, while missing, negative and infinite spend are excluded',()=>{
 const states=[point('Zero A',0),point('Zero B',0),point('Ausente',null),point('Negativo',-1),point('Infinito',Infinity)];
 const before=structuredClone(states);
 const html=renderRegion(states);
 assert.equal((html.match(/width:0%/g)??[]).length,2);
 assert.ok(html.includes('2 de 5 grupos recebidos com valor válido para investimento'));
 assert.ok(html.includes('Recorte parcial'));
 assert.ok(!html.includes('>Ausente<'));
 assert.ok(!html.includes('>Negativo<'));
 assert.ok(!html.includes('>Infinito<'));
 assert.doesNotMatch(html,/width:(?:NaN|Infinity|-Infinity)%/);
 assert.deepEqual(states,before);
});

test('city selection uses its own actual maximum and leaves state observations intact',()=>{
 const states=[point('Estado fora da seleção',999)];
 const cities=[point('Cidade maior',0.4),point('Cidade metade',0.2)];
 const original={states:structuredClone(states),cities:structuredClone(cities)};
 const html=renderRegion(states,cities,'city');
 assert.match(html,/width:100%/);
 assert.match(html,/width:50%/);
 assert.ok(html.includes('Cidade maior'));
 assert.ok(html.includes('Cidade metade'));
 assert.ok(!html.includes('Estado fora da seleção'));
 assert.deepEqual({states,cities},original);
});
