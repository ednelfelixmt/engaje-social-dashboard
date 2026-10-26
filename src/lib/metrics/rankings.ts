import type {CampaignPerformance} from '@/types/domain';
import type {Row} from '@/types/database.types';

export type RankingDimension = Row<'metrics_ads_breakdowns'>['dimension_type'];
export type RankedPerformance = {key:string;label:string;spend:number;revenue:number|null;impressions:number|null;clicks:number|null;leads:number|null;purchases:number|null};
export type PerformanceRankingGroups = Record<'campaign'|RankingDimension,RankedPerformance[]>;

/**
 * Ranking values are displayed with one currency and one tenant context.
 * Never display a mixed source as if it belonged to the selected client/currency.
 * The database query also scopes these rows; this is a defensive aggregation boundary.
 */
function assertSingleScope(
  campaigns: readonly CampaignPerformance[],
  ads: readonly Row<'metrics_ads'>[],
  breakdowns: readonly Row<'metrics_ads_breakdowns'>[],
  creatives: readonly Row<'creatives'>[],
) {
  const organizations = new Set([
    ...campaigns.map(row => row.organizationId),
    ...ads.map(row => row.organization_id),
    ...breakdowns.map(row => row.organization_id),
    ...creatives.map(row => row.organization_id),
  ]);
  if (organizations.size > 1 || organizations.has('')) throw new Error('Rankings require a single organization');

  // Catalog-only campaigns have no metrics and carry an empty currency by design.
  const currencies = new Set([
    ...campaigns.filter(row => row.currency !== '').map(row => row.currency),
    ...ads.map(row => row.currency),
    ...breakdowns.map(row => row.currency),
  ]);
  if (currencies.size > 1 || currencies.has('') || [...currencies].some(currency => !/^[A-Z]{3}$/.test(currency))) {
    throw new Error('Rankings require one known source currency');
  }
}

function known(value:number|null):number|null {
  return value != null && Number.isFinite(value) ? value : null;
}

/** Provider event counts may be fractional, but can never be negative. */
function knownCount(value:number|null):number|null {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

function checkedSpend(value:number):number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid ranking spend');
  return value;
}

function add(current:RankedPerformance|undefined,row:RankedPerformance):RankedPerformance {
  if (!current) return row;
  // A missing component invalidates the whole sum; it is never a recorded zero.
  const nullable=(left:number|null,right:number|null):number|null =>
    left == null || right == null ? null : known(left + right);
  return {
    ...current,
    label:current.label||row.label,
    spend:checkedSpend(current.spend + row.spend),
    revenue:nullable(current.revenue,row.revenue),
    impressions:nullable(current.impressions,row.impressions),
    clicks:nullable(current.clicks,row.clicks),
    leads:nullable(current.leads,row.leads),
    purchases:nullable(current.purchases,row.purchases),
  };
}

function aggregateBreakdowns(rows:Row<'metrics_ads_breakdowns'>[],type:RankingDimension){
  const grouped=new Map<string,RankedPerformance>();
  for(const row of rows){
    if(row.dimension_type!==type)continue;
    // The same demographic value may aggregate across accounts only within a tenant/currency.
    const key=JSON.stringify([row.organization_id,row.platform,row.currency,row.dimension_value]);
    grouped.set(key,add(grouped.get(key),{
      key,label:row.dimension_label,spend:checkedSpend(row.spend),
      revenue:known(row.revenue),impressions:knownCount(row.impressions),
      clicks:knownCount(row.clicks),leads:knownCount(row.leads),purchases:knownCount(row.purchases),
    }));
  }
  return [...grouped.values()];
}

/** Only Meta's act_ prefix aliases its numeric account ID; other providers stay literal. */
function rankingAccount(platform:string,accountId:string):string {
  const normalized=platform==='meta_ads'?accountId.replace(/^act_/, ''):accountId;
  return normalized || accountId;
}

function fallbackAds(rows:Row<'metrics_ads'>[],type:'audience'|'creative',creativeNames:Map<string,string|null>){
  const grouped=new Map<string,RankedPerformance>();
  for(const row of rows){
    const value=type==='audience'?row.adset_id:row.ad_id;
    if(!value)continue;
    const account=rankingAccount(row.platform,row.account_id);
    const key=JSON.stringify([row.organization_id,row.platform,account,row.currency,value]);
    const creativeKey=JSON.stringify([row.organization_id,row.platform,account,value]);
    const label=type==='creative'?(creativeNames.get(creativeKey)||`Criativo ${value}`):`Público ${value}`;
    grouped.set(key,add(grouped.get(key),{
      key,label,spend:checkedSpend(row.spend),revenue:known(row.revenue),
      impressions:knownCount(row.impressions),clicks:knownCount(row.clicks),
      leads:knownCount(row.leads),purchases:knownCount(row.purchases),
    }));
  }
  return [...grouped.values()];
}

export function preparePerformanceRankings(campaigns:CampaignPerformance[],ads:Row<'metrics_ads'>[],breakdowns:Row<'metrics_ads_breakdowns'>[],creatives:Row<'creatives'>[]):PerformanceRankingGroups{
  assertSingleScope(campaigns,ads,breakdowns,creatives);
  // Conflicting names for the same real ad must never depend on API row order.
  const captions=new Map<string,Set<string>>();
  for(const item of creatives){
    if(!item.ad_id)continue;
    const key=JSON.stringify([item.organization_id,item.platform,rankingAccount(item.platform,item.account_id),item.ad_id]);
    const values=captions.get(key)??new Set<string>();
    if(item.caption?.trim())values.add(item.caption.trim());
    captions.set(key,values);
  }
  const creativeNames=new Map<string,string|null>([...captions].map(([key,values])=>[
    key,values.size===1?[...values][0]:null,
  ]));
  const dimensions:RankingDimension[]=['audience','creative','gender','age','device','state','city'];
  const result={} as PerformanceRankingGroups;
  result.campaign=campaigns.map(row=>({
    key:JSON.stringify([row.organizationId,row.platform,row.accountId,row.campaignId,row.currency]),
    label:row.campaignName,spend:checkedSpend(row.spend),revenue:known(row.revenue),
    impressions:knownCount(row.impressions),clicks:knownCount(row.clicks),
    leads:knownCount(row.leads),purchases:knownCount(row.purchases),
  }));
  for(const type of dimensions){
    const detailed=aggregateBreakdowns(breakdowns,type);
    result[type]=detailed.length?detailed:(type==='audience'||type==='creative'?fallbackAds(ads,type,creativeNames):[]);
  }
  return result;
}
