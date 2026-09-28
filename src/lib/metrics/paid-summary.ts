import type {CampaignPerformance} from '@/types/domain';

function availableTotal(rows:CampaignPerformance[],key:string){
  const values=rows.map((row)=>row.metricValues[key]).filter((value):value is number=>value!=null);
  return values.length?values.reduce((total,value)=>total+value,0):null;
}

function weightedAverage(rows:CampaignPerformance[],key:string){
  const available=rows.filter((row)=>row.metricValues[key]!=null);
  if(!available.length)return null;
  const weighted=available.reduce((total,row)=>total+Number(row.metricValues[key])*(row.impressions||1),0);
  const weight=available.reduce((total,row)=>total+(row.impressions||1),0);
  return weight?weighted/weight:null;
}

function ratio(numerator:number|null,denominator:number|null,multiplier=1){
  return numerator!=null&&denominator?numerator/denominator*multiplier:null;
}

export function paidSummary(rows:CampaignPerformance[]):Record<string,number|null>{
  const additive=[
    'spend','revenue','conversion_value','impressions','reach','clicks','link_clicks','outbound_clicks','unique_clicks','page_views',
    'video_views','video_2s_views','video_3s_views','video_6s_views','thruplays','video_25','video_50','video_75','video_95','video_100',
    'leads','registration_leads','message_leads','phone_calls','form_starts','form_completions','content_views','add_to_cart',
    'checkouts','purchases','catalog_sales','subscriptions','conversions','all_conversions','view_through_conversions',
  ];
  const result:Record<string,number|null>={};
  for(const key of additive)result[key]=availableTotal(rows,key);
  const spend=result.spend,revenue=result.revenue;
  result.profit=revenue!=null&&spend!=null?revenue-spend:null;
  result.roas=ratio(revenue,spend);result.roi=ratio(result.profit,spend,100);
  result.frequency=ratio(result.impressions,result.reach);
  result.cpm=ratio(spend,result.impressions,1000);result.cpc=ratio(spend,result.clicks);
  result.ctr=ratio(result.clicks,result.impressions,100);result.unique_ctr=ratio(result.unique_clicks,result.reach,100);
  result.cpl=ratio(spend,result.leads);result.cpa=ratio(spend,result.purchases);
  result.conversion_rate=ratio(result.purchases,result.clicks,100);result.cost_per_conversion=ratio(spend,result.conversions);
  result.cost_per_page_view=ratio(spend,result.page_views);result.cost_per_registration=ratio(spend,result.registration_leads);
  result.cost_per_message=ratio(spend,result.message_leads);result.cost_per_call=ratio(spend,result.phone_calls);
  result.cost_per_thruplay=ratio(spend,result.thruplays);result.cost_per_add_to_cart=ratio(spend,result.add_to_cart);
  result.cost_per_checkout=ratio(spend,result.checkouts);result.cost_per_subscription=ratio(spend,result.subscriptions);
  for(const key of ['search_impression_share','search_top_impression_share','search_absolute_top_impression_share','quality_score'])result[key]=weightedAverage(rows,key);
  // Compatibility aliases used by the funnel and lead-breakdown components.
  result.pageViews=result.page_views;result.registrationLeads=result.registration_leads;result.messageLeads=result.message_leads;
  result.costPerRegistration=result.cost_per_registration;result.costPerMessage=result.cost_per_message;
  return result;
}
