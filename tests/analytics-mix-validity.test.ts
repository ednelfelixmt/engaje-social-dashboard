import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';

type MixRow = {platform:string;spend:number|null;records:number};
const row = (platform:string,spend:number|null):MixRow => ({platform,spend,records:1});
const load = () => loadTypescript<typeof import('../src/components/dashboard/analytics-charts')>(
  new URL('../src/components/dashboard/analytics-charts.tsx',import.meta.url),
  (id,native) => native(id),
);
function nodes(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[] {
  if (!React.isValidElement(node)) return [];
  const element=node as React.ReactElement<Record<string,unknown>>;
  return [element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];
}

test('platform mix rejects negative or non-finite source spend without inventing percentages',()=>{
  const {AnalyticsMix}=load();
  for (const invalid of [-1,Number.NaN,Infinity,-Infinity]) {
    const rows=[row('meta_ads',100),row('google_ads',invalid)];
    const original=[...rows];
    const tree=AnalyticsMix({rows,currency:'BRL',onSelect:()=>assert.fail('no selection')});
    const html=renderToStaticMarkup(tree);
    assert.ok(html.includes('Mix indisponível: sem investimento válido completo.'),String(invalid));
    assert.ok(!html.includes('analytics-donut'),String(invalid));
    assert.deepEqual(rows,original,'invalid observation is not silently rewritten as zero');
  }
  const missing=renderToStaticMarkup(AnalyticsMix({rows:[row('meta_ads',null)],currency:'BRL',onSelect:()=>{}}));
  assert.ok(missing.includes('Mix indisponível'));
});

test('platform mix rejects finite inputs whose aggregate overflows',()=>{
  const {AnalyticsMix}=load();
  const rows=[row('meta_ads',Number.MAX_VALUE),row('google_ads',Number.MAX_VALUE)];
  const html=renderToStaticMarkup(AnalyticsMix({rows,currency:'BRL',onSelect:()=>{}}));
  assert.ok(html.includes('Mix indisponível'));
  assert.ok(!html.includes('Infinity'));
});

test('platform mix preserves measured zero and valid positive shares and read-only selection',()=>{
  const {AnalyticsMix}=load();
  const zero=renderToStaticMarkup(AnalyticsMix({rows:[row('meta_ads',0),row('google_ads',0)],currency:'BRL',onSelect:()=>{}}));
  assert.ok(zero.includes('Investimento zero informado pelas fontes'));
  assert.ok(!zero.includes('Mix indisponível'));

  const rows=[row('meta_ads',0),row('google_ads',80),row('tiktok_ads',20)];
  const before=JSON.stringify(rows),selected:string[]=[];
  const tree=AnalyticsMix({rows,currency:'BRL',onSelect:platform=>selected.push(platform)});
  const pie=nodes(tree).find(node=>node.props.dataKey==='spend');
  assert.ok(pie,'valid observations must keep the doughnut chart');
  const visible=pie.props.data as MixRow[];
  assert.deepEqual(visible.map(x=>[x.platform,x.spend]),[['google_ads',80],['tiktok_ads',20]]);
  const buttons=nodes(tree).filter(node=>node.type==='button');
  assert.equal(buttons.length,2);
  (buttons[0].props.onClick as ()=>void)();
  assert.deepEqual(selected,['google_ads']);
  assert.equal(JSON.stringify(rows),before,'filtering is read-only and does not mutate observations');
  const html=renderToStaticMarkup(tree);
  assert.ok(html.includes('80%'));
  assert.ok(html.includes('20%'));
});
