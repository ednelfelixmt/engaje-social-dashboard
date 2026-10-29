import {paidTotals,type PaidFact,type PaidTotals} from './paid-metrics';

export type PaidGrain = Readonly<{platform:string;accountId:string;campaignId:string;date:string;currency:string}>;
export type ReconciliationRow = PaidGrain & PaidFact;
export type ReconciliationResult = Readonly<{status:'ready';currency:string;totals:PaidTotals;rowCount:number} | {status:'empty'|'invalid'|'mixed_currency'|'duplicate_grain';reason:string}>;

/** Reject impossible calendar dates at the reconciliation boundary, not only on ingestion. */
function validCalendarDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}

/** A padded or whitespace-only provider identity is not a distinct campaign grain. */
function validGrainIdentifier(value: string): boolean {
 return typeof value === 'string' && value.trim().length > 0 && value === value.trim();
}

/** Fail closed: do not silently de-duplicate conflicting campaign-day facts or convert currencies. */
export function reconcilePaidFacts(rows:readonly ReconciliationRow[]):ReconciliationResult {
 if(!rows.length)return {status:'empty',reason:'No source facts available'};
 const seen=new Set<string>();
 const currency=rows[0].currency;
 for(const row of rows){
  // Only Meta's act_ prefix is an alias; other providers may use it literally.
  // Evaluate the canonical identifier before validating the grain to reject 'act_' alone.
  const accountId = row.platform === 'meta_ads' && row.accountId
    ? row.accountId.replace(/^act_/, '') : row.accountId;
  if(!validGrainIdentifier(row.platform)||!validGrainIdentifier(row.accountId)||!validGrainIdentifier(accountId)
    ||(row.platform==='meta_ads'&&accountId.startsWith('act_'))
    ||!validGrainIdentifier(row.campaignId)||!validCalendarDate(row.date)||!/^[A-Z]{3}$/.test(row.currency))
   return {status:'invalid',reason:'Malformed fact grain'};
  if(row.currency!==currency)return {status:'mixed_currency',reason:'Currency conversion is required upstream'};
  if(!Number.isFinite(row.spend)||row.spend<0||[row.impressions,row.clicks,row.leads].some(v=>v!==null&&(!Number.isFinite(v)||v<0)))
   return {status:'invalid',reason:'Invalid numeric fact'};
  const key=JSON.stringify([row.platform,accountId,row.campaignId,row.date,row.currency]);
  if(seen.has(key))return {status:'duplicate_grain',reason:'Repeated campaign-day fact'};
  seen.add(key);
 }
 const totals=paidTotals(rows);
 if(totals.spend===null)return {status:'invalid',reason:'Numeric spend aggregation overflow'};
 // Complete source columns that overflow cannot be represented as missing data.
 for(const key of ['impressions','clicks','leads'] as const){
  if(rows.every(row=>row[key]!==null)&&totals[key]===null)
   return {status:'invalid',reason:'Numeric '+key+' aggregation overflow'};
 }
 return {status:'ready',currency,totals,rowCount:rows.length};
}
