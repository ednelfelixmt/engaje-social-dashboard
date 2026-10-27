import type {Row} from '@/types/database.types';
import {organicPlatforms,organicReportLimit,organicTimestamp,organicIdentifier,organicCounter,validateOrganicScope,type OrganicPlatform,type OrganicScope} from './organic-scope';
export {organicPlatforms,validateOrganicScope} from './organic-scope';
export type {OrganicPlatform} from './organic-scope';

export const organicContentLimit=organicReportLimit;
export type OrganicContentRecord=Pick<Row<'creatives'>,'id'|'organization_id'|'platform'|'account_id'|'external_id'|'kind'|'name'|'caption'|'published_at'|'synced_at'|'lifetime_metrics'>;
export type OrganicContentScope=OrganicScope;
export type OrganicContentItem={id:string;platform:OrganicPlatform;account:string;externalId:string;kind:string;caption:string|null;captionTruncated:boolean;publishedAt:string;collectedAt:string|null;snapshotValid:boolean;likes:number|null;comments:number|null;shares:number|null;saves:number|null};
export type OrganicContentReport={scope:OrganicContentScope;rows:OrganicContentItem[];received:number;truncated:boolean;limit:number};
function caption(value:unknown){if(typeof value!=='string'||!value.trim())return {text:null,truncated:false};let text=value.slice(0,2000);if(/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);return {text,truncated:text.length<value.length};}

/** Select by publication date; counters remain the latest stored lifetime snapshot. */
export function buildOrganicContentReport(records:readonly OrganicContentRecord[],scope:OrganicContentScope):OrganicContentReport{
 const {from,until,generated}=validateOrganicScope(scope);
 if(records.length>organicContentLimit+1)throw new Error('Organic report query exceeded its bounded window');
 const ids=new Set<string>(),keys=new Set<string>();
 const rows=records.map((record):OrganicContentItem=>{
  if(record.organization_id!==scope.organizationId||!organicPlatforms.includes(record.platform as OrganicPlatform)
   ||scope.platform!=='all'&&record.platform!==scope.platform)throw new Error('Organic content scope mismatch');
  if(!organicIdentifier(record.id)||!organicIdentifier(record.account_id)||!organicIdentifier(record.external_id))throw new Error('Organic source identity is missing');
  const key=JSON.stringify([record.platform,record.account_id,record.external_id]);
  if(ids.has(record.id)||keys.has(key))throw new Error('Duplicate organic content identity');
  ids.add(record.id);keys.add(key);
  const published=organicTimestamp(record.published_at);
  if(published===null||published<from||published>=until)throw new Error('Organic publication is outside the requested UTC interval');
  const collected=organicTimestamp(record.synced_at);
  const snapshotValid=collected!==null&&collected>=published&&collected<=generated;
  const metrics=snapshotValid&&record.lifetime_metrics&&typeof record.lifetime_metrics==='object'&&!Array.isArray(record.lifetime_metrics)?record.lifetime_metrics:{};
  const text=caption(record.caption??record.name);
  return {id:record.id,platform:record.platform as OrganicPlatform,account:record.account_id,externalId:record.external_id,kind:record.kind,
   caption:text.text,captionTruncated:text.truncated,publishedAt:new Date(published).toISOString(),
   collectedAt:snapshotValid?new Date(collected!).toISOString():null,snapshotValid,
   likes:organicCounter(metrics.likes),comments:organicCounter(metrics.comments),shares:organicCounter(metrics.shares),
   saves:record.platform==='instagram_organic'?organicCounter(metrics.saved):null};
 });
 rows.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
 return {scope:{...scope},rows:rows.slice(0,organicContentLimit),received:records.length,truncated:records.length>organicContentLimit,limit:organicContentLimit};
}
