import type {Row} from '@/types/database.types';
import {calendarDays} from '@/lib/metrics/calendar';
import {organicCounter,organicIdentifier,organicPlatforms,organicReportLimit,organicTimestamp,validateOrganicScope,type OrganicPlatform,type OrganicScope} from './organic-scope';

export const organicAccountMetrics=['impressions','reach','interactions','followers','website_clicks'] as const;
export type OrganicAccountMetric=typeof organicAccountMetrics[number];
export const organicAccountLabels:Record<OrganicAccountMetric,string>={impressions:'Visualizações / impressões recebidas',reach:'Alcance recebido',interactions:'Interações recebidas',followers:'Seguidores recebidos (estoque)',website_clicks:'Ações em links recebidas'};
export type OrganicAccountRecord=Pick<Row<'metrics_organic_accounts'>,'id'|'organization_id'|'metric_date'|'platform'|'account_id'|'source_period'|'synced_at'|OrganicAccountMetric>;
export type OrganicAccountValues=Record<OrganicAccountMetric,number|null>;
export type OrganicAccountItem={id:string;platform:OrganicPlatform;account:string;recordDate:string;storedPeriod:'day';collectedAt:string|null;collectionKnown:boolean;values:OrganicAccountValues};
export type OrganicAccountCoverage={platform:OrganicPlatform;account:string;records:number;recordDates:number;selectedDates:number;datesWithoutRecord:number;missingDatePreview:string[];knownValues:Record<OrganicAccountMetric,number>};
export type OrganicAccountsReport={scope:OrganicScope;rows:OrganicAccountItem[];accounts:OrganicAccountCoverage[];received:number;truncated:boolean;limit:number;measurementWindow:'unverified'};

/** Stored account/date records, never asserted daily measurements or period totals. */
export function buildOrganicAccountsReport(records:readonly OrganicAccountRecord[],scope:OrganicScope):OrganicAccountsReport{
 const {generated}=validateOrganicScope(scope);
 const dates=calendarDays(scope.from,scope.to);
 if(records.length>organicReportLimit+1)throw new Error('Organic account query exceeded its bounded window');
 const ids=new Set<string>(),keys=new Set<string>();
 const projected=records.map((record):OrganicAccountItem=>{
  if(record.organization_id!==scope.organizationId||!organicPlatforms.includes(record.platform as OrganicPlatform)
   ||scope.platform!=='all'&&record.platform!==scope.platform||record.source_period!=='day')throw new Error('Organic account scope or stored period mismatch');
  if(!organicIdentifier(record.id)||!organicIdentifier(record.account_id))throw new Error('Organic account identity is missing');
  calendarDays(record.metric_date,record.metric_date);
  if(record.metric_date<scope.from||record.metric_date>scope.to)throw new Error('Organic account record date outside selection');
  const key=JSON.stringify([record.platform,record.account_id,record.metric_date]);
  if(ids.has(record.id)||keys.has(key))throw new Error('Duplicate organic account record');
  ids.add(record.id);keys.add(key);
  const collected=organicTimestamp(record.synced_at);
  const collectionKnown=collected!==null&&collected<=generated;
  const values=Object.fromEntries(organicAccountMetrics.map(metric=>[metric,collectionKnown?organicCounter(record[metric]):null])) as OrganicAccountValues;
  return {id:record.id,platform:record.platform as OrganicPlatform,account:record.account_id,recordDate:record.metric_date,storedPeriod:'day',
   collectedAt:collectionKnown?new Date(collected!).toISOString():null,collectionKnown,values};
 });
 projected.sort((a,b)=>b.recordDate.localeCompare(a.recordDate)||a.platform.localeCompare(b.platform)||a.account.localeCompare(b.account)||a.id.localeCompare(b.id));
 const rows=projected.slice(0,organicReportLimit);
 const groups=new Map<string,OrganicAccountItem[]>();
 for(const row of rows){const key=JSON.stringify([row.platform,row.account]);const group=groups.get(key)??[];group.push(row);groups.set(key,group);}
 const accounts=[...groups.values()].map((group):OrganicAccountCoverage=>{
  const recorded=new Set(group.map(row=>row.recordDate));
  return {platform:group[0].platform,account:group[0].account,records:group.length,recordDates:recorded.size,selectedDates:dates.length,
   datesWithoutRecord:dates.length-recorded.size,missingDatePreview:dates.filter(date=>!recorded.has(date)).slice(0,3),
   knownValues:Object.fromEntries(organicAccountMetrics.map(metric=>[metric,group.filter(row=>row.values[metric]!==null).length])) as Record<OrganicAccountMetric,number>};
 });
 return {scope:{...scope},rows,accounts,received:records.length,truncated:records.length>organicReportLimit,limit:organicReportLimit,measurementWindow:'unverified'};
}
