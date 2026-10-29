import {reportHref} from './report-catalog';
import type {Row} from '@/types/database.types';
import {scopedCampaigns} from '@/lib/metrics/campaigns';
import {funnelMetricDefinitions,parseFunnelSteps} from '@/lib/metrics/funnel-config';
import {summarizeFunnelMetric} from '@/lib/metrics/funnel-performance';
import {buildPerformanceReport,type PerformanceScope,type PerformancePeriod} from './performance-report';
export const funnelPlatforms=['meta_ads','google_ads','tiktok_ads'] as const;
export type FunnelPlatform=typeof funnelPlatforms[number];
export type FunnelReportScope=PerformanceScope & {platform:FunnelPlatform|null};
export function funnelPlatform(input:string|undefined):FunnelPlatform|null {
 if(input===undefined||input==='all')return null;
 if(!funnelPlatforms.includes(input as FunnelPlatform))throw new Error('Invalid funnel platform');
 return input as FunnelPlatform;
}
type Summary=ReturnType<typeof summarizeFunnelMetric>;
export type FunnelReport={scope:FunnelReportScope;current:PerformancePeriod;previous:PerformancePeriod|null;
 stages:{metric:string;label:string;color?:string;target:number|null;costLabel:string;current:Summary;previous:Summary|null}[]};
/** Validate every fact before aggregation; no CRM inference, simulated stages or unique-person rates. */
export function buildFunnelReport(current:Row<'metrics_ads'>[],previous:Row<'metrics_ads'>[],scope:FunnelReportScope,steps:unknown):FunnelReport {
 if(scope.platform!==null&&!funnelPlatforms.includes(scope.platform))throw new Error('Invalid funnel platform');
 if(scope.platform&&[...current,...previous].some(row=>row.platform!==scope.platform))throw new Error('Funnel platform mismatch');
 const validated=buildPerformanceReport(current,previous,scope);
 const project=(rows:Row<'metrics_ads'>[])=>scopedCampaigns(rows,[],'crm',[],scope.organizationId,scope.currency);
 const now=project(current),prior=project(previous);
 return {scope:{...scope},current:validated.current,previous:validated.previous,stages:parseFunnelSteps(steps).map(step=>({
  metric:step.metric,label:step.label,color:step.color,target:step.target??null,
  costLabel:funnelMetricDefinitions.find(item=>item.key===step.metric)!.costLabel,
  current:summarizeFunnelMetric(now,step.metric,scope.organizationId,scope.currency),
  previous:validated.previous?summarizeFunnelMetric(prior,step.metric,scope.organizationId,scope.currency):null,
 }))};
}
export function funnelReportHref(slug:string,context:Pick<FunnelReportScope,'from'|'to'|'currency'|'compare'>,platform:FunnelPlatform|null) {
 const href=reportHref(slug,'funnel',context);
 if(platform!==null&&!funnelPlatforms.includes(platform))throw new Error('Invalid funnel platform');
 return href+(platform?'&platform='+platform:'');
}
