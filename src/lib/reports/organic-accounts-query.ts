import 'server-only';
import type {dashboardData} from '@/lib/metrics/query';
import {organicPlatforms,organicReportLimit,validateOrganicScope,type OrganicScope} from './organic-scope';
import type {OrganicAccountRecord} from './organic-accounts';

type ReportDb=Parameters<typeof dashboardData>[0];
export async function readOrganicAccounts(db:ReportDb,scope:OrganicScope):Promise<OrganicAccountRecord[]>{
 validateOrganicScope(scope);
 const {data,error}=await db.from('metrics_organic_accounts')
  .select('id,organization_id,metric_date,platform,account_id,source_period,synced_at,impressions,reach,interactions,followers,website_clicks')
  .eq('organization_id',scope.organizationId)
  .in('platform',scope.platform==='all'?[...organicPlatforms]:[scope.platform])
  .eq('source_period','day').gte('metric_date',scope.from).lte('metric_date',scope.to)
  .order('metric_date',{ascending:false}).order('platform').order('account_id').order('id')
  .range(0,organicReportLimit);
 if(error||!data)throw new Error('Organic account query failed');
 return data;
}
