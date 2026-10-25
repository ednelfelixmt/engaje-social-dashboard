export type Freshness = {status:'empty'|'recent'|'delayed';latest:string|null;daysOld:number|null};
/** Data age is measured against the tenant's business date, never the browser time zone. */
export function paidDataFreshness(dates:readonly string[],businessDate:string):Freshness{
 const valid=/^\d{4}-\d{2}-\d{2}$/;
 if(!valid.test(businessDate)||!Number.isFinite(Date.parse(businessDate+'T00:00:00Z')))return {status:'empty',latest:null,daysOld:null};
 const latest=dates.filter(v=>valid.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&v<=businessDate).sort().at(-1)??null;
 if(!latest)return {status:'empty',latest:null,daysOld:null};
 const daysOld=Math.floor((Date.parse(businessDate+'T00:00:00Z')-Date.parse(latest+'T00:00:00Z'))/86400000);
 return {status:daysOld<=2?'recent':'delayed',latest,daysOld};
}
