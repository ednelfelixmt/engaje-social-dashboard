import type {CampaignPerformance} from '@/types/domain';
export type Completeness = Readonly<{rows:number;missingLeads:number;missingClicks:number;missingImpressions:number}>;
/** Missing values must be visible to viewers rather than silently treated as zero. */
export function paidCompleteness(rows:readonly Pick<CampaignPerformance,'leads'|'clicks'|'impressions'>[]):Completeness{
 return {rows:rows.length,missingLeads:rows.filter(r=>r.leads==null).length,missingClicks:rows.filter(r=>r.clicks==null).length,missingImpressions:rows.filter(r=>r.impressions==null).length};
}

/** Report observed coverage; a missing value is not equivalent to a recorded zero. */
export function paidCoverage(rows:readonly Pick<CampaignPerformance,'leads'|'clicks'|'impressions'>[]){
 const info=paidCompleteness(rows);
 if(info.rows===0)return {leads:null,clicks:null,impressions:null};
 return {
  leads:(info.rows-info.missingLeads)/info.rows*100,
  clicks:(info.rows-info.missingClicks)/info.rows*100,
  impressions:(info.rows-info.missingImpressions)/info.rows*100,
 };
}
