import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {BreakdownPoint} from '../src/lib/reports/audience-report';

const {MetricBreakdownCard}=loadTypescript<{MetricBreakdownCard:React.ComponentType<{title:string;rows:BreakdownPoint[];currency:string}>}>(
 new URL('../src/components/dashboard/metric-breakdown-card.tsx',import.meta.url),
 (id,native)=>native(id),
);
const point=(label:string,impressions:number|null):BreakdownPoint=>({label,spend:0,impressions,clicks:0,leads:0});
const render=(rows:BreakdownPoint[])=>renderToStaticMarkup(React.createElement(MetricBreakdownCard,{title:'Localidades sintéticas',rows,currency:'BRL'}));

test('audience ranking explicitly discloses twelve displayed groups out of more valid groups',()=>{
 const rows=Array.from({length:13},(_,index)=>point('Grupo '+(index+1),index+1));
 const original=structuredClone(rows);
 const html=render(rows);
 assert.ok(html.includes('13 de 13 grupos recebidos com valor válido'));
 assert.ok(html.includes('Exibindo os 12 maiores valores entre 13 grupos válidos'));
 assert.ok(html.includes('Grupos válidos não exibidos nas barras: 1'));
 assert.ok(html.includes('Grupo 13'));
 assert.ok(!html.includes('>Grupo 1</span>'));
 assert.deepEqual(rows,original,'rendering must not mutate source observations');
});

test('the disclaimer is absent for twelve or fewer valid groups; observed zero remains visible',()=>{
 const rows=[point('Zero observado',0),point('Outro grupo',12),point('Inválido',Number.POSITIVE_INFINITY),point('Ausente',null)];
 const original=structuredClone(rows);
 const html=render(rows);
 assert.ok(html.includes('2 de 4 grupos recebidos com valor válido'));
 assert.ok(html.includes('Zero observado'));
 assert.ok(html.includes('Outro grupo'));
 assert.ok(!html.includes('Exibindo os'));
 assert.ok(!html.includes('>Inválido</span>'));
 assert.ok(!html.includes('>Ausente</span>'));
 assert.deepEqual(rows,original);
});

test('exactly twelve valid groups have no truncation disclaimer',()=>{
 const html=render(Array.from({length:12},(_,index)=>point('Grupo '+(index+1),index)));
 assert.ok(html.includes('12 de 12 grupos recebidos com valor válido'));
 assert.ok(!html.includes('Exibindo os'));
});
