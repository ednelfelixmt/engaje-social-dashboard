import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildAnalyticsWorkspace} from '../src/lib/reports/analytics-workspace';
import {marketingDrivers,selectMarketingBI} from '../src/lib/reports/marketing-bi';
import {projectMarketingWaterfall} from '../src/lib/reports/marketing-bi-waterfall';
import {input} from './helpers/analytics-fixture';
import {loadTypescript} from './helpers/load-typescript';

const selected=()=>selectMarketingBI(buildAnalyticsWorkspace(input()),{platform:'all',account:'all',campaign:'all'});

test('waterfall geometry preserves finite comparisons, deltas and reported zero without mutating source',()=>{
  const selection=selected(),before=JSON.stringify(selection);
  const plot=projectMarketingWaterfall(marketingDrivers(selection,'spend'));
  assert.ok(plot);
  assert.equal(plot[0].name,'Comparativo');
  assert.equal(plot[0].magnitude,80);
  assert.deepEqual(plot.slice(1,-1).map(row=>[row.base,row.magnitude,row.change]),[[80,20,20]]);
  assert.equal(plot.at(-1)?.magnitude,100);
  assert.equal(JSON.stringify(selection),before);

  const zero=selected();zero.current[0]={...zero.current[0],spend:0};zero.previous[0]={...zero.previous[0],spend:0};
  const zeroPlot=projectMarketingWaterfall(marketingDrivers(zero,'spend'));
  assert.deepEqual(zeroPlot?.map(row=>row.magnitude),[0,0,0]);
});

test('finite reconciled totals do not authorize a non-finite intermediate waterfall coordinate',()=>{
  const selection=selected(),current=selection.current[0],previous=selection.previous[0];
  const huge=Number.MAX_VALUE*0.75;
  selection.current=[
    {...current,accountId:'synthetic-a',campaignId:'synthetic-a',campaignName:'A sintética',spend:huge},
    {...current,accountId:'synthetic-b',campaignId:'synthetic-b',campaignName:'B sintética',spend:0},
  ];
  selection.previous=[
    {...previous,accountId:'synthetic-a',campaignId:'synthetic-a',campaignName:'A sintética',spend:0},
    {...previous,accountId:'synthetic-b',campaignId:'synthetic-b',campaignName:'B sintética',spend:huge},
  ];
  const report=marketingDrivers(selection,'spend'),before=JSON.stringify(selection);
  assert.equal(report.available,true,'paired campaign totals remain finite');
  assert.equal(report.start,huge);
  assert.equal(report.end,huge);
  assert.equal(report.rows[0].change,huge,'positive step sorts first');
  assert.equal(projectMarketingWaterfall(report),null,'intermediate running sum would overflow');
  const {MarketingBIWaterfall}=loadTypescript<typeof import('../src/components/dashboard/marketing-bi-charts')>(
    new URL('../src/components/dashboard/marketing-bi-charts.tsx',import.meta.url),(id,native)=>native(id),
  );
  const html=renderToStaticMarkup(React.createElement(MarketingBIWaterfall,{selection,metric:'spend',currency:'BRL'}));
  assert.ok(html.includes('Cascata indisponível'),html);
  assert.ok(html.includes('Campanha comparável'),'original comparable facts remain in the table');
  assert.ok(!html.includes('class="bi-waterfall"'),'non-finite SVG projection is not mounted');
  assert.equal(JSON.stringify(selection),before,'viewer rendering never edits measurements');
});

test('missing driver pairs and invalid grouped tail fail closed rather than producing plot coordinates',()=>{
  assert.equal(projectMarketingWaterfall(marketingDrivers(selectMarketingBI(buildAnalyticsWorkspace({...input(),priorAds:[]}),{platform:'all',account:'all',campaign:'all'}),'spend')),null);
  const report=marketingDrivers(selected(),'spend');
  const rows=Array.from({length:10},(_,i)=>({...report.rows[0],key:'synthetic-'+i,name:'Campanha '+i,change:i===8?Number.MAX_VALUE:i===9?Number.MAX_VALUE:0}));
  const synthetic={...report,rows};
  assert.equal(projectMarketingWaterfall(synthetic),null,'overflow in grouped tail is not replaced by zero');
});
