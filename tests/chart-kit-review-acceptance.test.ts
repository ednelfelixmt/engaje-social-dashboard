import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {formatAxisValue} from '../src/lib/charts/format';
import {loadTypescript} from './helpers/load-typescript';

function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{
 if(!React.isValidElement(node))return [];
 const element=node as React.ReactElement<Record<string,unknown>>;
 return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];
}

test('chart money axes preserve the selected currency instead of labeling every amount BRL',()=>{
 const usd=formatAxisValue({kind:'money',currency:'USD'},1500,1500);
 const eur=formatAxisValue({kind:'money',currency:'EUR'},1500,1500);
 const brl=formatAxisValue({kind:'money',currency:'BRL'},1500,1500);
 assert.ok(usd.includes('US$'),usd);
 assert.ok(eur.includes('€'),eur);
 assert.ok(brl.includes('R$'),brl);
});

test('an isolated historical observation remains visible when comparison is enabled',()=>{
 const {TimeSeriesChart}=loadTypescript<typeof import('../src/components/charts/time-series-chart')>(
  new URL('../src/components/charts/time-series-chart.tsx',import.meta.url),
  (id,native)=>id==='react'?{...React,useId:()=> 'synthetic-chart'}:native(id),
 );
 const tree=TimeSeriesChart({points:[{label:'01/10',current:null,previous:12}],format:{kind:'count'},mode:'line',compare:true,ariaLabel:'Prova sintética'});
 const previous=nodes(tree).find(node=>node.props.dataKey==='previous');
 assert.ok(previous,'comparison series exists');
 assert.notEqual(previous.props.dot,false,'one previous point cannot form a line and needs a visible marker');
 if(typeof previous.props.dot==='function'){
  const marker=previous.props.dot({cx:15,cy:25,index:0}) as React.ReactElement;
  assert.equal(marker.type,'circle','isolated previous measurement draws a marker');
 }
});
