import type {Row} from '@/types/database.types';
import {calendarDays} from './calendar';
import {paidDataFreshness} from './data-freshness';
export const qualityPlatforms=['meta_ads','google_ads','tiktok_ads'] as const;
export type QualityPlatform=typeof qualityPlatforms[number];
export type QualityScope={organizationId:string;businessDate:string;generatedAt:string};
export type QualityIntegration=Pick<Row<'integrations'>,'id'|'organization_id'|'provider'|'status'|'is_enabled'>;
export type QualityMetric=Pick<Row<'metrics_ads'>,'id'|'organization_id'|'metric_date'|'platform'|'account_id'|'campaign_id'|'synced_at'>;
export type QualityDimension=Pick<Row<'metrics_ads_breakdowns'>,'id'|'organization_id'|'platform'|'dimension_type'>;
export type QualityJob=Pick<Row<'sync_jobs'>,'id'|'organization_id'|'status'|'created_at'|'started_at'|'completed_at'|'rows_processed'>;
export type QualityInput={integrations:QualityIntegration[];metrics:QualityMetric[];dimensions:QualityDimension[];jobs:QualityJob[]};
export type QualityHealth={platform:QualityPlatform;campaigns:number;rows:number;days:number;first:string|null;latest:string|null;lastReceived:string|null;age:number|null;integrations:number;connected:number;expired:number;breakdowns:Record<string,number>;status:'recent'|'delayed'|'missing'|'invalid';invalidDates:number;futureDates:number;unknownCollections:number};
export type QualityJobView={id:string;status:'queued'|'running'|'completed'|'failed'|'unknown';createdAt:string|null;startedAt:string|null;completedAt:string|null;recordedCount:number|null;durationMs:number|null;timelineInvalid:boolean};
function validDate(value:unknown):value is string{if(typeof value!=='string')return false;try{calendarDays(value,value);return true;}catch{return false;}}
function timestamp(value:unknown):number|null{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)||!validDate(value.slice(0,10)))return null;
 const ms=Date.parse(value);return Number.isFinite(ms)?ms:null;
}
export function validateQualityScope(scope:QualityScope){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scope.organizationId)||!validDate(scope.businessDate))throw new Error('Invalid quality scope');
 const generated=timestamp(scope.generatedAt);if(generated===null)throw new Error('Invalid quality generation timestamp');return generated;
}
export function buildDataQuality(input:QualityInput,scope:QualityScope){
 const generated=validateQualityScope(scope);
 for(const records of [input.integrations,input.metrics,input.dimensions,input.jobs]){const ids=new Set<string>();for(const row of records){if(row.organization_id!==scope.organizationId||typeof row.id!=='string'||!row.id.trim()||ids.has(row.id))throw new Error('Quality source scope or identity mismatch');ids.add(row.id);}}
 if(input.jobs.length>12)throw new Error('Quality job window exceeded');
 const known=(value:unknown)=>{const ms=timestamp(value);return ms!==null&&ms<=generated?ms:null;};
 const iso=(ms:number|null)=>ms===null?null:new Date(ms).toISOString();
 const items:QualityHealth[]=qualityPlatforms.map(platform=>{
  const records=input.metrics.filter(row=>row.platform===platform);
  for(const row of records)if(typeof row.account_id!=='string'||!row.account_id.trim()||typeof row.campaign_id!=='string'||!row.campaign_id.trim())throw new Error('Quality campaign identity missing');
  const validDates=records.filter(row=>validDate(row.metric_date)&&row.metric_date<=scope.businessDate).map(row=>row.metric_date);
  const dates=[...new Set(validDates)].sort(),freshness=paidDataFreshness(validDates,scope.businessDate);
  const collections=records.map(row=>known(row.synced_at));
  const received=collections.filter((ms):ms is number=>ms!==null);
  const integrations=input.integrations.filter(row=>row.provider===platform),breakdowns:Record<string,number>=Object.create(null);
  for(const row of input.dimensions.filter(row=>row.platform===platform)){if(typeof row.dimension_type!=='string'||!row.dimension_type.trim())throw new Error('Quality dimension missing');breakdowns[row.dimension_type]=(breakdowns[row.dimension_type]??0)+1;}
  return {platform,campaigns:new Set(records.map(row=>JSON.stringify([row.account_id,row.campaign_id]))).size,rows:records.length,days:dates.length,first:dates[0]??null,latest:freshness.latest,lastReceived:iso(received.length?received.reduce((latest,ms)=>Math.max(latest,ms),-Infinity):null),age:freshness.daysOld,
   integrations:integrations.length,connected:integrations.filter(row=>row.status==='connected'&&row.is_enabled===true).length,expired:integrations.filter(row=>row.status==='expired'||row.status==='error').length,breakdowns,
   status:freshness.status==='empty'?(records.length?'invalid':'missing'):freshness.status,
   invalidDates:records.filter(row=>!validDate(row.metric_date)).length,futureDates:records.filter(row=>validDate(row.metric_date)&&row.metric_date>scope.businessDate).length,unknownCollections:collections.filter(ms=>ms===null).length};
 });
 const jobs:QualityJobView[]=input.jobs.map(row=>{
  const status=(['queued','running','completed','failed'].includes(row.status)?row.status:'unknown') as QualityJobView['status'];
  const created=known(row.created_at),started=known(row.started_at),completed=known(row.completed_at);
  const terminal=status==='completed'||status==='failed';
  const coherent=created!==null&&started!==null&&completed!==null&&created<=started&&started<=completed;
  const timelineInvalid=created===null||row.started_at!==null&&started===null||row.completed_at!==null&&completed===null||started!==null&&created!==null&&started<created||completed!==null&&started!==null&&completed<started||terminal&&!coherent||!terminal&&row.completed_at!==null||status==='queued'&&row.started_at!==null||status==='running'&&started===null;
  return {id:row.id,status,createdAt:iso(created),startedAt:iso(started),completedAt:iso(completed),recordedCount:status==='completed'&&!timelineInvalid&&Number.isSafeInteger(row.rows_processed)&&row.rows_processed>=0?row.rows_processed:null,durationMs:terminal&&coherent&&!timelineInvalid?completed-started:null,timelineInvalid};
 });
 return {scope:{...scope},items,jobs,rows:input.metrics.length,dimensions:input.dimensions.length,unsupportedMetricRows:input.metrics.filter(row=>!qualityPlatforms.includes(row.platform as QualityPlatform)).length};
}
