import test from 'node:test';
import assert from 'node:assert/strict';
import {strategicPeriodComparison} from '../src/lib/metrics/strategic-comparison';

const orgA='22222222-2222-4222-8222-222222222222';
const orgB='33333333-3333-4333-8333-333333333333';
const row=(organizationId=orgA,currency='BRL')=>({organizationId,currency});
const base={
  currentRows:[row()],
  previousRows:[row()],
  requestedCurrency:'BRL',
  comparing:true,
  current:{spend:120,leads:120,cpl:1},
  previous:{spend:100,leads:100,cpl:1},
};

test('strategic comparison shows measured changes for valid same-tenant and same-currency periods',()=>{
  assert.deepEqual(strategicPeriodComparison(base),{
    spendChange:20,leadChange:20,cplChange:0,hasComparableMetric:true,demandGrowthOutpacesSpend:false,
  });
});

test('strategic comparison fails closed for other tenants, currency and malformed organization',()=>{
  const invalid=[
    {previousRows:[row(orgB)]},
    {currentRows:[row(orgB)]},
    {currentRows:[row(),row(orgB)]},
    {previousRows:[row(),row(orgB)]},
    {currentRows:[row(orgA,'USD')]},
    {previousRows:[row(orgA,'USD')]},
    {requestedCurrency:'USD'},
    {requestedCurrency:' '},
    {currentRows:[row('00000000-0000-0000-0000-000000000000')]},
    {previousRows:[]},
    {currentRows:[]},
    {comparing:false},
  ];
  for(const override of invalid){
    const result=strategicPeriodComparison({...base,...override});
    assert.deepEqual(result,{
      spendChange:null,leadChange:null,cplChange:null,hasComparableMetric:false,
      demandGrowthOutpacesSpend:false,
    },JSON.stringify(override));
  }
});

test('historical rows with no usable denominators do not claim comparison availability',()=>{
  const result=strategicPeriodComparison({...base,previous:{spend:0,leads:0,cpl:null}});
  assert.equal(result.spendChange,null);
  assert.equal(result.leadChange,null);
  assert.equal(result.cplChange,null);
  assert.equal(result.hasComparableMetric,false);
});

test('fewer leads with a faster budget reduction is not called growing demand',()=>{
  const result=strategicPeriodComparison({...base,
    current:{spend:20,leads:80,cpl:0.25},
    previous:{spend:100,leads:100,cpl:1},
  });
  assert.equal(result.spendChange,-80);
  assert.equal(result.leadChange,-20);
  assert.equal(result.demandGrowthOutpacesSpend,false);
});

test('real lead growth exceeding spend growth by more than ten points remains an opportunity',()=>{
  const result=strategicPeriodComparison({...base,
    current:{spend:110,leads:125,cpl:0.88},
    previous:{spend:100,leads:100,cpl:1},
  });
  assert.equal(result.leadChange,25);
  assert.ok(Math.abs((result.spendChange??0)-10)<1e-9);
  assert.equal(result.demandGrowthOutpacesSpend,true);
});

test('comparison never promotes nonfinite or missing measures to a valid signal',()=>{
  const result=strategicPeriodComparison({...base,
    current:{spend:Number.NaN,leads:null,cpl:Number.POSITIVE_INFINITY},
  });
  assert.equal(result.hasComparableMetric,false);
  assert.equal(result.demandGrowthOutpacesSpend,false);
  assert.equal(result.cplChange,null);
});

test('exact ten-point advantage is not a growth recommendation',()=>{
  const result=strategicPeriodComparison({...base,
    current:{spend:110,leads:120,cpl:110/120},
    previous:{spend:100,leads:100,cpl:1},
  });
  assert.equal(result.leadChange,20);
  assert.ok(Math.abs((result.spendChange??0)-10)<1e-9);
  assert.equal(result.demandGrowthOutpacesSpend,false);
});

test('valid budget comparison alone does not invent lead growth',()=>{
  const result=strategicPeriodComparison({...base,
    current:{spend:150,leads:null,cpl:null},
    previous:{spend:100,leads:null,cpl:null},
  });
  assert.equal(result.spendChange,50);
  assert.equal(result.leadChange,null);
  assert.equal(result.hasComparableMetric,true);
  assert.equal(result.demandGrowthOutpacesSpend,false);
});
