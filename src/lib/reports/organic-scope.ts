import {calendarDays} from '@/lib/metrics/calendar';

export const organicPlatforms=['facebook_organic','instagram_organic'] as const;
export type OrganicPlatform=typeof organicPlatforms[number];
export const organicReportLimit=500;
export type OrganicScope={organizationId:string;organizationName:string;organizationSlug:string;timezone:string;from:string;to:string;platform:'all'|OrganicPlatform;generatedAt:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Strict timezone-bearing timestamp. Calendar labels are a separate contract. */
export function organicTimestamp(value:unknown):number|null{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value))return null;
 try{calendarDays(value.slice(0,10),value.slice(0,10));}catch{return null;}
 // JavaScript accepts timezone offsets beyond any valid civil UTC offset.
 // Reject those instead of mislabelling an impossible source timestamp as verified.
 const offset=value.match(/[+-](\d{2}):(\d{2})$/);
 if(offset&&(Number(offset[1])>14||(offset[1]==='14'&&offset[2]!=='00')))return null;
 const ms=Date.parse(value);
 return Number.isFinite(ms)?ms:null;
}
export function validateOrganicScope(scope:OrganicScope){
 if(!uuid.test(scope.organizationId)||!['all',...organicPlatforms].includes(scope.platform))throw new Error('Invalid organic report scope');
 calendarDays(scope.from,scope.to);
 const generated=organicTimestamp(scope.generatedAt);
 if(generated===null)throw new Error('Invalid report generation timestamp');
 return {from:Date.parse(scope.from+'T00:00:00Z'),until:Date.parse(scope.to+'T00:00:00Z')+86400000,generated};
}
export function organicIdentifier(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0;}
export function organicCounter(value:unknown):number|null{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;}
