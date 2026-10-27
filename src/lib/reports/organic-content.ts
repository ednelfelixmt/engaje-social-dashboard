import type {Row} from '@/types/database.types';
import {calendarDays} from '@/lib/metrics/calendar';

export const organicPlatforms=['facebook_organic','instagram_organic'] as const;
export type OrganicPlatform=typeof organicPlatforms[number];
export const organicContentLimit=500;
export type OrganicContentRecord=Pick<Row<'creatives'>,'id'|'organization_id'|'platform'|'account_id'|'external_id'|'kind'|'name'|'caption'|'published_at'|'synced_at'|'lifetime_metrics'>;
export type OrganicContentScope={organizationId:string;organizationName:string;organizationSlug:string;timezone:string;from:string;to:string;platform:'all'|OrganicPlatform;generatedAt:string};
export type OrganicContentItem={id:string;platform:OrganicPlatform;account:string;externalId:string;kind:string;caption:string|null;captionTruncated:boolean;publishedAt:string;collectedAt:string|null;snapshotValid:boolean;likes:number|null;comments:number|null;shares:number|null;saves:number|null};
export type OrganicContentReport={scope:OrganicContentScope;rows:OrganicContentItem[];received:number;truncated:boolean;limit:number};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Strict, timezone-bearing timestamp; never interpret a local timestamp as UTC. */
function timestamp(value:unknown):number|null{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value))return null;
 try{calendarDays(value.slice(0,10),value.slice(0,10));}catch{return null;}
 const ms=Date.parse(value);
 return Number.isFinite(ms)?ms:null;
}
export function validateOrganicScope(scope:OrganicContentScope){
 if(!uuid.test(scope.organizationId)||!['all',...organicPlatforms].includes(scope.platform))throw new Error('Invalid organic report scope');
 calendarDays(scope.from,scope.to);
 const generated=timestamp(scope.generatedAt);
 if(generated===null)throw new Error('Invalid report generation timestamp');
 return {from:Date.parse(scope.from+'T00:00:00Z'),until:Date.parse(scope.to+'T00:00:00Z')+86400000,generated};
}
function identifier(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0;}
function counter(value:unknown):number|null{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;}
function caption(value:unknown){if(typeof value!=='string'||!value.trim())return {text:null,truncated:false};let text=value.slice(0,2000);if(/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);return {text,truncated:text.length<value.length};}

/** Select by publication date; counters remain the latest stored lifetime snapshot. */
export function buildOrganicContentReport(records:readonly OrganicContentRecord[],scope:OrganicContentScope):OrganicContentReport{
 const {from,until,generated}=validateOrganicScope(scope);
 if(records.length>organicContentLimit+1)throw new Error('Organic report query exceeded its bounded window');
 const ids=new Set<string>(),keys=new Set<string>();
 const rows=records.map((record):OrganicContentItem=>{
  if(record.organization_id!==scope.organizationId||!organicPlatforms.includes(record.platform as OrganicPlatform)
   ||scope.platform!=='all'&&record.platform!==scope.platform)throw new Error('Organic content scope mismatch');
  if(!identifier(record.id)||!identifier(record.account_id)||!identifier(record.external_id))throw new Error('Organic source identity is missing');
  const key=JSON.stringify([record.platform,record.account_id,record.external_id]);
  if(ids.has(record.id)||keys.has(key))throw new Error('Duplicate organic content identity');
  ids.add(record.id);keys.add(key);
  const published=timestamp(record.published_at);
  if(published===null||published<from||published>=until)throw new Error('Organic publication is outside the requested UTC interval');
  const collected=timestamp(record.synced_at);
  const snapshotValid=collected!==null&&collected>=published&&collected<=generated;
  const metrics=snapshotValid&&record.lifetime_metrics&&typeof record.lifetime_metrics==='object'&&!Array.isArray(record.lifetime_metrics)?record.lifetime_metrics:{};
  const text=caption(record.caption??record.name);
  return {id:record.id,platform:record.platform as OrganicPlatform,account:record.account_id,externalId:record.external_id,kind:record.kind,
   caption:text.text,captionTruncated:text.truncated,publishedAt:new Date(published).toISOString(),
   collectedAt:snapshotValid?new Date(collected!).toISOString():null,snapshotValid,
   likes:counter(metrics.likes),comments:counter(metrics.comments),shares:counter(metrics.shares),
   saves:record.platform==='instagram_organic'?counter(metrics.saved):null};
 });
 rows.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
 return {scope:{...scope},rows:rows.slice(0,organicContentLimit),received:records.length,truncated:records.length>organicContentLimit,limit:organicContentLimit};
}
