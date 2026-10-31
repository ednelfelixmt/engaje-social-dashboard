import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fact} from './helpers/analytics-fixture';
import {buildAgencyIntelligence,selectAgencyIntelligence} from '../src/lib/reports/agency-intelligence';
import {changeBreakdown,metricSparkline} from '../src/lib/reports/agency-insights';
import {KpiSparkline} from '../src/components/agency/kpi-sparkline';
import {AgencyChangeBreakdown} from '../src/components/agency/agency-change-breakdown';

const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
const client=(id:string,name:string)=>({id,name,slug:'s-'+id.slice(0,1),currency:'BRL',timezone:'America/Cuiaba'});
const row=(changes:Parameters<typeof fact>[0])=>fact({impressions:1000,clicks:20,leads:2,...changes});
function select(current:ReturnType<typeof row>[],previous:ReturnType<typeof row>[],granularity:'day'|'week'='day'){
 const model=buildAgencyIntelligence({clients:[client(a,'Aurora'),client(b,'Horizonte'),client(c,'Cais')],current,previous,from:'2026-10-01',to:'2026-10-05',compare:'previous_period'});
 return selectAgencyIntelligence(model,{clientIds:[a,b,c],currency:'BRL',platform:'all',granularity});
}

test('a miniatura mantém lacunas como ausência, nunca como zero',()=>{
 const selection=select([row({id:'1',organization_id:a,metric_date:'2026-10-01',spend:10}),row({id:'2',organization_id:a,metric_date:'2026-10-04',spend:30})],[]);
 const series=metricSparkline(selection,'spend');
 assert.equal(series.length,5);
 assert.deepEqual(series.map(value=>value===null?'—':value),[10,'—','—',30,'—']);
});

test('KpiSparkline quebra a linha nas lacunas, desenha ponto isolado e fica vazio sem pelo menos duas observações',()=>{
 const gaps=renderToStaticMarkup(React.createElement(KpiSparkline,{values:[1,2,null,5,null,3,4]}));
 assert.equal((gaps.match(/<path /g)??[]).length,3,'três trechos: dois pontos, um ponto isolado, dois pontos');
 assert.equal((gaps.match(/data-dot/g)??[]).length,1,'a observação isolada vira um ponto');
 assert.ok(!gaps.includes('NaN'));
 for(const values of [[],[null,null],[7],[null,7,null]]){
  const html=renderToStaticMarkup(React.createElement(KpiSparkline,{values}));
  assert.ok(html.includes('data-empty'),JSON.stringify(values));assert.ok(!html.includes('<path'));
 }
 const flat=renderToStaticMarkup(React.createElement(KpiSparkline,{values:[4,4,4]}));
 assert.ok(!flat.includes('NaN')&&flat.includes('<path'),'série constante não divide por zero');
});

test('changeBreakdown lista só quem tem valor nos dois períodos e conta os excluídos',()=>{
 const selection=select(
  [row({id:'1',organization_id:a,metric_date:'2026-10-02',spend:150,leads:3}),row({id:'2',organization_id:b,metric_date:'2026-10-02',spend:40,leads:4}),row({id:'3',organization_id:c,metric_date:'2026-10-02',spend:70,leads:5})],
  [row({id:'p1',organization_id:a,metric_date:'2026-09-27',spend:100,leads:3}),row({id:'p2',organization_id:b,metric_date:'2026-09-27',spend:80,leads:4})]);
 const spend=changeBreakdown(selection.clients,'spend');
 assert.deepEqual(spend.rows.map(item=>[item.id,item.change]),[[b,-40],[a,50]].sort((x,y)=>Math.abs(y[1] as number)-Math.abs(x[1] as number)));
 assert.equal(spend.excluded,1,'Cais só tem dado no período atual');
 assert.ok(spend.rows.every(item=>item.good===null),'investimento é neutro: gastar mais não é bom nem ruim');
 const cpl=changeBreakdown(selection.clients,'cpl');
 const horizon=cpl.rows.find(item=>item.id===b)!;
 assert.ok(horizon.change<0&&horizon.good===true,'CPL menor é melhor');
});

test('leads e CPL ficam de fora quando a atribuição histórica não é comparável',()=>{
 const selection=select([row({id:'1',organization_id:a,metric_date:'2026-10-02',spend:100,leads:3})],[row({id:'p1',organization_id:a,metric_date:'2026-09-27',spend:80,leads:2,attribution_window:'1d_click'})]);
 assert.equal(changeBreakdown(selection.clients,'leads').rows.length,0);
 assert.equal(changeBreakdown(selection.clients,'leads').excluded,1);
 assert.equal(changeBreakdown(selection.clients,'spend').rows.length,1,'o investimento continua comparável');
});

test('o painel O que mudou usa cor só onde há semântica e nunca esconde cliente excluído',()=>{
 const selection=select(
  [row({id:'1',organization_id:a,metric_date:'2026-10-02',spend:150,leads:3}),row({id:'2',organization_id:b,metric_date:'2026-10-02',spend:40,leads:4}),row({id:'3',organization_id:c,metric_date:'2026-10-02',spend:70,leads:5})],
  [row({id:'p1',organization_id:a,metric_date:'2026-09-27',spend:100,leads:3}),row({id:'p2',organization_id:b,metric_date:'2026-09-27',spend:80,leads:4})]);
 const names=new Map([[a,'Aurora'],[b,'Horizonte'],[c,'Cais']]);
 const render=(metric:'spend'|'cpl')=>renderToStaticMarkup(React.createElement(AgencyChangeBreakdown,{breakdown:changeBreakdown(selection.clients,metric),names,metric,currency:'BRL',onSelect:()=>undefined}));
 const spend=render('spend');
 assert.ok(!spend.includes('data-tone="good"')&&!spend.includes('data-tone="bad"'),'investimento permanece neutro');
 assert.ok(spend.includes('Aurora')&&spend.includes('Horizonte'));
 assert.ok(spend.includes('1 cliente ficou de fora'),'o cliente sem base aparece como exclusão explícita');
 assert.ok(render('cpl').includes('data-tone="good"'),'CPL caiu: semântica verde');
 const empty=renderToStaticMarkup(React.createElement(AgencyChangeBreakdown,{breakdown:{rows:[],excluded:0},names,metric:'spend',currency:'BRL',onSelect:()=>undefined}));
 assert.ok(empty.includes('Sem clientes com valor válido'));
});
