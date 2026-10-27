import {finiteRatio} from './aggregation';
import type {CampaignPerformance} from '@/types/domain';
import {paidWeightedMetrics, weightedMetricKeys} from './weighted-metrics';

// Revenue adjustments/refunds may be signed; impressions, events and spend cannot.
const signedMonetaryMetrics = new Set(['revenue', 'conversion_value']);
function availableTotal(rows:CampaignPerformance[],key:string){
  const values=rows.map(row=>row.metricValues[key]);
  if(!values.length||values.some(value=>value==null||!Number.isFinite(value)||(!signedMonetaryMetrics.has(key)&&value<0)))return null;
  const total=values.reduce<number>((sum,value)=>sum+Number(value),0);
  return Number.isFinite(total)?total:null;
}

function knownUnique(value:number|null|undefined):number|null{
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function paidSummary(rows:CampaignPerformance[]):Record<string,number|null>{
  // An accidental cross-tenant input must not yield any aggregate to a dashboard.
  if(rows.length>1&&rows.some(row=>row.organizationId!==rows[0].organizationId)){
    throw new Error('Paid summary requires a single organization');
  }
  const additive=[
    'spend','revenue','conversion_value','impressions','clicks','link_clicks','outbound_clicks','page_views',
    'video_views','video_2s_views','video_3s_views','video_6s_views','thruplays','video_25','video_50','video_75','video_95','video_100',
    'leads','registration_leads','message_leads','phone_calls','form_starts','form_completions','content_views','add_to_cart',
    'checkouts','purchases','catalog_sales','subscriptions','conversions','all_conversions','view_through_conversions',
  ];
  const result:Record<string,number|null>={};
  for(const key of additive)result[key]=availableTotal(rows,key);
  // Distinct users/clickers are not additive across campaigns or accounts.
  // A single campaign row is usable only when its upstream daily grain was validated.
  result.reach=rows.length===1?knownUnique(rows[0].metricValues.reach):null;
  result.unique_clicks=rows.length===1?knownUnique(rows[0].metricValues.unique_clicks):null;
  // Monetary aggregation across currencies is not meaningful without an explicit FX conversion.
  const currencies=new Set(rows.map(row=>row.currency));
  if(currencies.size>1||[...currencies].some(currency=>!/^[A-Z]{3}$/.test(currency))){
    for(const key of ['spend','revenue','conversion_value'])result[key]=null;
  }
  const spend=result.spend,revenue=result.revenue;
  // Revenue minus ad spend is not accounting profit: product, operational and tax costs are unavailable.
  // Never infer ROI from ROAS or paid-media spend alone.
  result.profit=null;
  result.roas=finiteRatio(revenue,spend);result.roi=null;
  result.frequency=finiteRatio(result.impressions,result.reach);
  result.cpm=finiteRatio(spend,result.impressions,1000);result.cpc=finiteRatio(spend,result.clicks);
  result.ctr=finiteRatio(result.clicks,result.impressions,100);result.unique_ctr=finiteRatio(result.unique_clicks,result.reach,100);
  result.cpl=finiteRatio(spend,result.leads);result.cpa=finiteRatio(spend,result.purchases);
  result.conversion_rate=finiteRatio(result.purchases,result.clicks,100);result.cost_per_conversion=finiteRatio(spend,result.conversions);
  result.cost_per_page_view=finiteRatio(spend,result.page_views);result.cost_per_registration=finiteRatio(spend,result.registration_leads);
  result.cost_per_message=finiteRatio(spend,result.message_leads);result.cost_per_call=finiteRatio(spend,result.phone_calls);
  result.cost_per_thruplay=finiteRatio(spend,result.thruplays);result.cost_per_add_to_cart=finiteRatio(spend,result.add_to_cart);
  result.cost_per_checkout=finiteRatio(spend,result.checkouts);result.cost_per_subscription=finiteRatio(spend,result.subscriptions);
  const weighted = paidWeightedMetrics(rows);
  for(const key of weightedMetricKeys)result[key]=weighted[key].value;
  // Compatibility aliases used by the funnel and lead-breakdown components.
  result.pageViews=result.page_views;result.registrationLeads=result.registration_leads;result.messageLeads=result.message_leads;
  result.costPerRegistration=result.cost_per_registration;result.costPerMessage=result.cost_per_message;
  return result;
}
