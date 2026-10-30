import Link from 'next/link';
import {requireAdmin} from '@/lib/auth/session';
import {IntegrationCenter} from '@/components/admin/integration-center';
import {visibleOperationalIntegration} from '@/lib/integrations/operational-state';

export default async function Page(){
  const {db}=await requireAdmin();
  const {data:workspaces,error}=await db.from('organizations').select('id,name,slug').eq('is_agency',false).eq('status','active').order('name');
  if(error)throw error;
  const organizations=workspaces??[];
  const {data:integrations,error:integrationError}=organizations.length?await db.from('integrations').select('id,organization_id,provider,external_account_id,account_name,status,is_enabled,last_synced_at,config').in('organization_id',organizations.map(row=>row.id)).order('account_name'):{data:[],error:null};
  if(integrationError)throw integrationError;
  return <div className="admin-management space-y-6"><header className="admin-page-heading"><div><p className="eyebrow">Operação · Dados · Conexões</p><h1>Central de integrações</h1><p className="muted">Acompanhe contas, autorizações e sincronizações por cliente.</p></div><Link className="admin-row-action" href="/admin/organizations">Gerenciar clientes →</Link></header><IntegrationCenter workspaces={organizations} connections={(integrations??[]).filter(visibleOperationalIntegration).flatMap(row=>{
    const org=organizations.find(org=>org.id===row.organization_id);
    return org?[{id:row.id,organizationId:org.id,organizationName:org.name,slug:org.slug,provider:row.provider,accountName:row.account_name,status:row.status,is_enabled:row.is_enabled,lastSyncedAt:row.last_synced_at}]:[];
  })}/></div>;
}
