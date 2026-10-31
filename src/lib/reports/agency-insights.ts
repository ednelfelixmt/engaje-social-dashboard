import {computeDelta} from '@/lib/metrics/delta';
import {paidMetric,type PaidMetricKey,type PaidTotals} from '@/lib/metrics/paid-metrics';
import type {AgencyIntelligenceSelection} from './agency-intelligence';

/** Leads and CPL depend on equivalent attribution windows; every other metric is comparable as recorded. */
const needsAttribution=(metric:PaidMetricKey)=>metric==='leads'||metric==='cpl';

/** One value per aligned interval. Intervals without a valid observation stay `null`, never zero. */
export function metricSparkline(selection:Pick<AgencyIntelligenceSelection,'timeline'>,metric:PaidMetricKey):(number|null)[] {
 return selection.timeline.map(point=>point.current?paidMetric(point.current.totals,metric):null);
}

export type ChangeRow={id:string;current:number;previous:number;change:number;percent:number|null;good:boolean|null};
export type ChangeBreakdown={rows:ChangeRow[];/** Clients with a value on only one side, or without comparable attribution. */excluded:number};
type ClientTotals={id:string;current:PaidTotals;previous:PaidTotals;compatible:boolean};

/**
 * What moved between the two periods, per client. Only clients with a valid value in both periods
 * (and comparable attribution for leads/CPL) are listed; the rest are counted in `excluded`.
 * Ordered by the size of the absolute change, so the biggest movers come first.
 */
export function changeBreakdown(clients:readonly ClientTotals[],metric:PaidMetricKey):ChangeBreakdown {
 const rows:ChangeRow[]=[];let excluded=0;
 for(const client of clients){
  const current=paidMetric(client.current,metric),previous=paidMetric(client.previous,metric);
  if(current===null&&previous===null)continue;
  if(current===null||previous===null||(needsAttribution(metric)&&!client.compatible)){excluded++;continue;}
  const change=current-previous;
  if(!Number.isFinite(change)){excluded++;continue;}
  const delta=computeDelta(current,previous,metric);
  rows.push({id:client.id,current,previous,change,percent:delta?.change??null,good:delta?.good??null});
 }
 rows.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)||a.id.localeCompare(b.id));
 return {rows,excluded};
}
