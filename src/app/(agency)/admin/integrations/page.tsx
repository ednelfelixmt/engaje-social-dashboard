import Link from 'next/link';
import {AlertTriangle, ArrowUpRight, CheckCircle2, Plug, RefreshCw} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

const providerLabels: Record<string, string> = {
  meta_ads: 'Meta Ads',
  facebook_organic: 'Facebook orgânico',
  instagram_organic: 'Instagram orgânico',
  google_ads: 'Google Ads',
  google_business: 'Google Business Profile',
  youtube: 'YouTube',
  tiktok_ads: 'TikTok Ads',
  tiktok_organic: 'TikTok orgânico',
  windsor: 'Windsor.ai',
  stract: 'Stract',
};

export default async function Page() {
  const {db} = await requireAdmin();
  const [{data: organizations, error: organizationsError}, {data: integrations, error: integrationsError}] = await Promise.all([
    db.from('organizations').select('id,name,slug,status').eq('is_agency', false).order('name'),
    db.from('integrations').select('id,organization_id,provider,account_name,status,last_synced_at,last_error,updated_at').order('updated_at', {ascending: false}),
  ]);

  if (organizationsError) throw organizationsError;
  if (integrationsError) throw integrationsError;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Monitoramento da agência</p>
        <h1 className="text-3xl font-semibold">Saúde das integrações</h1>
        <p className="muted mt-2">Veja todos os clientes, inclusive os que ainda não conectaram nenhuma conta.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {organizations?.map((organization) => {
          const accounts = integrations?.filter((item) => item.organization_id === organization.id) ?? [];
          const connected = accounts.filter((item) => item.status === 'connected').length;
          const errors = accounts.filter((item) => item.status === 'error' || item.status === 'expired').length;

          return (
            <Card key={organization.id} className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{organization.name}</h2>
                  <p className="muted text-xs mt-1">{organization.status === 'active' ? 'Cliente ativo' : 'Cliente pausado'}</p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/${organization.slug}/settings/integrations`}>
                    Gerenciar <ArrowUpRight size={16} />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="integration-stat"><Plug size={17} /><strong>{accounts.length}</strong><span>contas</span></div>
                <div className="integration-stat text-emerald-300"><CheckCircle2 size={17} /><strong>{connected}</strong><span>ativas</span></div>
                <div className={`integration-stat ${errors ? 'text-red-300' : ''}`}><AlertTriangle size={17} /><strong>{errors}</strong><span>alertas</span></div>
              </div>

              {accounts.length ? (
                <div className="space-y-2">
                  {accounts.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.account_name}</p>
                        <p className="muted text-xs mt-1">{providerLabels[item.provider] ?? item.provider}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className={item.status === 'connected' ? 'text-emerald-300' : item.status === 'error' ? 'text-red-300' : 'text-amber-300'}>{item.status}</p>
                        <p className="muted mt-1">{item.last_synced_at ? new Date(item.last_synced_at).toLocaleString('pt-BR') : 'sem sincronização'}</p>
                      </div>
                    </div>
                  ))}
                  {accounts.length > 5 && <p className="muted text-xs">+ {accounts.length - 5} contas adicionais</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 p-5 text-center">
                  <RefreshCw className="mx-auto mb-3 text-zinc-500" size={22} />
                  <p className="text-sm">Nenhuma conta conectada</p>
                  <p className="muted text-xs mt-1">Abra o cliente para escolher uma plataforma ou extrator.</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {!organizations?.length && <Card><p className="muted py-8 text-center">Crie um cliente antes de configurar integrações.</p></Card>}
    </div>
  );
}
