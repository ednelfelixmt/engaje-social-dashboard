import test from 'node:test';
import assert from 'node:assert/strict';
import {AnalyticsCapacityError,buildAnalyticsWorkspace,selectAnalytics,analyticsDelta,analyticsAudienceRows,analyticsCampaignKey} from '../src/lib/reports/analytics-workspace';
import {input,model,fact,breakdown,commercial,scope} from './helpers/analytics-fixture';
test('BI validates source facts and aligns every actual calendar day including empty middle days',()=>{
 const data=model(),selected=selectAnalytics(data,{platform:'all',campaign:'all'});
 assert.equal(selected.totals.spend,100);assert.equal(selected.totals.cpl,20);assert.equal(selected.priorTotals.cpl,8);assert.equal(selected.compatible,true);
 assert.deepEqual(selected.timeline.map(day=>[day.currentDate,day.previousDate,day.current?.clicks??null,day.previous?.clicks??null]),[['2026-10-20','2026-10-18',20,40],['2026-10-21','2026-10-19',null,null]]);
 assert.equal(data.commercial.current.totals.revenue,null,'missing commercial day is not presumed zero');assert.equal(data.commercial.current.days[0].values.revenue,500);
});
test('channel and canonical campaign selections consistently filter paid facts, daily points and independent audience dimensions',()=>{
 const data=input();data.ads.push(fact({id:'google',platform:'google_ads',account_id:'987',campaign_id:'other',campaign_name:'Google synthetic',spend:200,clicks:50}));data.breakdowns.push(breakdown({id:'google-demography',platform:'google_ads',account_id:'987',campaign_id:'other',dimension_value:'male'}));
 const whole=buildAnalyticsWorkspace(data),selected=selectAnalytics(whole,{platform:'google_ads',campaign:analyticsCampaignKey('google_ads','987','other')});assert.equal(selected.current.length,1);assert.equal(selected.totals.spend,200);assert.equal(selected.timeline[0].current?.clicks,50);assert.equal(selected.audience.length,1);assert.equal(selected.audience[0].value,'male');assert.equal(selected.previous.length,0);
 const empty=selectAnalytics(whole,{platform:'all',campaign:'foreign-key'});assert.equal(empty.current.length,0);assert.equal(empty.totals.spend,null);assert.equal(empty.audience.length,0);assert.ok(empty.timeline.every(day=>day.current===null));assert.throws(()=>selectAnalytics(whole,{platform:'other',campaign:'all'}));
 assert.equal(analyticsCampaignKey('meta_ads','act_123','same'),analyticsCampaignKey('meta_ads','123','same'));
});
test('green/red express outcome direction, neutral spend and equal values; attribution failures suppress lead/CPL deltas',()=>{
 const s=selectAnalytics(model(),{platform:'all',campaign:'all'});assert.equal(analyticsDelta(s.totals,s.priorTotals,'impressions',true,true)?.good,true);assert.equal(analyticsDelta(s.totals,s.priorTotals,'leads',true,true)?.good,false);assert.equal(analyticsDelta(s.totals,s.priorTotals,'cpl',true,true)?.good,false);assert.equal(analyticsDelta(s.priorTotals,s.totals,'cpl',true,true)?.good,true);assert.equal(analyticsDelta(s.totals,s.priorTotals,'spend',true,true)?.good,null);assert.equal(analyticsDelta(s.totals,s.totals,'cpl',true,true)?.good,null);assert.equal(analyticsDelta(s.totals,s.priorTotals,'leads',false,true),null);assert.equal(analyticsDelta(s.totals,s.priorTotals,'cpl',true,false),null);
 const data=input();data.priorAds[0].attribution_window='1d_click';assert.equal(selectAnalytics(buildAnalyticsWorkspace(data),{platform:'all',campaign:'all'}).compatible,false);
});
test('all sources fail closed on tenant/currency/date/identity violations before user selection, including CRM and unused dimensions',()=>{
 for(const patch of [{organization_id:'22222222-2222-4222-8222-222222222222'},{currency:'USD'},{metric_date:'2026-10-22'},{account_id:'act_act_123'},{campaign_id:'bad\n'}]){const data=input();data.ads.push(fact({id:'bad',ad_id:'different',...patch}));assert.throws(()=>buildAnalyticsWorkspace(data));}
 for(const patch of [{organization_id:'foreign'},{currency:'USD'},{metric_date:'2026-10-22'},{account_id:'act_act_123'},{dimension_type:'bad '},{dimension_value:' padded'}]){const data=input();data.breakdowns.push(breakdown({id:'bad',...patch} as Parameters<typeof breakdown>[0]));assert.throws(()=>buildAnalyticsWorkspace(data));}
 for(const patch of [{organization_id:'foreign'},{currency:'USD'},{metric_date:'2026-10-22'},{channel:'unsupported'}]){const data=input();data.crm.push(commercial({id:'bad',...patch}));assert.throws(()=>buildAnalyticsWorkspace(data));}
 const duplicate=input();duplicate.breakdowns.push(breakdown({id:'alias',account_id:'123'}));assert.throws(()=>buildAnalyticsWorkspace(duplicate));
});
test('none reads no comparison and keeps zero observations separate from absent days and audience fields',()=>{
 const data=input();data.scope={...scope,compare:'none'};data.priorAds=[];data.priorBreakdowns=[];data.ads=[fact({spend:0,clicks:0,leads:null})];data.breakdowns=[breakdown({impressions:0,clicks:null})];const m=buildAnalyticsWorkspace(data),s=selectAnalytics(m,{platform:'all',campaign:'all'});assert.equal(s.totals.spend,0);assert.equal(s.totals.leads,null);assert.ok(s.timeline.every(day=>day.previousDate===null));assert.equal(s.timeline[0].current?.clicks,0);assert.equal(s.timeline[1].current,null);
 const gender=analyticsAudienceRows(s.audience,s.priorAudience,'gender');assert.equal(gender[0].current.impressions,0);assert.equal(gender[0].current.clicks,null);assert.equal(gender[0].previous.impressions,null);assert.deepEqual(analyticsAudienceRows(s.audience,s.priorAudience,'country'),[]);
 data.priorBreakdowns=[breakdown({metric_date:'2026-10-18'})];assert.throws(()=>buildAnalyticsWorkspace(data));
});
test('marginal dimensions are grouped independently, unknown groups stay visible and mixed windows do not yield attributed lead totals',()=>{
 const data=input();data.breakdowns.push(breakdown({id:'age',dimension_type:'age',dimension_value:'25-34',dimension_label:'25–34'}),breakdown({id:'unknown',dimension_value:'unknown',dimension_label:''}),breakdown({id:'other-window',campaign_id:'second',attribution_window:'1d_click'}));const m=buildAnalyticsWorkspace(data),s=selectAnalytics(m,{platform:'all',campaign:'all'}),gender=analyticsAudienceRows(s.audience,s.priorAudience,'gender');assert.equal(gender.length,2);assert.equal(gender.find(r=>r.value==='unknown')?.label,'Não informado');assert.equal(gender.find(r=>r.value==='female')?.current.leads,null);assert.equal(gender.find(r=>r.value==='female')?.current.impressions,2000);assert.equal(analyticsAudienceRows(s.audience,s.priorAudience,'age').length,1);assert.equal(analyticsAudienceRows(s.audience,s.priorAudience,'city').length,0);
});

test('large BI payloads are rejected without silently truncating authorized source facts',()=>{const data=input();data.ads[0].campaign_name='Synthetic'.repeat(250000);assert.throws(()=>buildAnalyticsWorkspace(data),AnalyticsCapacityError);});

test('audience lead comparison rejects changed account windows while preserving impressions',()=>{const data=input();data.priorBreakdowns[0].attribution_window='1d_click';const selected=selectAnalytics(buildAnalyticsWorkspace(data),{platform:'all',campaign:'all'}),rows=analyticsAudienceRows(selected.audience,selected.priorAudience,'gender');assert.equal(rows[0].current.leads,null);assert.equal(rows[0].previous.leads,null);assert.equal(rows[0].current.impressions,1000);});

test('ANALYTICS-AUDIENCE-WINDOW-RAW-001: malformed raw audience attribution cannot become valid leads after trimming',()=>{
 for(const window of [' 7d_click','7d_click ','7d_click\u200b','7d_click\u202e','unknown','']){
  const data=input();
  data.breakdowns[0].attribution_window=window;
  data.priorBreakdowns[0].attribution_window=window;
  const unchanged=structuredClone(data.breakdowns);
  const selected=selectAnalytics(buildAnalyticsWorkspace(data),{platform:'all',campaign:'all'});
  const [row]=analyticsAudienceRows(selected.audience,selected.priorAudience,'gender');
  assert.equal(selected.audience[0].window,window,'current provenance must remain raw');
  assert.equal(selected.priorAudience[0].window,window,'historical provenance must remain raw');
  assert.equal(row.current.leads,null,JSON.stringify(window));
  assert.equal(row.previous.leads,null,JSON.stringify(window));
  assert.equal(row.current.impressions,1000);
  assert.equal(row.previous.impressions,800);
  assert.equal(row.current.clicks,20);
  assert.deepEqual(data.breakdowns,unchanged);
 }
});
test('ANALYTICS-AUDIENCE-WINDOW-RAW-001: legitimate zero leads and other measurements survive strict attribution',()=>{
 for(const window of ['7d_click','7d click']){
  const data=input();
  data.breakdowns[0].attribution_window=window;
  data.priorBreakdowns[0].attribution_window=window;
  data.breakdowns[0].leads=0;
  data.priorBreakdowns[0].leads=0;
  const selected=selectAnalytics(buildAnalyticsWorkspace(data),{platform:'all',campaign:'all'});
  const [row]=analyticsAudienceRows(selected.audience,selected.priorAudience,'gender');
  assert.equal(row.current.leads,0,window);
  assert.equal(row.previous.leads,0,window);
  assert.equal(row.current.spend,100);
  assert.equal(row.current.impressions,1000);
 }
 const data=input();
 data.scope={...scope,compare:'none'};
 data.priorAds=[];data.priorBreakdowns=[];
 data.breakdowns[0].attribution_window='7d_click ';
 const selected=selectAnalytics(buildAnalyticsWorkspace(data),{platform:'all',campaign:'all'});
 const [row]=analyticsAudienceRows(selected.audience,selected.priorAudience,'gender');
 assert.equal(row.current.leads,null,'an invalid window must fail closed without a comparison period');
 assert.equal(row.current.spend,100);
 assert.equal(row.previous.leads,null);
});
