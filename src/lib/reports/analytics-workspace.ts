import type {Row} from '@/types/database.types';
import type {CampaignPerformance} from '@/types/domain';
import {calendarDays,comparisonPeriod,alignCalendarPeriods} from '@/lib/metrics/calendar';
import {scopedCampaigns} from '@/lib/metrics/campaigns';
import {paidTotals,paidMetric,type PaidMetricKey,type PaidTotals} from '@/lib/metrics/paid-metrics';
import {sum} from '@/lib/metrics/aggregation';
import {computeDelta} from '@/lib/metrics/delta';
import {buildPerformanceReport,comparableAttribution,type PerformanceScope,type PerformancePeriod} from './performance-report';
import {buildRevenueReport,type RevenueReport} from './revenue-report';
import {parseFunnelSteps,type FunnelStepConfig} from '@/lib/metrics/funnel-config';
export const analyticsPlatforms=['meta_ads','google_ads','tiktok_ads'] as const;
export const analyticsDimensions=['gender','age','country','state','city','device'] as const;
export type AnalyticsDimension=typeof analyticsDimensions[number];
export type AnalyticsSelection={platform:string;campaign:string};
export type AnalyticsPoint={date:string;key:string;platform:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null};
export type AnalyticsAudience={date:string;key:string;platform:string;account:string;dimension:AnalyticsDimension;value:string;label:string;window:string;spend:number|null;impressions:number|null;clicks:number|null;leads:number|null};
type Attribution=PerformancePeriod['attribution'];
export type AnalyticsWorkspaceModel={scope:PerformanceScope;steps:FunnelStepConfig[];current:CampaignPerformance[];previous:CampaignPerformance[];days:AnalyticsPoint[];priorDays:AnalyticsPoint[];audience:AnalyticsAudience[];priorAudience:AnalyticsAudience[];lineage:{key:string;current:Attribution;previous:Attribution}[];commercial:RevenueReport;omittedAudience:number;sourceRecords:number};
export class AnalyticsCapacityError extends Error {constructor(){super('Recorte analítico extenso; reduza o período para abrir todos os dados sem truncamento.');}}
const intact=(value:unknown,empty=false):value is string=>typeof value==='string'&&(empty||value.length>0)&&value.trim()===value&&!/[\u0000-\u001f\u007f-\u009f]/.test(value);
/** Treat provider attribution-window labels as evidence, never silently sanitize them. */
const knownAudienceAttributionWindow=(value:string)=>
 value.length>0&&value===value.trim()&&
 !/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u.test(value)&&
 !/(unknown|default|unspecified|not[ _-]?set|n[aã]o[ _-]?informad|unavailable)/i.test(value);
const account=(value:string,platform:string)=>platform==='meta_ads'?value.replace(/^act_/,''):value;
export const analyticsCampaignKey=(platform:string,accountId:string,campaignId:string)=>JSON.stringify([platform,account(accountId,platform),campaignId]);
function daily(rows:Row<'metrics_ads'>[]):AnalyticsPoint[]{
 const grouped=new Map<string,Row<'metrics_ads'>[]>();
 for(const row of rows){const key=JSON.stringify([row.metric_date,analyticsCampaignKey(row.platform,row.account_id,row.campaign_id)]);const group=grouped.get(key)??[];group.push(row);grouped.set(key,group);}
 return [...grouped.values()].map(group=>{const row=group[0],values=paidTotals(group);if(values.spend===null)throw new Error('Invalid daily investment');return {date:row.metric_date,key:analyticsCampaignKey(row.platform,row.account_id,row.campaign_id),platform:row.platform,spend:values.spend,impressions:values.impressions,clicks:values.clicks,leads:values.leads};}).sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}
function audience(rows:Row<'metrics_ads_breakdowns'>[],scope:PerformanceScope,range:{from:string;to:string}){
 const allowed=new Set(calendarDays(range.from,range.to)),ids=new Set<string>(),grains=new Set<string>();let omitted=0;
 const result:AnalyticsAudience[]=[];
 for(const row of rows){
  if(row.organization_id!==scope.organizationId||row.currency!==scope.currency||!allowed.has(row.metric_date)||!analyticsPlatforms.includes(row.platform as typeof analyticsPlatforms[number]))throw new Error('Analytics audience scope mismatch');
  if(!intact(row.id)||!intact(row.account_id)||!intact(account(row.account_id,row.platform))||(row.platform==='meta_ads'&&account(row.account_id,row.platform).startsWith('act_'))||!intact(row.campaign_id)||!intact(row.dimension_type)||!intact(row.dimension_value,true)||typeof row.attribution_window!=='string')throw new Error('Invalid analytics audience identity');
  const key=analyticsCampaignKey(row.platform,row.account_id,row.campaign_id),grain=JSON.stringify([row.metric_date,key,row.dimension_type,row.dimension_value]);
  if(ids.has(row.id)||grains.has(grain))throw new Error('Duplicate analytics audience grain');ids.add(row.id);grains.add(grain);
  if(!analyticsDimensions.includes(row.dimension_type as AnalyticsDimension)){omitted++;continue;}
  result.push({date:row.metric_date,key,platform:row.platform,account:account(row.account_id,row.platform),dimension:row.dimension_type as AnalyticsDimension,value:row.dimension_value,label:row.dimension_label?.trim()||row.dimension_value||'Não informado',window:row.attribution_window,spend:row.spend,impressions:row.impressions,clicks:row.clicks,leads:row.leads});
 }
 return {rows:result,omitted};
}
/** The entire authorized batch is validated before any client-side selection is possible. */
export function buildAnalyticsWorkspace(input:{ads:Row<'metrics_ads'>[];priorAds:Row<'metrics_ads'>[];breakdowns:Row<'metrics_ads_breakdowns'>[];priorBreakdowns:Row<'metrics_ads_breakdowns'>[];crm:Row<'metrics_crm'>[];priorCrm:Row<'metrics_crm'>[];scope:PerformanceScope;steps:unknown}):AnalyticsWorkspaceModel {
 const {scope}=input,report=buildPerformanceReport(input.ads,input.priorAds,scope);
 if(scope.compare==='none'&&(input.priorBreakdowns.length||input.priorCrm.length))throw new Error('Unexpected analytics comparison facts');
 const current=scopedCampaigns(input.ads,[],'crm',[],scope.organizationId,scope.currency),previous=scopedCampaigns(input.priorAds,[],'crm',[],scope.organizationId,scope.currency);
 const now=audience(input.breakdowns,scope,scope),prior=audience(input.priorBreakdowns,scope,comparisonPeriod(scope.from,scope.to,scope.compare));
 const commercial=buildRevenueReport(input.crm,input.priorCrm,{...scope,source:'crm'});
 const model:AnalyticsWorkspaceModel={scope:{...scope},steps:parseFunnelSteps(input.steps),current,previous,days:daily(input.ads),priorDays:daily(input.priorAds),audience:now.rows,priorAudience:prior.rows,lineage:report.campaigns.map(group=>({key:group.key,current:group.current.attribution,previous:group.previous?.attribution??[]})),commercial,omittedAudience:now.omitted+prior.omitted,sourceRecords:input.ads.length};
 if(new TextEncoder().encode(JSON.stringify(model)).byteLength>2_000_000)throw new AnalyticsCapacityError();
 return model;
}
export function selectAnalytics(model:AnalyticsWorkspaceModel,selection:AnalyticsSelection){
 if(selection.platform!=='all'&&!analyticsPlatforms.includes(selection.platform as typeof analyticsPlatforms[number]))throw new Error('Invalid analytics platform');
 const match=(platform:string,key:string)=>(selection.platform==='all'||selection.platform===platform)&&(selection.campaign==='all'||selection.campaign===key);
 const campaigns=(rows:CampaignPerformance[])=>rows.filter(row=>match(row.platform,analyticsCampaignKey(row.platform,row.accountId,row.campaignId)));
 const current=campaigns(model.current),previous=campaigns(model.previous),days=model.days.filter(row=>match(row.platform,row.key)),priorDays=model.priorDays.filter(row=>match(row.platform,row.key));
 const priorPeriod=comparisonPeriod(model.scope.from,model.scope.to,model.scope.compare);
 const currentRange=calendarDays(model.scope.from,model.scope.to),priorRange=model.scope.compare==='none'?[]:calendarDays(priorPeriod.from,priorPeriod.to);
 const byDate=(points:AnalyticsPoint[])=>{const groups=new Map<string,AnalyticsPoint[]>();for(const point of points){const rows=groups.get(point.date)??[];rows.push(point);groups.set(point.date,rows);}return new Map([...groups].map(([date,rows])=>[date,paidTotals(rows)]));};
 const timeline=alignCalendarPeriods(currentRange,priorRange,byDate(days),byDate(priorDays));
 const merge=(entries:Attribution[]):Attribution=>{const groups=new Map<string,{platform:string;account:string;windows:Set<string>}>();for(const entry of entries.flat()){const key=JSON.stringify([entry.platform,entry.account]),group=groups.get(key)??{platform:entry.platform,account:entry.account,windows:new Set<string>()};entry.windows.forEach(w=>group.windows.add(w));groups.set(key,group);}return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,g])=>({...g,windows:[...g.windows].sort()}));};
 const lineage=model.lineage.filter(row=>{const [platform]=JSON.parse(row.key) as string[];return match(platform,row.key);});
 const compatible=comparableAttribution({attribution:merge(lineage.map(row=>row.current))},{attribution:merge(lineage.map(row=>row.previous))});
 return {current,previous,totals:paidTotals(current),priorTotals:paidTotals(previous),timeline,compatible,audience:model.audience.filter(row=>match(row.platform,row.key)),priorAudience:model.priorAudience.filter(row=>match(row.platform,row.key))};
}
export function analyticsDelta(current:PaidTotals,previous:PaidTotals,metric:PaidMetricKey,compatible:boolean,comparing:boolean){
 if(!comparing||(['leads','cpl'].includes(metric)&&!compatible))return null;
 return computeDelta(paidMetric(current,metric),paidMetric(previous,metric),metric);
}
export function analyticsAudienceRows(current:AnalyticsAudience[],previous:AnalyticsAudience[],dimension:AnalyticsDimension){
 const now=current.filter(row=>row.dimension===dimension),prior=previous.filter(row=>row.dimension===dimension),values=[...new Set([...now,...prior].map(row=>row.value))];
 const aggregate=(rows:AnalyticsAudience[])=>{const windows=new Set(rows.map(r=>r.window));const validWindow=windows.size===1&&[...windows].every(knownAudienceAttributionWindow);return{spend:sum(rows,'spend'),impressions:sum(rows,'impressions'),clicks:sum(rows,'clicks'),leads:validWindow?sum(rows,'leads'):null};};
 const canonical:Record<string,string>={female:'Feminino',male:'Masculino',unknown:'Não informado',mobile:'Celular',desktop:'Computador',tablet:'Tablet'};
 return values.map(value=>{const currentRows=now.filter(row=>row.value===value),previousRows=prior.filter(row=>row.value===value),all=[...currentRows,...previousRows],labels=new Set(all.map(row=>row.label)),currentValues=aggregate(currentRows),previousValues=aggregate(previousRows);const attribution=(rows:AnalyticsAudience[]):Attribution=>{const groups=new Map<string,{platform:string;account:string;windows:Set<string>}>();for(const row of rows){const key=JSON.stringify([row.platform,row.account]),group=groups.get(key)??{platform:row.platform,account:row.account,windows:new Set<string>()};group.windows.add(row.window);groups.set(key,group);}return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,group])=>({...group,windows:[...group.windows].sort()}));};if(currentRows.length&&previousRows.length&&!comparableAttribution({attribution:attribution(currentRows)},{attribution:attribution(previousRows)})){currentValues.leads=null;previousValues.leads=null;}return{value,label:canonical[value.toLowerCase()]??(labels.size===1?[...labels][0]:value||'Não informado'),current:currentValues,previous:previousValues,currentRecords:currentRows.length,previousRecords:previousRows.length};});
}
