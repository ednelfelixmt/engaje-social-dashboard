import Link from 'next/link';
import {ArrowUpRight, ChevronDown, Plug} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ClientLifecycleControls} from '@/components/client-lifecycle-controls';
import {ActionForm} from '@/components/action-form';
import {createOrganization, updateOrganization} from '../actions';
import {businessNiches, salesModels, suggestFunnelModel, funnelPresetFor, type BusinessNiche, type SalesModel} from '@/lib/metrics/funnel-config';
import {currencyOptions, timezoneOptions} from '@/lib/organization-options';
import {AdminCollection} from '@/components/admin/collection';
import {ClientLogo} from '@/components/client-logo';

export default async function Page() {
  const {db} = await requireAdmin();
  const {data, error} = await db
    .from('organizations')
    .select('id,name,slug,status,niche,sales_model,timezone,currency')
    .eq('is_agency', false)
    .order('name');

  if (error) throw error;
  const [{data:branding,error:brandingError},{data:connections,error:connectionsError}]=await Promise.all([
    db.from('branding').select('organization_id,logo_path'),
    db.from('integrations').select('organization_id,status,is_enabled').eq('is_enabled',true),
  ]);
  if(brandingError||connectionsError)throw brandingError??connectionsError;
  const logos=new Map(await Promise.all((data??[]).map(async org=>{
    const path=branding?.find(row=>row.organization_id===org.id)?.logo_path;
    return [org.id,path?(await db.storage.from('branding').createSignedUrl(path,3600)).data?.signedUrl??null:null] as const;
  })));

  return (
    <div className="admin-management space-y-6">
      <div>
        <p className="eyebrow mb-2">Gestão de workspaces</p>
        <h1 className="text-3xl font-semibold">Clientes</h1>
        <p className="muted mt-2">Administre os clientes existentes. Cadastre clientes aqui e depois associe integrações e usuários.</p>
      </div>

      <div className="admin-summary-grid"><Card><span>Clientes em operação</span><strong>{data?.filter(o=>o.status==='active').length??0}</strong></Card><Card><span>Pausados</span><strong>{data?.filter(o=>o.status==='paused').length??0}</strong></Card><Card><span>Com conexão habilitada</span><strong>{new Set(connections?.filter(c=>c.status==='connected').map(c=>c.organization_id)).size}</strong></Card></div>
      <Card><details className="admin-create"><summary><div><h2>Cadastrar novo cliente</h2><p>Nome, segmento e modelo comercial. Acesso de clientes é somente leitura.</p></div><span>+ Novo cliente</span></summary><div className="pt-5"><ActionForm action={createOrganization} label="Cadastrar cliente"><div className="field-grid"><label>Nome do cliente<input name="name" minLength={2} maxLength={160} required placeholder="Nome do cliente" /></label><label>Endereço do workspace<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="nome-do-cliente" /><span className="muted text-xs">Letras minúsculas, números e hífens.</span></label><label>Segmento<select name="niche" required defaultValue=""><option value="" disabled>Selecionar segmento</option>{businessNiches.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Modelo comercial<select name="sales_model" required defaultValue=""><option value="" disabled>Selecionar modelo</option>{salesModels.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div></ActionForm><p className="muted mt-4 text-xs">Depois do cadastro, libere o acesso em <Link href="/admin/users" className="text-primary underline">Usuários e permissões</Link>.</p></div></details></Card>

      <AdminCollection label="clientes" statuses={[{value:'active',label:'Ativos'},{value:'paused',label:'Pausados'}]} entries={(data??[]).map((organization) => ({id:organization.id,name:organization.name,status:organization.status,search:organization.slug,content:
        <details className="admin-client-row" name="client-management">
          <summary><ClientLogo name={organization.name} url={logos.get(organization.id)}/><div><strong>{organization.name}</strong><small>/{organization.slug}</small></div><span className={`admin-status ${organization.status==='active'?'is-good':''}`}>{organization.status==='active'?'Ativo':'Pausado'}</span><span className="admin-client-meta">{organization.currency} · {organization.timezone}</span><span className="admin-client-meta">{connections?.filter(c=>c.organization_id===organization.id&&c.status==='connected').length??0} conexão(ões)</span><span className="admin-client-edit">Gerenciar <ChevronDown size={16}/></span></summary>
          <div className="admin-client-editor"><div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{organization.name}</h2>
              <p className="muted text-sm mt-1">/{organization.slug}{organization.niche && organization.sales_model ? ` · funil sugerido: ${funnelPresetFor(suggestFunnelModel(organization.niche as BusinessNiche, organization.sales_model as SalesModel)).label}` : ''}</p>
            </div>
            <div className="admin-client-actions">
              <Button asChild variant="outline"><Link href={'/admin/organizations/'+organization.id+'/activity'}>Histórico de alterações</Link></Button>
              <Button asChild variant="outline">
                <Link href={`/${organization.slug}/settings/branding`}>Logo e identidade</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${organization.slug}/settings/integrations`}>
                  <Plug size={16} /> Configurar integrações
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${organization.slug}/overview`}>
                  Abrir workspace <ArrowUpRight size={16} />
                </Link>
              </Button>
            </div>
          </div>

          <ActionForm action={updateOrganization}>
            <input type="hidden" name="id" value={organization.id} />
            <div className="field-grid">
              <label>Nome<input name="name" defaultValue={organization.name} required /></label>
              <label>Status<select name="status" defaultValue={organization.status}><option value="active">Ativo</option><option value="paused">Pausado</option></select></label>
              <label>Nicho<select name="niche" defaultValue={organization.niche ?? ''}><option value="">Não informado</option>{businessNiches.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label>Modelo de vendas<select name="sales_model" defaultValue={organization.sales_model ?? ''}><option value="">Não informado</option>{salesModels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label>Fuso horário<select name="timezone" defaultValue={organization.timezone}>{timezoneOptions.some((item) => item.id === organization.timezone) ? null : <option value={organization.timezone}>{organization.timezone}</option>}{timezoneOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label>Moeda<select name="currency" defaultValue={organization.currency}>{currencyOptions.some((item) => item.id === organization.currency) ? null : <option value={organization.currency}>{organization.currency}</option>}{currencyOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            </div>
            <label className="mt-4 !flex-row items-center gap-3 text-sm"><input type="checkbox" name="apply_funnel" className="size-4" /><span>Aplicar o funil sugerido para o nicho e o modelo de vendas (substitui as etapas atuais do funil deste cliente)</span></label>
            <p className="muted mt-2 text-xs">Alterar a moeda muda quais dados aparecem no dashboard: os números são separados por moeda e nunca misturados.</p>
          </ActionForm>
          <div className="mt-5 border-t border-white/10 pt-5">
            <ClientLifecycleControls organizationId={organization.id} organizationName={organization.name} />
          </div>
          </div>
        </details>
      }))}/>
    </div>
  );
}
