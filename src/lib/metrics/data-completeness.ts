import type {CampaignPerformance} from '@/types/domain';
export type Completeness = Readonly<{rows:number;missingLeads:number;missingClicks:number;missingImpressions:number}>;
/** Missing values must be visible to viewers rather than silently treated as zero. */
export function paidCompleteness(rows:readonly Pick<CampaignPerformance,'leads'|'clicks'|'impressions'>[]):Completeness{
 return {rows:rows.length,missingLeads:rows.filter(r=>r.leads==null).length,missingClicks:rows.filter(r=>r.clicks==null).length,missingImpressions:rows.filter(r=>r.impressions==null).length};
}
