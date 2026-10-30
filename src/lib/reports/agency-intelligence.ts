import type {Row} from '@/types/database.types';
import type {CampaignPerformance} from '@/types/domain';
import {buildAnalyticsWorkspace,selectAnalytics,analyticsPlatforms,type AnalyticsPoint} from './analytics-workspace';
import {calendarDays,comparisonPeriod,alignCalendarPeriods} from '@/lib/metrics/calendar';
import {paidTotals,paidMetric,sumKnown,type PaidMetricKey} from '@/lib/metrics/paid-metrics';
import {isRfcOrganizationUuid} from '@/lib/metrics/organization-scope';
import {computeDelta} from '@/lib/metrics/delta';

export type AgencyCompare='none'|'previous_period'|'previous_year';
export type AgencyGranularity='day'|'week'|'month';
export type AgencySourceClient={id:string;name:string;slug:string;currency:string;timezone:string};
type Dataset={organizationId:string;currency:string;current:CampaignPerformance[];previous:CampaignPerformance[];days:AnalyticsPoint[];priorDays:AnalyticsPoint[];comparable:Record<string,boolean>;sourceRecords:number};
export type AgencyIntelligenceModel={from:string;to:string;compare:AgencyCompare;previous:{from:string;to:string}|null;datasets:Dataset[]};

/** Investment mix is measured, not inferred: missing/invalid spend invalidates its source. */
export function agencyPlatformInvestmentRows(campaigns: readonly CampaignPerformance[]) {
 return analyticsPlatforms.map(platform=>{
  const rows=campaigns.filter(campaign=>campaign.platform===platform);
  return {platform,value:sumKnown(rows,row=>paidMetric(row,'spend')),campaigns:rows.length};
 });
}


/** Only agency-authorized active tenants reach this builder; validate the entire batch before projection. */
export function buildAgencyIntelligence(input:{clients:AgencySourceClient[];current:Row<'metrics_ads'>[];previous:Row<'metrics_ads'>[];from:string;to:string;compare:AgencyCompare}):AgencyIntelligenceModel {
 const {clients,current,previous,from,to,compare}=input;
 calendarDays(from,to);if(!['none','previous_period','previous_year'].includes(compare))throw new Error('Invalid agency comparison');
 const ids=new Set(clients.map(client=>client.id));
 if(ids.size!==clients.length||clients.some(client=>!isRfcOrganizationUuid(client.id)||!/^[A-Z]{3}$/.test(client.currency))||[...current,...previous].some(row=>!ids.has(row.organization_id)))throw new Error('Invalid authorized agency scope');
 const datasets=clients.map(client=>{
  const model=buildAnalyticsWorkspace({ads:current.filter(row=>row.organization_id===client.id),priorAds:previous.filter(row=>row.organization_id===client.id),breakdowns:[],priorBreakdowns:[],crm:[],priorCrm:[],steps:[],scope:{organizationId:client.id,organizationName:client.name,organizationSlug:client.slug,currency:client.currency,timezone:client.timezone,from,to,compare,generatedAt:new Date().toISOString()}});
  return {organizationId:client.id,currency:client.currency,current:model.current,previous:model.previous,days:model.days,priorDays:model.priorDays,sourceRecords:model.sourceRecords,comparable:Object.fromEntries(['all',...analyticsPlatforms].map(platform=>[platform,selectAnalytics(model,{platform,campaign:'all'}).compatible]))};
 });
 const result={from,to,compare,previous:compare==='none'?null:comparisonPeriod(from,to,compare),datasets};
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>3_000_000)throw new Error('Agency analytical capacity exceeded');
 return result;
}

/** Group actual source dates independently in each period. Weeks are seven-day blocks from each start date. */
export function selectAgencyIntelligence(model:AgencyIntelligenceModel,options:{clientIds:readonly string[];currency:string;platform:string;granularity:AgencyGranularity}) {
 const known=new Set(model.datasets.map(dataset=>dataset.organizationId));
 if(options.clientIds.some(id=>!known.has(id))||!/^[A-Z]{3}$/.test(options.currency)||!['all',...analyticsPlatforms].includes(options.platform)||!['day','week','month'].includes(options.granularity))throw new Error('Invalid agency analytical selection');
 const ids=new Set(options.clientIds),datasets=model.datasets.filter(dataset=>ids.has(dataset.organizationId)&&dataset.currency===options.currency);
 const matches=(row:{platform:string})=>options.platform==='all'||row.platform===options.platform;
 const current=datasets.flatMap(dataset=>dataset.current.filter(matches)),previous=datasets.flatMap(dataset=>dataset.previous.filter(matches));
 const observed=datasets.filter(dataset=>dataset.current.some(matches)||dataset.previous.some(matches));
 const compatible=model.compare!=='none'&&observed.length>0&&observed.every(dataset=>dataset.comparable[options.platform]);
 const totals=paidTotals(current),priorTotals=paidTotals(previous);
 const period=(range:{from:string;to:string},prior:boolean)=>{
  const dates=calendarDays(range.from,range.to),keyOf=(date:string)=>options.granularity==='month'?date.slice(0,7):options.granularity==='week'?String(Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse(range.from+'T00:00:00Z'))/604800000)):date;
  const calendar=new Map<string,string[]>();for(const date of dates){const key=keyOf(date),days=calendar.get(key)??[];days.push(date);calendar.set(key,days);}
  const rows=datasets.flatMap(dataset=>(prior?dataset.priorDays:dataset.days).filter(matches).map(day=>({...day,organizationId:dataset.organizationId})));
  const groups=new Map<string,typeof rows>();for(const row of rows){const key=keyOf(row.date),group=groups.get(key)??[];group.push(row);groups.set(key,group);}
  const keys=[...calendar.keys()];
  const points=new Map(keys.map(key=>{const group=groups.get(key)??[],days=calendar.get(key)!;return [key,{from:days[0],to:days.at(-1)!,totals:paidTotals(group),observedDays:new Set(group.map(row=>row.date)).size,calendarDays:days.length,observedClients:new Set(group.map(row=>row.organizationId)).size,records:group.length}];}));
  return {keys,points};
 };
 const now=period(model,false),prior=model.previous?period(model.previous,true):{keys:[],points:new Map<never,never>()};
 const timeline=alignCalendarPeriods(now.keys,prior.keys,now.points,prior.points).map(point=>({index:point.index,current:point.current,previous:point.previous}));
 const clients=datasets.map(dataset=>{const now=dataset.current.filter(matches),prior=dataset.previous.filter(matches);return {id:dataset.organizationId,current:paidTotals(now),previous:paidTotals(prior),compatible:model.compare!=='none'&&dataset.comparable[options.platform],campaigns:now.length};});
 return {totals,priorTotals,current,previous,clients,timeline,compatible,selectedClients:datasets.length,observedClients:clients.filter(client=>client.campaigns>0).length,observedDays:new Set(datasets.flatMap(dataset=>dataset.days.filter(matches).map(day=>day.date))).size,campaigns:current.length};
}
export type AgencyIntelligenceSelection=ReturnType<typeof selectAgencyIntelligence>;
export function agencyIntelligenceDelta(selection:AgencyIntelligenceSelection,metric:PaidMetricKey,comparing:boolean) {
 if(!comparing||(['leads','cpl'].includes(metric)&&!selection.compatible))return null;
 return computeDelta(paidMetric(selection.totals,metric),paidMetric(selection.priorTotals,metric),metric);
}
