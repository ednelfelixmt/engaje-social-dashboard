import type {Row} from '../../src/types/database.types';
import {buildAnalyticsWorkspace} from '../../src/lib/reports/analytics-workspace';
import {scope,fact,steps} from './funnel-report-fixture';
export {scope,fact,steps};
export const breakdown=(patch:Partial<Row<'metrics_ads_breakdowns'>>={})=>({id:'synthetic-demography',organization_id:scope.organizationId,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic-campaign',metric_date:'2026-10-20',currency:'BRL',dimension_type:'gender',dimension_value:'female',dimension_label:'Feminino',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads_breakdowns'>);
export const commercial=(patch:Partial<Row<'metrics_crm'>>={})=>({id:'synthetic-commercial',organization_id:scope.organizationId,source:'crm',metric_date:'2026-10-20',currency:'BRL',channel:'unattributed',account_id:'',campaign_id:'',revenue:500,purchases:1,leads:2,checkouts:3,is_complete:true,synced_at:'2026-10-29T12:00:00.000Z',...patch} as Row<'metrics_crm'>);
export const input=()=>({ads:[fact()],priorAds:[fact({id:'prior',metric_date:'2026-10-18',spend:80,impressions:800,clicks:40,leads:10})],breakdowns:[breakdown()],priorBreakdowns:[breakdown({id:'prior-demography',metric_date:'2026-10-18',impressions:800})],crm:[commercial()],priorCrm:[] as Row<'metrics_crm'>[],scope,steps});
export const model=()=>buildAnalyticsWorkspace(input());
