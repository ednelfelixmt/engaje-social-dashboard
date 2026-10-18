import assert from 'node:assert/strict';
import test from 'node:test';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import type {CampaignPerformance} from '../src/types/domain';

function campaign(metricValues:Record<string,number|null>):CampaignPerformance{
  return {
    organizationId:'org',platform:'meta_ads',accountId:'account',campaignId:'campaign',campaignName:'Vídeo',campaignStatus:'ACTIVE',currency:'BRL',
    spend:100,revenue:null,impressions:1000,reach:800,clicks:20,pageViews:null,leads:null,registrationLeads:null,messageLeads:null,
    checkouts:null,revenueSource:'unavailable',purchases:null,roas:null,roi:null,cpm:100,cpc:5,cpl:null,costPerRegistration:null,
    costPerMessage:null,ctr:2,cpa:null,conversionRate:null,metricValues:{spend:100,impressions:1000,reach:800,clicks:20,...metricValues},
  };
}

test('consolida todas as métricas de vídeo sem transformar ausência em zero',()=>{
  const summary=paidSummary([
    campaign({video_views:500,video_2s_views:450,video_3s_views:400,video_6s_views:null,thruplays:250,video_25:350,video_50:300,video_75:200,video_95:150,video_100:125}),
    campaign({video_views:300,video_2s_views:275,video_3s_views:250,video_6s_views:null,thruplays:100,video_25:225,video_50:180,video_75:120,video_95:90,video_100:75}),
  ]);
  assert.equal(summary.video_views,800);
  assert.equal(summary.video_2s_views,725);
  assert.equal(summary.video_3s_views,650);
  assert.equal(summary.video_6s_views,null);
  assert.equal(summary.thruplays,350);
  assert.equal(summary.video_100,200);
  assert.equal(summary.cost_per_thruplay,200/350);
});
