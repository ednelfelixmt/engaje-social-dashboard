import type {CampaignPerformance} from '@/types/domain';
import {analyticsCampaignKey, selectAnalytics, type AnalyticsWorkspaceModel} from './analytics-workspace';
import {paidMetric, paidTotals} from '@/lib/metrics/paid-metrics';

export type BISelection = ReturnType<typeof selectAnalytics>;
export const biAdditiveMetrics = ['spend', 'impressions', 'clicks', 'leads'] as const;
export type BIAdditiveMetric = typeof biAdditiveMetrics[number];

export function biAccountKey(platform:string, account:string) {
  const [provider, canonical] = JSON.parse(analyticsCampaignKey(platform, account, '')) as string[];
  return JSON.stringify([provider, canonical]);
}

/** Filter only an already validated tenant model; retain full calendar positions. */
export function selectMarketingBI(model:AnalyticsWorkspaceModel, filters:{platform:string;account:string;campaign:string}):BISelection {
  const accountMatches = (key:string) => {
    const [platform, account] = JSON.parse(key) as string[];
    return filters.account === 'all' || biAccountKey(platform, account) === filters.account;
  };
  const campaignMatches = (row:CampaignPerformance) => accountMatches(analyticsCampaignKey(row.platform,row.accountId,row.campaignId));
  const scoped = {...model,
    current:model.current.filter(campaignMatches), previous:model.previous.filter(campaignMatches),
    days:model.days.filter(row=>accountMatches(row.key)), priorDays:model.priorDays.filter(row=>accountMatches(row.key)),
    audience:model.audience.filter(row=>accountMatches(row.key)), priorAudience:model.priorAudience.filter(row=>accountMatches(row.key)),
    lineage:model.lineage.filter(row=>accountMatches(row.key)),
  };
  return selectAnalytics(scoped,{platform:filters.platform,campaign:filters.campaign});
}

/** Reconcile only campaigns with observations in BOTH periods. Absence is never zero. */
export function marketingDrivers(selection:BISelection, metric:BIAdditiveMetric) {
  if (!biAdditiveMetrics.includes(metric)) throw new Error('Non-additive BI driver metric');
  const currentEntries = selection.current.map(row=>[analyticsCampaignKey(row.platform,row.accountId,row.campaignId),row] as const);
  const previousEntries = selection.previous.map(row=>[analyticsCampaignKey(row.platform,row.accountId,row.campaignId),row] as const);
  const current = new Map(currentEntries), previous = new Map(previousEntries);
  const keys = [...new Set([...current.keys(),...previous.keys()])];
  // A duplicate projected identity (including legitimate Meta aliases) must
  // not silently overwrite one of the observations in Map. Reject the entire
  // waterfall, rather than publish a reconciled-looking but incorrect driver.
  if (current.size !== currentEntries.length || previous.size !== previousEntries.length) {
    return {available:false,start:null,end:null,rows:[],excluded:keys.length,metric};
  }
  const rows:{key:string;name:string;current:number;previous:number;change:number}[] = [];
  if (metric !== 'leads' || selection.compatible) {
    for (const key of keys) {
      const now=current.get(key), prior=previous.get(key);
      if (!now || !prior) continue;
      const a=paidMetric(paidTotals([now]),metric), b=paidMetric(paidTotals([prior]),metric);
      if (a===null || b===null || !Number.isFinite(a-b)) continue;
      rows.push({key,name:now.campaignName,current:a,previous:b,change:a-b});
    }
  }
  const start=rows.reduce((total,row)=>total+row.previous,0), end=rows.reduce((total,row)=>total+row.current,0);
  const valid=rows.length>0 && Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(end-start);
  return {available:valid,start:valid?start:null,end:valid?end:null,
    rows:valid?rows.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)||a.key.localeCompare(b.key)):[],
    excluded:keys.length-(valid?rows.length:0),metric};
}
