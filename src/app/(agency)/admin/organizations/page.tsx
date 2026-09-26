import Link from 'next/link';
import {ArrowUpRight, Plug} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ActionForm} from '@/components/action-form';
import {ClientLifecycleControls} from '@/components/client-lifecycle-controls';
import {createOrganization, updateOrganization} from '../actions';

export default async function Page() {
  const {db} = await requireAdmin();
  const {data, error} = await db
    .from('organizations')
    .select('id,name,slug,status')
    .eq('is_agency', false)
    .order('name');

  if (error) throw error;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Gestão de workspaces</p>
        <h1 className="text-3xl font-semibold">Clientes</h1>
        <p className="muted mt-2">Crie o cliente e acesse o workspace para configurar suas contas e fontes de dados.</p>
      </div>

      <Card>
        <h2 className="text-lg mb-5">Criar workspace</h2>
        <ActionForm action={createOrganization} label="Criar cliente">
          <div className="field-grid">
            <label>Nome do cliente<input name="name" required /></label>
            <label>Endereço do dashboard<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="nome-do-cliente" /></label>
          </div>
        </ActionForm>
      </Card>

      {data?.map((organization) => (
        <Card key={organization.id}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{organization.name}</h2>
              <p className="muted text-sm mt-1">/{organization.slug}</p>
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
            </div>
          </ActionForm>
          <div className="mt-5 border-t border-white/10 pt-5">
            <ClientLifecycleControls organizationId={organization.id} organizationName={organization.name} />
          </div>
        </Card>
      ))}
    </div>
  );
}
