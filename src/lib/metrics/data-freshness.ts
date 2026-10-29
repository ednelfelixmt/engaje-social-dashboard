export type Freshness = {status:'empty'|'recent'|'delayed'|'invalid';latest:string|null;daysOld:number|null};
/** Data age is measured against the tenant's business date, never the browser time zone. */
export function paidDataFreshness(dates:readonly string[],businessDate:string):Freshness{
 const valid=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 if(!valid(businessDate))return {status:'empty',latest:null,daysOld:null};
 const latest=dates.filter(v=>valid(v)&&v<=businessDate).sort().at(-1)??null;
 if(!latest)return {status:'empty',latest:null,daysOld:null};
 const daysOld=Math.floor((Date.parse(businessDate+'T00:00:00Z')-Date.parse(latest+'T00:00:00Z'))/86400000);
 return {status:daysOld<=2?'recent':'delayed',latest,daysOld};
}

/**
 * A deliberately selected historical interval is not evidence of delayed ingestion.
 * Diagnose freshness only when that interval ends on the tenant's current business date.
 * Invalid or future-only source batches are inconsistent, not a merely empty history.
 */
export function currentPeriodFreshness(dates:readonly string[],selectedTo:string,businessDate:string):Freshness|null{
 if(selectedTo!==businessDate||dates.length===0)return null;
 const result=paidDataFreshness(dates,businessDate);
 // Source dates that are impossible or future-dated indicate inconsistency,
 // even if no valid historical measurement survives filtering.
 // Keep the latest valid date and its age when a mixed batch is encountered.
 const inconsistent=dates.some(day=>
  !/^\d{4}-\d{2}-\d{2}$/.test(day)
  || !Number.isFinite(Date.parse(day+'T00:00:00Z'))
  || new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day
  || day>businessDate
 );
 if(inconsistent)return {...result,status:'invalid'};
 if(result.status==='empty')return result;
 return result.status==='recent'?null:result;
}
