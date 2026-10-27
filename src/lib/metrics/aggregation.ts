/**
 * Pure, fail-closed aggregations for campaign and dashboard metrics.
 * No implicit currency conversion or conversion of missing values to zero.
 */
/** Only revenue and conversion value can be signed (refunds/adjustments).
 * Spend and event counts cannot be offset by negative observations.
 */
const signedMonetaryKeys = new Set(['revenue', 'conversion_value']);

export function sum(rows:readonly Record<string,unknown>[],key:string):number|null {
  if(rows.length===0)return null;
  let total=0;
  for(const row of rows){
    const value=row[key];
    if(typeof value!=='number'||!Number.isFinite(value)||(!signedMonetaryKeys.has(key)&&value<0))return null;
    total+=value;
    if(!Number.isFinite(total))return null;
  }
  return total;
}

export function finiteRatio(numerator:number|null,denominator:number|null,multiplier=1):number|null {
  if(numerator==null||denominator==null||!Number.isFinite(numerator)||!Number.isFinite(denominator)||!Number.isFinite(multiplier)||denominator<=0)return null;
  let result=numerator/denominator*multiplier;
  // Underflow can erase a measured nonzero value (for example a positive cost
  // wrongly rendered as free). Scale first only when the normal path returned
  // zero; preserve its existing rounding for ordinary observations.
  if(result===0&&numerator!==0&&multiplier>1){
    const scaled=numerator*multiplier;
    if(Number.isFinite(scaled))result=scaled/denominator;
  }
  return Number.isFinite(result)&&(result!==0||numerator===0)?result:null;
}

/** Ad spend is not total business cost; revenue minus ad spend is not ROI. */
export function totals<T>(rows:T[]){
  const records=rows as Record<string,unknown>[];
  const spend=sum(records,'spend'),revenue=sum(records,'revenue'),purchases=sum(records,'purchases');
  return {spend,revenue,purchases,roas:finiteRatio(revenue,spend),roi:null,cpa:finiteRatio(spend,purchases)};
}
