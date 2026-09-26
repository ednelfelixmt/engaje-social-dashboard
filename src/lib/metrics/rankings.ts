import type {CampaignPerformance} from '@/types/domain';
import type {Row} from '@/types/database.types';

export type RankingDimension = Row<'metrics_ads_breakdowns'>['dimension_type'];
export type RankedPerformance = {key:string;label:string;spend:number;revenue:number|null;impressions:number|null;clicks:number|null;leads:number|null;purchases:number|null};
export type PerformanceRankingGroups = Record<'campaign'|RankingDimension,RankedPerformance[]>;

function add(current:RankedPerformance|undefined,row:RankedPerformance):RankedPerformance{
  if(!current)return row;
  const nullable=(left:number|null,right:number|null)=>left==null&&right==null?null:Number(left??0)+Number(right??0);
  return {...current,label:current.label||row.label,spend:current.spend+row.spend,revenue:nullable(current.revenue,row.revenue),impressions:nullable(current.impressions,row.impressions),clicks:nullable(current.clicks,row.clicks),leads:nullable(current.leads,row.leads),purchases:nullable(current.purchases,row.purchases)};
}

function aggregateBreakdowns(rows:Row<'metrics_ads_breakdowns'>[],type:RankingDimension){
  const grouped=new Map<string,RankedPerformance>();
  for(const row of rows){
    if(row.dimension_type!==type)continue;
    const key=`${row.platform}:${row.dimension_value}`;
    grouped.set(key,add(grouped.get(key),{key,label:row.dimension_label,spend:Number(row.spend),revenue:row.revenue==null?null:Number(row.revenue),impressions:row.impressions,clicks:row.clicks,leads:row.leads,purchases:row.purchases}));
  }
  return [...grouped.values()];
}

function fallbackAds(rows:Row<'metrics_ads'>[],type:'audience'|'creative',creativeNames:Map<string,string>){
  const grouped=new Map<string,RankedPerformance>();
  for(const row of rows){
    const value=type==='audience'?row.adset_id:row.ad_id;
    if(!value)continue;
    const key=`${row.platform}:${row.account_id}:${value}`;
    const label=type==='creative'?(creativeNames.get(`${row.platform}:${row.account_id}:${value}`)||`Criativo ${value}`):`Público ${value}`;
    grouped.set(key,add(grouped.get(key),{key,label,spend:Number(row.spend),revenue:row.revenue==null?null:Number(row.revenue),impressions:row.impressions,clicks:row.clicks,leads:row.leads,purchases:row.purchases}));
  }
  return [...grouped.values()];
}

export function preparePerformanceRankings(campaigns:CampaignPerformance[],ads:Row<'metrics_ads'>[],breakdowns:Row<'metrics_ads_breakdowns'>[],creatives:Row<'creatives'>[]):PerformanceRankingGroups{
  const creativeNames=new Map(creatives.filter((item)=>item.ad_id).map((item)=>[`${item.platform}:${item.account_id}:${item.ad_id}`,item.caption||`Criativo ${item.ad_id}`]));
  const dimensions:RankingDimension[]=['audience','creative','gender','age','device','state','city'];
  const result={} as PerformanceRankingGroups;
  result.campaign=campaigns.map((row)=>({key:`${row.platform}:${row.accountId}:${row.campaignId}`,label:row.campaignName,spend:row.spend,revenue:row.revenue,impressions:row.impressions,clicks:row.clicks,leads:row.leads,purchases:row.purchases}));
  for(const type of dimensions){
    const detailed=aggregateBreakdowns(breakdowns,type);
    result[type]=detailed.length?detailed:(type==='audience'||type==='creative'?fallbackAds(ads,type,creativeNames):[]);
  }
  return result;
}
