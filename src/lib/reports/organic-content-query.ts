import 'server-only';
import type {dashboardData} from '@/lib/metrics/query';
import {organicContentLimit,organicPlatforms,validateOrganicScope,type OrganicContentScope,type OrganicContentRecord} from './organic-content';

type ReportDb=Parameters<typeof dashboardData>[0];
/** Session-scoped RLS client only; 501st row detects a visibly bounded report. */
export async function readOrganicContent(db:ReportDb,scope:OrganicContentScope):Promise<OrganicContentRecord[]>{
 const {until}=validateOrganicScope(scope);
 const query=db.from('creatives')
  .select('id,organization_id,platform,account_id,external_id,kind,name,caption,published_at,synced_at,lifetime_metrics')
  .eq('organization_id',scope.organizationId)
  .in('platform',scope.platform==='all'?[...organicPlatforms]:[scope.platform])
  .gte('published_at',scope.from+'T00:00:00.000Z').lt('published_at',new Date(until).toISOString())
  .order('published_at',{ascending:false}).order('id',{ascending:true});
 const {data,error}=await query.range(0,organicContentLimit);
 if(error||!data)throw new Error('Organic content query failed');
 return data;
}
