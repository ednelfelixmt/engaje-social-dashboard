import type {PaidMetricKey} from './paid-metrics';

export type MetricGoal = 'awareness' | 'traffic' | 'lead_generation';
export type MetricUnit = 'money' | 'count' | 'percent';
export type MetricContract = Readonly<{
 id: PaidMetricKey;
 version: 1;
 label: string;
 goals: readonly MetricGoal[];
 kind: 'additive' | 'ratio';
 unit: MetricUnit;
 source: 'paid_ads';
 grain: 'platform_account_campaign_day';
 numerator: PaidMetricKey | null;
 denominator: PaidMetricKey | null;
 multiplier: number;
 zeroDenominator: 'unavailable';
 missingValue: 'unavailable';
 currency: 'source_currency_no_cross_currency_sum' | 'not_applicable';
 attribution: 'provider_reported_no_cross_platform_deduplication';
}>;

/** Contract metadata; calculations remain in paid-metrics.ts. No invented revenue/ROAS. */
export const PAID_METRIC_CONTRACTS = {
 spend: {label:'Investimento',goals:['awareness','traffic','lead_generation'],kind:'additive',unit:'money',numerator:null,denominator:null,multiplier:1},
 impressions: {label:'Impressões',goals:['awareness'],kind:'additive',unit:'count',numerator:null,denominator:null,multiplier:1},
 clicks: {label:'Cliques',goals:['traffic'],kind:'additive',unit:'count',numerator:null,denominator:null,multiplier:1},
 leads: {label:'Leads',goals:['lead_generation'],kind:'additive',unit:'count',numerator:null,denominator:null,multiplier:1},
 ctr: {label:'CTR',goals:['traffic'],kind:'ratio',unit:'percent',numerator:'clicks',denominator:'impressions',multiplier:100},
 cpc: {label:'CPC',goals:['traffic'],kind:'ratio',unit:'money',numerator:'spend',denominator:'clicks',multiplier:1},
 cpm: {label:'CPM',goals:['awareness'],kind:'ratio',unit:'money',numerator:'spend',denominator:'impressions',multiplier:1000},
 cpl: {label:'CPL',goals:['lead_generation'],kind:'ratio',unit:'money',numerator:'spend',denominator:'leads',multiplier:1},
} satisfies Record<PaidMetricKey,Pick<MetricContract,'label'|'goals'|'kind'|'unit'|'numerator'|'denominator'|'multiplier'>>;

export function getMetricContract(id:PaidMetricKey):MetricContract{
 const base=PAID_METRIC_CONTRACTS[id];
 return {id,version:1,...base,source:'paid_ads',grain:'platform_account_campaign_day',zeroDenominator:'unavailable',missingValue:'unavailable',currency:id==='spend'||id==='cpc'||id==='cpm'||id==='cpl'?'source_currency_no_cross_currency_sum':'not_applicable',attribution:'provider_reported_no_cross_platform_deduplication'};
}
