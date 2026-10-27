import 'server-only';
import type {dashboardData} from './query';
import {all} from './query';
import {validateQualityScope,type QualityScope,type QualityInput,type QualityIntegration,type QualityMetric,type QualityDimension} from './data-quality';
type Db=Parameters<typeof dashboardData>[0];
async function strictAll<T>(query:(a:number,b:number)=>PromiseLike<{data:T[]|null;error:unknown}>){
 return all<T>(async(a,b)=>{const result=await query(a,b);if(!result.error&&!Array.isArray(result.data))throw new Error('Quality source data unavailable');return result;});
}
export async function readDataQuality(db:Db,scope:QualityScope):Promise<QualityInput>{
 validateQualityScope(scope);
 const [integrations,metrics,dimensions,jobs]=await Promise.all([
  strictAll<QualityIntegration>((a,b)=>db.from('integrations').select('id,organization_id,provider,status,is_enabled').eq('organization_id',scope.organizationId).order('id').range(a,b)),
  strictAll<QualityMetric>((a,b)=>db.from('metrics_ads').select('id,organization_id,metric_date,platform,account_id,campaign_id,synced_at').eq('organization_id',scope.organizationId).order('id').range(a,b)),
  strictAll<QualityDimension>((a,b)=>db.from('metrics_ads_breakdowns').select('id,organization_id,platform,dimension_type').eq('organization_id',scope.organizationId).order('id').range(a,b)),
  db.from('sync_jobs').select('id,organization_id,status,created_at,started_at,completed_at,rows_processed').eq('organization_id',scope.organizationId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(12),
 ]);
 if(jobs.error||!jobs.data)throw new Error('Quality job query failed');
 return {integrations,metrics,dimensions,jobs:jobs.data};
}
