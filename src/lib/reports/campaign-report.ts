import type {Row} from '@/types/database.types';
import {campaignSelection,type CampaignSelection} from '@/lib/metrics/campaign-selection';
import {calendarDays} from '@/lib/metrics/calendar';
import {paidTotals,type PaidMetricKey,type PaidTotals} from '@/lib/metrics/paid-metrics';
import {buildPerformanceReport,performanceMetrics,performanceDelta,type PerformancePeriod,type PerformanceScope} from './performance-report';
export type CampaignDay={date:string;records:number;ads:number;totals:PaidTotals};
export type CampaignPeriod=PerformancePeriod & {days:CampaignDay[];knownDays:Record<PaidMetricKey,number>;completeTotals:PaidTotals;adCount:number};
export type CampaignReport={scope:PerformanceScope;selection:CampaignSelection;name:string;current:CampaignPeriod;previous:CampaignPeriod|null};
const required:Record<PaidMetricKey,('spend'|'impressions'|'clicks'|'leads')[]>={spend:['spend'],impressions:['impressions'],clicks:['clicks'],leads:['leads'],ctr:['clicks','impressions'],cpc:['spend','clicks'],cpm:['spend','impressions'],cpl:['spend','leads']};
function completePeriod(period:PerformancePeriod,facts:readonly Row<'metrics_ads'>[]):CampaignPeriod {
 const groups=new Map<string,Row<'metrics_ads'>[]>();
 for(const row of facts){const group=groups.get(row.metric_date)??[];group.push(row);groups.set(row.metric_date,group);}
 const days=calendarDays(period.from,period.to).map(date=>{const rows=groups.get(date)??[];return {date,records:rows.length,ads:new Set(rows.map(row=>row.ad_id)).size,totals:paidTotals(rows)};});
 const knownDays=Object.fromEntries(performanceMetrics.map(metric=>[metric,days.filter(day=>required[metric].every(key=>day.totals[key]!==null)).length])) as CampaignPeriod['knownDays'];
 const completeTotals=Object.fromEntries(performanceMetrics.map(metric=>[metric,knownDays[metric]===days.length?period.totals[metric]:null])) as PaidTotals;
 return {...period,days,knownDays,completeTotals,adCount:new Set(facts.map(row=>row.ad_id)).size};
}
/** Validate every row; never silently discard another account/campaign returned upstream. */
export function buildCampaignReport(current:readonly Row<'metrics_ads'>[],previous:readonly Row<'metrics_ads'>[],scope:PerformanceScope,selection:CampaignSelection):CampaignReport {
 const selected=campaignSelection(selection);
 if(!selected)throw new Error('Invalid campaign report selection');
 for(const row of [...current,...previous]){
  const account=row.platform==='meta_ads'?row.account_id.replace(/^act_/,''):row.account_id;
  if(row.platform!==selected.platform || account!==selected.account || row.campaign_id!==selected.campaign)throw new Error('Campaign selection mismatch');
 }
 const report=buildPerformanceReport(current,previous,scope);
 return {scope:{...scope},selection:selected,name:report.campaigns[0]?.label??selected.campaign,current:completePeriod(report.current,current),previous:report.previous?completePeriod(report.previous,previous):null};
}
export function campaignDelta(report:CampaignReport,metric:PaidMetricKey):number|null {
 return performanceDelta({...report.current,totals:report.current.completeTotals},report.previous?{...report.previous,totals:report.previous.completeTotals}:null,metric);
}
