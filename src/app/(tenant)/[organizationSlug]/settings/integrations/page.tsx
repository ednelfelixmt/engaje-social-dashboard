import {Activity, Cable, CheckCircle2, Clock3, Database, Facebook, Instagram, TriangleAlert} from 'lucide-react';
import {tenant} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {IntegrationControls} from '@/components/integration-controls';
import {ExtractorSetup} from '@/components/extractor-setup';

const labels: Record<string, string> = {
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

const statusLabels: Record<string, string> = {
  connected: 'Conectada',
  syncing: 'Sincronizando',
  pending: 'Aguardando configuração',
  disconnected: 'Desconectada',
  error: 'Com erro',
  expired: 'Autorização expirada',
};

function StatusIcon({status}: {status: string}) {
  if (status === 'connected') return <CheckCircle2 className="text-emerald-400" size={17} />;
  if (status === 'syncing' || status === 'pending') return <Clock3 className="text-amber-300" size={17} />;
  return <TriangleAlert className="text-red-400" size={17} />;
}

export default async function Page({params, searchParams}: {params: {organizationSlug: string}; searchParams: Record<string, string | undefined>}) {
  const {db, org} = await tenant(params.organizationSlug);
  const {data, error} = await db
    .from('integrations')
    .select('id,provider,account_name,status,is_enabled,last_synced_at,last_error,config')
    .eq('organization_id', org.id)
    .order('created_at', {ascending: false});

  if (error) throw error;

  const connected = data.filter((item) => item.status === 'connected').length;
  const attention = data.filter((item) => ['error', 'expired', 'pending'].includes(item.status)).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">{org.name}</p>
        <h1 className="text-3xl font-semibold">Integradores</h1>
        <p className="muted mt-2 max-w-3xl">Conecte cada conta ao cliente correto. Credenciais ficam no Supabase e todos os dados importados recebem o organization_id deste workspace.</p>
      </div>

      {searchParams.connected && <Card className="border-emerald-500/40 bg-emerald-500/5 text-emerald-300">Autorização recebida. {searchParams.connected} conta(s) encontrada(s). Escolha abaixo quais devem sincronizar.</Card>}
      {searchParams.error && <Card className="border-red-500/40 bg-red-500/5 text-red-300">A conexão não foi concluída. Verifique as permissões e tente novamente.</Card>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4"><Cable className="text-primary" /><div><strong className="text-xl">{data.length}</strong><p className="muted text-xs">contas cadastradas</p></div></Card>
        <Card className="flex items-center gap-4 p-4"><CheckCircle2 className="text-emerald-400" /><div><strong className="text-xl">{connected}</strong><p className="muted text-xs">conectadas</p></div></Card>
        <Card className="flex items-center gap-4 p-4"><TriangleAlert className={attention ? 'text-amber-300' : 'text-zinc-500'} /><div><strong className="text-xl">{attention}</strong><p className="muted text-xs">precisam de atenção</p></div></Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">APIs oficiais</h2>
          <p className="muted text-sm mt-1">Recomendadas para Meta e, quando as credenciais forem aprovadas, TikTok.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="integration-card">
            <div className="integration-brand"><Activity className="text-blue-400" /><div><h3>Meta Ads</h3><p>Campanhas, custos, conversões e criativos</p></div></div>
            <IntegrationControls organizationId={org.id} provider="meta_ads" />
          </Card>
          <Card className="integration-card">
            <div className="integration-brand"><Facebook className="text-blue-500" /><div><h3>Facebook orgânico</h3><p>Posts, imagens e engajamento da página</p></div></div>
            <IntegrationControls organizationId={org.id} provider="facebook_organic" />
          </Card>
          <Card className="integration-card">
            <div className="integration-brand"><Instagram className="text-pink-400" /><div><h3>Instagram orgânico</h3><p>Publicações, vídeos e desempenho orgânico</p></div></div>
            <IntegrationControls organizationId={org.id} provider="instagram_organic" />
          </Card>
          <Card className="integration-card">
            <div className="integration-brand"><Activity className="text-cyan-300" /><div><h3>TikTok Ads</h3><p>OAuth preparado; requer aplicativo TikTok aprovado</p></div></div>
            <IntegrationControls organizationId={org.id} provider="tiktok_ads" />
          </Card>
          <Card className="integration-card">
            <div className="integration-brand"><Activity className="text-cyan-300" /><div><h3>TikTok orgânico</h3><p>OAuth preparado; requer acesso à API TikTok</p></div></div>
            <IntegrationControls organizationId={org.id} provider="tiktok_organic" />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Extratores e unificadores</h2>
          <p className="muted text-sm mt-1">Use uma fonte por plataforma para evitar duplicar investimento, conversões e alcance.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="integration-brand"><Database className="text-indigo-300" /><div><h3>Windsor.ai</h3><p>Definido para Google Ads, Google Business Profile e YouTube</p></div></div>
            <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-xs muted">A API key central da agência permanece protegida no Supabase. Cada conta é vinculada separadamente ao cliente.</div>
            <ExtractorSetup organizationId={org.id} provider="windsor" />
          </Card>
          <Card>
            <div className="integration-brand"><Database className="text-orange-300" /><div><h3>Stract</h3><p>Alternativa de extração com destino Supabase</p></div></div>
            <div className="mt-4 rounded-xl bg-white/[0.03] p-3 text-xs muted">A Stract envia os dados ao Supabase. O cadastro abaixo registra a origem e mantém o status por cliente.</div>
            <ExtractorSetup organizationId={org.id} provider="stract" />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Contas deste cliente</h2>
          <p className="muted text-sm mt-1">Somente estas contas poderão alimentar o dashboard de {org.name}.</p>
        </div>
        {data.length ? (
          <div className="grid gap-3">
            {data.map((item) => {
              const config = item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config as Record<string, unknown> : {};
              const source = typeof config.source_platform === 'string' ? labels[config.source_platform] ?? config.source_platform : null;
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <StatusIcon status={item.status} />
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{item.account_name}</h3>
                        <p className="muted text-xs mt-1">{labels[item.provider] ?? item.provider}{source ? ` · ${source}` : ''} · {statusLabels[item.status] ?? item.status}</p>
                        <p className="muted text-xs mt-1">Última sincronização: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString('pt-BR') : 'ainda não realizada'}</p>
                        {item.last_error && <p className="text-red-300 text-xs mt-2">{item.last_error}</p>}
                      </div>
                    </div>
                    {item.status !== 'pending' && <IntegrationControls organizationId={org.id} integrationId={item.id} enabled={item.is_enabled} />}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed text-center"><p>Nenhuma conta conectada a este cliente.</p><p className="muted text-sm mt-2">Escolha uma API oficial ou configure um extrator acima.</p></Card>
        )}
      </section>
    </div>
  );
}
