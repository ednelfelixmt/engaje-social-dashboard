import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {breakdownBarWidth, type BreakdownPoint} from '../src/lib/reports/audience-report';

const {MetricBreakdownCard}=loadTypescript<{MetricBreakdownCard:React.ComponentType<{title:string;rows:BreakdownPoint[];currency:string}>}>(
 new URL('../src/components/dashboard/metric-breakdown-card.tsx',import.meta.url),
 (id,native)=>native(id),
);
const point=(label:string,impressions:number|null):BreakdownPoint=>({label,spend:0,impressions,clicks:0,leads:0});

test('subunit rates and costs scale to the largest actual observation rather than a fictitious floor of one',()=>{
 assert.equal(breakdownBarWidth(0.25,0.25),100);
 assert.equal(breakdownBarWidth(0.125,0.25),50);
 assert.equal(breakdownBarWidth(0,0.25),0);
 assert.equal(breakdownBarWidth(0.0002,0.0004),50);
});

test('all-zero measurements and missing or invalid observations never produce NaN or Infinity widths',()=>{
 for(const value of [0,null,Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,-1]) {
  assert.equal(breakdownBarWidth(value,0),0);
 }
 assert.equal(breakdownBarWidth(0,Number.NaN),0);
 assert.equal(breakdownBarWidth(1,Number.POSITIVE_INFINITY),0);
 assert.equal(breakdownBarWidth(100,50),100,'width is clamped at 100 percent');
 assert.equal(breakdownBarWidth(Number.MAX_VALUE,Number.MAX_VALUE),100);
});

test('visual bars reflect the actual maximum and preserve zero without mutating source rows',()=>{
 const rows=[point('Maior',100),point('Metade',50),point('Zero observado',0)];
 const before=structuredClone(rows);
 const html=renderToStaticMarkup(React.createElement(MetricBreakdownCard,{title:'Sintético',rows,currency:'BRL'}));
 assert.match(html, /width:100%/);
 assert.match(html, /width:50%/);
 assert.match(html, /width:0%/);
 assert.ok(html.includes('Zero observado'));
 assert.doesNotMatch(html, /width:(?:NaN|Infinity|-Infinity)%/);
 assert.deepEqual(rows,before);
});

test('all observed zero in the rendered breakdown produces zero-width bars without invalid percentages',()=>{
 const html=renderToStaticMarkup(React.createElement(MetricBreakdownCard,{title:'Sintético',rows:[point('Zero A',0),point('Zero B',0)],currency:'BRL'}));
 assert.equal((html.match(/width:0%/g)??[]).length,2);
 assert.doesNotMatch(html, /width:(?:NaN|Infinity|-Infinity)%/);
});
