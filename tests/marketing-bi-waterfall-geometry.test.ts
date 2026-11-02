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

test('small floating-point residual at zero does not suppress a valid decimal waterfall',()=>{
  const selection=selected(),current=selection.current[0],previous=selection.previous[0];
  selection.current=[
    {...current,accountId:'synthetic-a',campaignId:'a',spend:0},
    {...current,accountId:'synthetic-b',campaignId:'b',spend:0},
  ];
  selection.previous=[
    {...previous,accountId:'synthetic-a',campaignId:'a',spend:0.7},
    {...previous,accountId:'synthetic-b',campaignId:'b',spend:0.1},
  ];
  const snapshot=JSON.stringify(selection),report=marketingDrivers(selection,'spend');
  assert.equal(report.available,true);
  assert.equal(report.end,0);
  const bars=projectMarketingWaterfall(report);
  assert.ok(bars,'finite decimal rounding is not numeric overflow');
  assert.ok(bars.every(bar=>Number.isFinite(bar.base)&&bar.base>=0&&Number.isFinite(bar.magnitude)));
  assert.equal(bars.at(-1)?.magnitude,0);
  assert.equal(JSON.stringify(selection),snapshot);
});

test('genuinely negative or infinite intermediate geometry remains unavailable',()=>{
  const report=marketingDrivers(selected(),'spend');
  assert.equal(projectMarketingWaterfall({...report,start:0,rows:[{...report.rows[0],change:-1}]}),null);
  assert.equal(projectMarketingWaterfall({...report,start:Number.MAX_VALUE,rows:[{...report.rows[0],change:Number.MAX_VALUE}]}),null);
});

test('missing driver pairs and invalid grouped tail fail closed rather than producing plot coordinates',()=>{
  assert.equal(projectMarketingWaterfall(marketingDrivers(selectMarketingBI(buildAnalyticsWorkspace({...input(),priorAds:[]}),{platform:'all',account:'all',campaign:'all'}),'spend')),null);
  const report=marketingDrivers(selected(),'spend');
  const rows=Array.from({length:10},(_,i)=>({...report.rows[0],key:'synthetic-'+i,name:'Campanha '+i,change:i===8?Number.MAX_VALUE:i===9?Number.MAX_VALUE:0}));
  const synthetic={...report,rows};
  assert.equal(projectMarketingWaterfall(synthetic),null,'overflow in grouped tail is not replaced by zero');
});

test('BI-WATERFALL-END-RECONCILIATION-001: inconsistent totals or driver changes never produce a misleading waterfall',()=>{
  const report=marketingDrivers(selected(),'spend');
  assert.equal(report.available,true);
  const original=structuredClone(report);
  assert.equal(projectMarketingWaterfall({...report,end:report.end!+1}),null,'unexplained final total cannot be plotted as reconciled');
  assert.equal(projectMarketingWaterfall({...report,rows:report.rows.map(row=>({...row,change:row.change+1}))}),null,'a missing delta cannot be concealed');
  assert.equal(projectMarketingWaterfall({...report,rows:[]}),null,'no visible drivers means no waterfall evidence');
  assert.ok(projectMarketingWaterfall(report),'the canonical reconciled report remains usable');
  assert.deepEqual(report,original,'no mutation of underlying observations');
});

test('BI-WATERFALL-END-RECONCILIATION-001: decimal rounding and grouped tail remain valid, material imbalance does not',()=>{
  const original=marketingDrivers(selected(),'spend'),first=original.rows[0];
  const decimal={...original,start:0.8,end:0,rows:[
    {...first,key:'synthetic-a',name:'A',change:-0.7},
    {...first,key:'synthetic-b',name:'B',change:-0.1},
  ]};
  const rounded=projectMarketingWaterfall(decimal);
  assert.ok(rounded,'a sub-ULP decimal residue is not a new discrepancy');
  assert.equal(rounded.at(-1)?.magnitude,0);

  const grouped={...original,start:10,end:21,rows:Array.from({length:10},(_,i)=>({
    ...first,key:'synthetic-'+i,name:'Synthetic '+i,change:1.1,
  }))};
  const snapshot=structuredClone(grouped);
  const bars=projectMarketingWaterfall(grouped);
  assert.ok(bars);
  assert.equal(bars.length,11,'eight detailed campaign bars, one tail, and two endpoint bars');
  assert.equal(bars.at(-2)?.name,'Demais campanhas');
  assert.equal(bars.at(-1)?.magnitude,21);
  assert.equal(projectMarketingWaterfall({...grouped,end:22}),null,'material mismatch after grouping cannot be presented as reconciled');
  assert.deepEqual(grouped,snapshot);
});
