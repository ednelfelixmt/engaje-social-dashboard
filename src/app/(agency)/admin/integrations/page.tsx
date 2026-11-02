import Link from 'next/link';
import {requireAdmin} from '@/lib/auth/session';
import {IntegrationCenter} from '@/components/admin/integration-center';
import {summarizeClientConnectionHealth} from '@/lib/integrations/operational-state';

export default async function Page({searchParams}:{searchParams?:Promise<Record<string,string|undefined>>}){
  const search=await searchParams??{};
  const {db}=await requireAdmin();
  const {data:workspaces,error}=await db.from('organizations').select('id,name,slug').eq('is_agency',false).eq('status','active').order('name');
  if(error)throw error;
  const organizations=workspaces??[];
  const {data:integrations,error:integrationError}=organizations.length
    ?await db.from('integrations').select('organization_id,external_account_id,status,is_enabled,last_synced_at,config').in('organization_id',organizations.map(row=>row.id))
    :{data:[],error:null};
  if(integrationError)throw integrationError;
  const summary=summarizeClientConnectionHealth(organizations.map(row=>row.id),integrations??[]);
  return <div className="admin-management space-y-6"><header className="admin-page-heading"><div><p className="eyebrow">Operação · Dados · Conexões</p><h1>Central de integrações</h1><p className="muted">Acompanhe a saúde agregada das conexões. Contas e ativos vinculados ficam exclusivamente no workspace do cliente.</p></div><Link className="admin-row-action" href="/admin/organizations">Gerenciar clientes →</Link></header>{search.authorization==='failed'?<p className="connection-result" role="alert">A autorização não foi concluída. Confira a configuração do aplicativo, as permissões e o cliente selecionado.</p>:null}<IntegrationCenter workspaces={organizations} summary={summary}/></div>;
}
