export type Freshness = {status:'empty'|'recent'|'delayed';latest:string|null;daysOld:number|null};
/** Data age is measured against the tenant's business date, never the browser time zone. */
export function paidDataFreshness(dates:readonly string[],businessDate:string):Freshness{
 const valid=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 if(!valid(businessDate))return {status:'empty',latest:null,daysOld:null};
 const latest=dates.filter(v=>valid(v)&&v<=businessDate).sort().at(-1)??null;
 if(!latest)return {status:'empty',latest:null,daysOld:null};
 const daysOld=Math.floor((Date.parse(businessDate+'T00:00:00Z')-Date.parse(latest+'T00:00:00Z'))/86400000);
 return {status:daysOld<=2?'recent':'delayed',latest,daysOld};
}
