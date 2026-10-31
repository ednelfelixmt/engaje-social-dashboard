import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {summarizeClientAds} from '../src/lib/metrics/agency-overview';
import {agencyPortfolioChart,selectAgencyClients,type AgencyClientCard} from '../src/lib/reports/agency-portfolio';
import {loadTypescript} from './helpers/load-typescript';

const orgA='11111111-1111-4111-8111-111111111111',orgB='22222222-2222-4222-8222-222222222222';
function client(overrides:Partial<AgencyClientCard>={}):AgencyClientCard {
  return {id:orgA,name:'Estúdio Aurora (sintético)',slug:'aurora-sintetica',currency:'BRL',hasData:true,connected:true,lastSync:null,logoUrl:null,
    summary:summarizeClientAds(orgA,'BRL',[{organization_id:orgA,currency:'BRL',spend:100,impressions:1000,reach:800,clicks:10,leads:5}]),...overrides};
}

test('agency chart preserves observed zero, excludes missing facts and never fabricates volume or mutates clients',()=>{
  const a=client(),zero=client({id:orgB,name:'Zero sintético',summary:{...a.summary,spend:0,leads:0}});
  const missing=client({name:'Sem dados',hasData:false,summary:summarizeClientAds(orgB,'BRL',[])});
  const input=[a,zero,missing],before=structuredClone(input),result=agencyPortfolioChart(input,'spend');
  assert.equal(result.rows.length,2);assert.equal(result.rows[0].width,100);assert.equal(result.rows[1].value,0);assert.equal(result.rows[1].width,0);assert.equal(result.excluded,1);assert.deepEqual(input,before);
});

test('agency chart never places different currencies on a shared monetary scale',()=>{
  const a=client(),usd=client({id:orgB,currency:'USD',summary:{...a.summary,currency:'USD',spend:20}});
  assert.equal(agencyPortfolioChart([a,usd],'spend').mixedCurrency,true);
  assert.equal(agencyPortfolioChart([a,usd],'spend').rows.length,0);
  assert.equal(agencyPortfolioChart([a,usd],'leads').rows.length,2);
  const invalid=client({summary:{...a.summary,currency:null}});
  assert.equal(agencyPortfolioChart([invalid],'spend').rows.length,0);
});

test('agency chart limits only presentation and search/status filters keep no-data clients navigable',()=>{
  const list=Array.from({length:10},(_,i)=>client({id:String(i),name:'Cliente sintético '+i,connected:i%2===0,hasData:i!==9}));
  const result=agencyPortfolioChart(list,'leads');assert.equal(result.rows.length,8);assert.equal(result.totalObserved,9);assert.equal(list.length,10);
  assert.equal(selectAgencyClients(list,' SINTÉTICO 9 ','no_data').length,1);
  assert.equal(selectAgencyClients(list,'','connected').length,5);assert.equal(selectAgencyClients(list,'','attention').length,5);
});


test('agency portfolio fractional BRL spends use the actual largest observed amount',()=>{
  const a=client(),input=[
    client({name:'A: R$ 0,25',summary:{...a.summary,spend:0.25}}),
    client({id:orgB,name:'B: R$ 0,125',summary:{...a.summary,spend:0.125}}),
  ];
  const before=structuredClone(input);
  const result=agencyPortfolioChart(input,'spend');
  assert.deepEqual(result.rows.map(row=>row.width),[100,50]);
  assert.deepEqual(result.rows.map(row=>row.value),[0.25,0.125]);
  assert.equal(result.currency,'BRL');assert.equal(result.excluded,0);
  assert.deepEqual(input,before,'visual scaling must never mutate tenant observations');
});

test('agency portfolio all observed zero spends do not divide by zero or invent bars',()=>{
  const a=client(),input=[
    client({name:'A: zero observado',summary:{...a.summary,spend:0}}),
    client({id:orgB,name:'B: zero observado',summary:{...a.summary,spend:0}}),
  ];
  const result=agencyPortfolioChart(input,'spend');
  assert.equal(result.totalObserved,2);assert.equal(result.excluded,0);
  assert.deepEqual(result.rows.map(row=>row.width),[0,0]);
  assert.ok(result.rows.every(row=>Number.isFinite(row.width)));
});

test('agency portfolio ignores missing, negative and non-finite amounts without hiding a fractional observation',()=>{
  const a=client(),input=[
    client({name:'A: fração válida',summary:{...a.summary,spend:0.0001}}),
    client({id:orgB,name:'B: indisponível',summary:{...a.summary,spend:null}}),
    client({id:'synthetic-negative',name:'C: inválido negativo',summary:{...a.summary,spend:-1}}),
    client({id:'synthetic-nan',name:'D: inválido NaN',summary:{...a.summary,spend:NaN}}),
    client({id:'synthetic-infinity',name:'E: inválido infinito',summary:{...a.summary,spend:Infinity}}),
  ];
  const before=structuredClone(input);
  const result=agencyPortfolioChart(input,'spend');
  assert.equal(result.totalObserved,1);assert.equal(result.excluded,4);
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].width,100);
  assert.ok(Number.isFinite(result.rows[0].width));
  assert.deepEqual(input,before);
});

const {AgencyOverview}=loadTypescript<typeof import('../src/components/agency/agency-overview')>(new URL('../src/components/agency/agency-overview.tsx',import.meta.url),(id,native)=>native(id));
test('agency renders personalized dates and direct BI links with scope while keeping existing workspaces',()=>{
  const a=client(),empty=client({id:orgB,name:'Horizonte sintético',slug:'horizonte-sintetico',hasData:false,connected:false,summary:summarizeClientAds(orgB,'BRL',[])});
  const html=renderToStaticMarkup(React.createElement(AgencyOverview,{clients:[a,empty],summary:a.summary,currency:'BRL',from:'2026-10-01',to:'2026-10-20'}));
  for(const text of ['Visão da agência','Data inicial da agência','Data final da agência','Buscar cliente da agência','Horizonte sintético','Sem registros de mídia','Abrir Marketing BI'])assert.ok(html.includes(text),text);
  assert.ok(html.includes('aurora-sintetica/reports/analytics?from=2026-10-01&amp;to=2026-10-20&amp;currency=BRL&amp;compare=previous_period'));
  assert.ok(html.includes('/aurora-sintetica/paid'));assert.ok(html.includes('/aurora-sintetica/overview'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});

test('agency interaction filters cards and chart without changing the declared portfolio KPIs',()=>{
  const states:unknown[]=[];let cursor=0;
  const {AgencyOverview:Interactive}=loadTypescript<typeof import('../src/components/agency/agency-overview')>(new URL('../src/components/agency/agency-overview.tsx',import.meta.url),(id,native)=>id==='react'?{...React,useMemo:(fn:()=>unknown)=>fn(),useState:(initial:unknown)=>{const index=cursor++;if(!(index in states))states[index]=initial;return[states[index],(next:unknown)=>{states[index]=typeof next==='function'?next(states[index]):next;}];}}:native(id));
  const a=client(),b=client({id:orgB,name:'Horizonte sintético',slug:'horizonte-sintetico',connected:false});
  function elements(node:React.ReactNode):React.ReactElement<Record<string,unknown>>[]{if(!React.isValidElement(node))return[];const element=node as React.ReactElement<Record<string,unknown>>;return[element,...React.Children.toArray(element.props.children as React.ReactNode).flatMap(elements)];}
  const render=()=>{cursor=0;return Interactive({clients:[a,b],summary:a.summary,currency:'BRL',from:'2026-10-01',to:'2026-10-20'});};
  let tree=render();const search=elements(tree).find(el=>el.props['aria-label']==='Buscar cliente da agência');assert.ok(search);(search.props.onChange as(e:unknown)=>void)({target:{value:'horizonte'}});tree=render();
  assert.equal(elements(tree).filter(el=>el.props.className==='agency-client-card').length,1);assert.ok(renderToStaticMarkup(tree).includes('2 clientes'));assert.ok(!renderToStaticMarkup(tree).includes('Logo Estúdio'));
  const leads=elements(tree).find(el=>el.type==='button'&&el.props.children==='Leads');assert.ok(leads);(leads.props.onClick as()=>void)();tree=render();assert.ok(renderToStaticMarkup(tree).includes('Clientes por leads'));
});
