import type {CampaignPerformance} from '@/types/domain';
import {isRfcOrganizationUuid} from './organization-scope';
import type {Row} from '@/types/database.types';

export type RankingDimension = Row<'metrics_ads_breakdowns'>['dimension_type'];
export type RankedPerformance = {key:string;label:string;spend:number;revenue:number|null;impressions:number|null;clicks:number|null;leads:number|null;purchases:number|null};
export type PerformanceRankingGroups = Record<'campaign'|RankingDimension,RankedPerformance[]>;

/** Keep opaque source IDs intact. Whitespace padding is not a distinct identity. */
function validOpaqueIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value === value.trim();
}

/** Only Meta has an account alias; the bare act_ marker is not an account. */
function validRankingAccount(platform: unknown, account: unknown): boolean {
  if (!validOpaqueIdentifier(platform) || !validOpaqueIdentifier(account)) return false;
  if (platform !== 'meta_ads') return true;
  const canonicalAccount = account.replace(/^act_/, '');
  // A second act_ marker is not an opaque Meta account ID. Other providers
  // retain the literal prefix, without normalizing their account identities.
  return validOpaqueIdentifier(canonicalAccount) && !canonicalAccount.startsWith('act_');
}

/** Ad/ad-set identifiers can be absent for rows with no fallback entity. */
function validOptionalIdentifier(value: unknown): boolean {
  return value == null || value === '' || validOpaqueIdentifier(value);
}

/**
 * Ranking values are displayed with one currency and one tenant context.
 * Never display a source that differs from the authenticated client and selected currency.
 * The database query also scopes these rows; this is an independent fail-closed boundary.
 */
function assertSingleScope(
  campaigns: readonly CampaignPerformance[],
  ads: readonly Row<'metrics_ads'>[],
  breakdowns: readonly Row<'metrics_ads_breakdowns'>[],
  creatives: readonly Row<'creatives'>[],
  expectedOrganizationId: string,
  expectedCurrency: string,
) {
  const organizations = new Set([
    ...campaigns.map(row => row.organizationId),
    ...ads.map(row => row.organization_id),
    ...breakdowns.map(row => row.organization_id),
    ...creatives.map(row => row.organization_id),
  ]);
  if (!isRfcOrganizationUuid(expectedOrganizationId) || organizations.size > 1 ||
    [...organizations].some(organization => organization !== expectedOrganizationId)) {
    throw new Error('Rankings require a single organization matching authorization');
  }

  // Catalog-only campaigns have no metrics and carry an empty currency by design.
  const currencies = new Set([
    ...campaigns.filter(row => row.currency !== '').map(row => row.currency),
    ...ads.map(row => row.currency),
    ...breakdowns.map(row => row.currency),
  ]);
  if (!/^[A-Z]{3}$/.test(expectedCurrency) || currencies.size > 1 ||
    [...currencies].some(currency => currency !== expectedCurrency)) {
    throw new Error('Rankings require one known source currency');
  }

  // Validate every source, even when its details will not appear in a ranking.
  // Never normalize malformed identities into a legitimate grouped result.
  if (campaigns.some(row => !validRankingAccount(row.platform, row.accountId)
      || !validOpaqueIdentifier(row.campaignId))
    || ads.some(row => !validRankingAccount(row.platform, row.account_id)
      || !validOptionalIdentifier(row.adset_id) || !validOptionalIdentifier(row.ad_id))
    || breakdowns.some(row => !validRankingAccount(row.platform, row.account_id)
      || !validOpaqueIdentifier(row.dimension_type) || !validOpaqueIdentifier(row.dimension_value))
    || creatives.some(row => !validRankingAccount(row.platform, row.account_id)
      || !validOptionalIdentifier(row.ad_id))) {
    throw new Error('Rankings require intact source identifiers');
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
  const labels=new Map<string,Set<string>>();
  const dimensionValues=new Map<string,string>();
  for(const row of rows){
    if(row.dimension_type!==type)continue;
    // The same demographic value may aggregate across accounts only within a tenant/currency.
    const key=JSON.stringify([row.organization_id,row.platform,row.currency,row.dimension_value]);
    // Provider labels can differ across accounts or syncs. The first row must
    // not arbitrarily determine what the user sees for a combined dimension.
    const displayLabel=row.dimension_label?.trim();
    if(displayLabel){
      const candidates=labels.get(key)??new Set<string>();
      candidates.add(displayLabel);
      labels.set(key,candidates);
    }
    dimensionValues.set(key,row.dimension_value);
    grouped.set(key,add(grouped.get(key),{
      key,label:row.dimension_label,spend:checkedSpend(row.spend),
      revenue:known(row.revenue),impressions:knownCount(row.impressions),
      clicks:knownCount(row.clicks),leads:knownCount(row.leads),purchases:knownCount(row.purchases),
    }));
  }
  return [...grouped].map(([key,result])=>{
    const candidates=labels.get(key);
    // A single label is trustworthy; conflicts or absent labels fall back to
    // the actual dimension value, never a row-order-dependent translation.
    const label=candidates?.size===1?[...candidates][0]:dimensionValues.get(key);
    return {...result,label:label??result.label};
  });
}

/** Only Meta's act_ prefix aliases its numeric account ID; other providers stay literal. */
function rankingAccount(platform:string,accountId:string):string {
  const normalized=platform==='meta_ads'?accountId.replace(/^act_/, ''):accountId;
  return normalized;
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

export function preparePerformanceRankings(campaigns:CampaignPerformance[],ads:Row<'metrics_ads'>[],breakdowns:Row<'metrics_ads_breakdowns'>[],creatives:Row<'creatives'>[],expectedOrganizationId:string,expectedCurrency:string):PerformanceRankingGroups{
  assertSingleScope(campaigns,ads,breakdowns,creatives,expectedOrganizationId,expectedCurrency);
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
