import test from 'node:test';
import assert from 'node:assert/strict';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';

function campaign(id:string,values:Record<string,number|null>):CampaignPerformance{
 return {organizationId:'tenant-a',platform:'meta_ads',accountId:'account',campaignId:id,campaignName:id,campaignStatus:'ACTIVE',currency:'BRL',
 spend:values.spend??0,revenue:values.revenue??null,impressions:values.impressions??null,reach:values.reach??null,clicks:values.clicks??null,
 pageViews:null,leads:values.leads??null,registrationLeads:null,messageLeads:null,checkouts:null,revenueSource:'unavailable',
 purchases:null,roas:null,roi:null,cpm:null,cpc:null,cpl:null,costPerRegistration:null,costPerMessage:null,ctr:null,cpa:null,conversionRate:null,metricValues:values};
}
test('homologação: CPL consolidado usa soma de investimento / soma de leads',()=>{
 const r=paidSummary([campaign('a',{spend:100,leads:10,impressions:1000,clicks:50}),campaign('b',{spend:400,leads:20,impressions:2000,clicks:100})]);
 assert.equal(r.spend,500);assert.equal(r.leads,30);assert.equal(r.cpl,500/30);assert.equal(r.ctr,5);
});
test('homologação: leads e receita ausentes nunca são fabricados',()=>{
 const r=paidSummary([campaign('a',{spend:60,leads:null,revenue:null,impressions:null,clicks:null})]);
 assert.equal(r.leads,null);assert.equal(r.revenue,null);assert.equal(r.cpl,null);assert.equal(r.roas,null);
});
test('homologação: não dividir por zero e não transformar amostra vazia em desempenho',()=>{
 const zero=paidSummary([campaign('a',{spend:50,leads:0,impressions:0,clicks:0})]);
 assert.equal(zero.cpl,null);assert.equal(zero.cpc,null);assert.equal(zero.ctr,null);
 const empty=paidSummary([]);
 assert.equal(empty.spend,null);assert.equal(empty.leads,null);
});
