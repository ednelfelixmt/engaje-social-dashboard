import {paidTotals,type PaidFact,type PaidTotals} from './paid-metrics';

export type PaidGrain = Readonly<{platform:string;accountId:string;campaignId:string;date:string;currency:string}>;
export type ReconciliationRow = PaidGrain & PaidFact;
export type ReconciliationResult = Readonly<{status:'ready';currency:string;totals:PaidTotals;rowCount:number} | {status:'empty'|'invalid'|'mixed_currency'|'duplicate_grain';reason:string}>;

/** Fail closed: do not silently de-duplicate conflicting campaign-day facts or convert currencies. */
export function reconcilePaidFacts(rows:readonly ReconciliationRow[]):ReconciliationResult {
 if(!rows.length)return {status:'empty',reason:'No source facts available'};
 const seen=new Set<string>();
 const currency=rows[0].currency;
 for(const row of rows){
  if(!row.platform||!row.accountId||!row.campaignId||!/^\\d{4}-\\d{2}-\\d{2}$/.test(row.date)||!/^\\w{3}$/.test(row.currency))
   return {status:'invalid',reason:'Malformed fact grain'};
  if(row.currency!==currency)return {status:'mixed_currency',reason:'Currency conversion is required upstream'};
  if(!Number.isFinite(row.spend)||row.spend<0||[row.impressions,row.clicks,row.leads].some(v=>v!==null&&(!Number.isFinite(v)||v<0)))
   return {status:'invalid',reason:'Invalid numeric fact'};
  const key=JSON.stringify([row.platform,row.accountId,row.campaignId,row.date,row.currency]);
  if(seen.has(key))return {status:'duplicate_grain',reason:'Repeated campaign-day fact'};
  seen.add(key);
 }
 const totals=paidTotals(rows);
 if(!Number.isFinite(totals.spend))return {status:'invalid',reason:'Numeric aggregation overflow'};
 return {status:'ready',currency,totals,rowCount:rows.length};
}
