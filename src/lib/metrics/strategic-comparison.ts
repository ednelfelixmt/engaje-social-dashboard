import type {CampaignPerformance} from '@/types/domain';
import {computeDelta} from './delta';
import {isRfcOrganizationUuid} from './organization-scope';

type PeriodRow = Pick<CampaignPerformance, 'organizationId' | 'currency'>;
type Totals = Readonly<{spend:number|null;leads:number|null;cpl:number|null}>;

export type StrategicPeriodComparison = Readonly<{
  spendChange:number|null;
  leadChange:number|null;
  cplChange:number|null;
  hasComparableMetric:boolean;
  demandGrowthOutpacesSpend:boolean;
}>;

/**
 * Historical signals are only comparable across the same valid tenant and
 * source currency. A populated historical array alone is not evidence of a
 * usable comparison, and a declining lead count is never described as growth.
 * This is defense in depth; authentication, scoped queries and RLS remain
 * mandatory at the data boundary.
 */
export function strategicPeriodComparison(input: Readonly<{
  currentRows:readonly PeriodRow[];
  previousRows:readonly PeriodRow[];
  requestedCurrency:string;
  comparing:boolean;
  current:Totals;
  previous:Totals;
}>):StrategicPeriodComparison {
  const {currentRows,previousRows,requestedCurrency,comparing,current,previous}=input;
  const organizationId=currentRows[0]?.organizationId ?? '';
  const sameScope=comparing && currentRows.length>0 && previousRows.length>0
    && isRfcOrganizationUuid(organizationId) && /^[A-Z]{3}$/.test(requestedCurrency)
    && [...currentRows,...previousRows].every(row =>
      row.organizationId===organizationId && row.currency===requestedCurrency);
  const change=(now:number|null,old:number|null,metric:string):number|null =>
    sameScope ? (computeDelta(now,old,metric)?.change ?? null) : null;
  const spendChange=change(current.spend,previous.spend,'spend');
  const leadChange=change(current.leads,previous.leads,'leads');
  const cplChange=change(current.cpl,previous.cpl,'cpl');
  const hasComparableMetric=spendChange!==null || leadChange!==null || cplChange!==null;
  // An efficiency gain with fewer leads is not growth in demand.
  const demandGrowthOutpacesSpend=leadChange!==null && spendChange!==null
    && leadChange>0 && leadChange>spendChange+10;
  return {spendChange,leadChange,cplChange,hasComparableMetric,demandGrowthOutpacesSpend};
}
