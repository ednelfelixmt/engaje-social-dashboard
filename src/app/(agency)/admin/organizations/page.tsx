import Link from 'next/link';
import {ArrowUpRight, Plug} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ClientLifecycleControls} from '@/components/client-lifecycle-controls';
import {ActionForm} from '@/components/action-form';
import {updateOrganization} from '../actions';
import {businessNiches, salesModels, suggestFunnelModel, funnelPresetFor, type BusinessNiche, type SalesModel} from '@/lib/metrics/funnel-config';
import {currencyOptions, timezoneOptions} from '@/lib/organization-options';

export default async function Page() {
  const {db} = await requireAdmin();
  const {data, error} = await db
    .from('organizations')
    .select('id,name,slug,status,niche,sales_model,timezone,currency')
    .eq('is_agency', false)
    .order('name');

  if (error) throw error;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Gestão de workspaces</p>
        <h1 className="text-3xl font-semibold">Clientes</h1>
        <p className="muted mt-2">Administre os clientes existentes. Novos clientes são cadastrados no início do fluxo de Integrações.</p>
      </div>

      {data?.map((organization) => (
        <Card key={organization.id}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{organization.name}</h2>
              <p className="muted text-sm mt-1">/{organization.slug}{organization.niche && organization.sales_model ? ` · funil sugerido: ${funnelPresetFor(suggestFunnelModel(organization.niche as BusinessNiche, organization.sales_model as SalesModel)).label}` : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
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
        </Card>
      ))}
    </div>
  );
}
