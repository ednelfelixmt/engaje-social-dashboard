import type {ReactNode} from 'react';
import {Activity, Blocks, Cable, CheckCircle2, Clock3, Database, Facebook, Instagram, LineChart, MessageSquareText, TriangleAlert, Webhook} from 'lucide-react';
import {tenant} from '@/lib/auth/session';
import {connectorCatalog, connectorByProvider, type ConnectorDefinition} from '@/lib/integrations/catalog';
import {Card} from '@/components/ui/card';
import {IntegrationControls} from '@/components/integration-controls';
import {ExtractorSetup} from '@/components/extractor-setup';
import {FoundationConnector} from '@/components/foundation-connector';
import {IngestEndpoint} from '@/components/ingest-endpoint';

const statusLabels: Record<string, string> = {connected: 'Conectada', syncing: 'Sincronizando', pending: 'Base preparada', disconnected: 'Desconectada', error: 'Com erro', expired: 'Autorização expirada'};
const icons: Record<string, ReactNode> = {
  meta_ads: <LineChart className="text-blue-400" />, facebook_organic: <Facebook className="text-blue-500" />,
  instagram_organic: <Instagram className="text-pink-400" />, tiktok_ads: <Activity className="text-cyan-300" />,
  tiktok_organic: <Activity className="text-cyan-300" />, windsor: <Database className="text-indigo-300" />,
  stract: <Database className="text-orange-300" />, hubspot: <MessageSquareText className="text-orange-400" />,
  rd_station: <Blocks className="text-teal-300" />, generic_crm: <Webhook className="text-zinc-300" />,
};

function StatusIcon({status}: {status: string}) {
  if (status === 'connected') return <CheckCircle2 className="text-emerald-400" size={17} />;
  if (status === 'syncing' || status === 'pending') return <Clock3 className="text-amber-300" size={17} />;
  return <TriangleAlert className="text-red-400" size={17} />;
}

function StageBadge({stage}: Pick<ConnectorDefinition, 'stage'>) {
  return <span className={`connector-badge connector-badge-${stage}`}>{stage === 'live' ? 'Operacional' : 'Base pronta'}</span>;
}

function ConnectorCard({connector, organizationId, prepared}: {connector: ConnectorDefinition; organizationId: string; prepared: boolean}) {
  return (
    <Card className="integration-card">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="integration-brand">{icons[connector.provider]}<div><h3>{connector.name}</h3><p>{connector.description}</p></div></div>
          <StageBadge stage={connector.stage} />
        </div>
        <div className="flex flex-wrap gap-2">{connector.capabilities.map((capability) => <span className="connector-capability" key={capability}>{capability}</span>)}</div>
      </div>
      {connector.stage === 'live'
        ? <IntegrationControls organizationId={organizationId} provider={connector.provider} />
        : <FoundationConnector organizationId={organizationId} provider={connector.provider} prepared={prepared} />}
    </Card>
  );
}

export default async function Page({params, searchParams}: {params: {organizationSlug: string}; searchParams: Record<string, string | undefined>}) {
  const {db, org} = await tenant(params.organizationSlug);
  const {data, error} = await db.from('integrations').select('id,provider,account_name,status,is_enabled,last_synced_at,last_error,config').eq('organization_id', org.id).order('created_at', {ascending: false});
  if (error) throw error;
  const integrations = data ?? [];
  const connected = integrations.filter((item) => item.status === 'connected').length;
  const attention = integrations.filter((item) => ['error', 'expired'].includes(item.status)).length;
  const preparedProviders = new Set(integrations.map((item) => item.provider));
  const official = connectorCatalog.filter((item) => item.group === 'official');
  const crms = connectorCatalog.filter((item) => item.group === 'crm');

  return (
    <div className="space-y-8">
      <header><p className="eyebrow mb-2">{org.name}</p><h1 className="text-3xl font-semibold">Central de integradores</h1><p className="muted mt-2 max-w-3xl">Conectores organizados por estágio real. Toda conta pertence exclusivamente a este workspace e os segredos permanecem no backend do Supabase.</p></header>
      {searchParams.connected ? <Card className="border-emerald-500/40 bg-emerald-500/5 text-emerald-300">Autorização recebida. {searchParams.connected} conta(s) encontrada(s). Ative cada conta pela lista inferior.</Card> : null}
      {searchParams.error ? <Card className="border-red-500/40 bg-red-500/5 text-red-300">A conexão não foi concluída. Verifique permissões e credenciais.</Card> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4"><Cable className="text-primary" /><div><strong className="text-xl">{integrations.length}</strong><p className="muted text-xs">registros de integração</p></div></Card>
        <Card className="flex items-center gap-4 p-4"><CheckCircle2 className="text-emerald-400" /><div><strong className="text-xl">{connected}</strong><p className="muted text-xs">contas conectadas</p></div></Card>
        <Card className="flex items-center gap-4 p-4"><TriangleAlert className={attention ? 'text-red-300' : 'text-zinc-500'} /><div><strong className="text-xl">{attention}</strong><p className="muted text-xs">exigem atenção</p></div></Card>
      </div>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Plataformas oficiais</h2><p className="muted mt-1 text-sm">Meta está operacional. TikTok fica registrado e pronto para receber OAuth e sincronização na etapa de homologação.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{official.map((connector) => <ConnectorCard connector={connector} organizationId={org.id} prepared={preparedProviders.has(connector.provider)} key={connector.provider} />)}</div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Extratores e serviços Google</h2><p className="muted mt-1 text-sm">Uma única fonte por plataforma evita duplicidade de investimento e conversões.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card><div className="mb-4 flex items-start justify-between gap-3"><div className="integration-brand">{icons.windsor}<div><h3>Windsor.ai</h3><p>Google Ads operacional; Google Business e YouTube com base registrada.</p></div></div><StageBadge stage="live" /></div><ExtractorSetup organizationId={org.id} provider="windsor" /></Card>
          <Card><div className="mb-4 flex items-start justify-between gap-3"><div className="integration-brand">{icons.stract}<div><h3>Stract</h3><p>Destino Supabase e contas por cliente preparados para a carga externa.</p></div></div><StageBadge stage="foundation" /></div><ExtractorSetup organizationId={org.id} provider="stract" /></Card>
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">CRM e receita real</h2><p className="muted mt-1 text-sm">Bases preparadas para que ROAS e ROI usem vendas reais quando a integração for finalizada.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{crms.map((connector) => <ConnectorCard connector={connector} organizationId={org.id} prepared={preparedProviders.has(connector.provider)} key={connector.provider} />)}</div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Contas e bases deste cliente</h2><p className="muted mt-1 text-sm">Somente integrações desta lista podem alimentar o dashboard de {org.name}.</p></div>
        {integrations.length ? <div className="grid gap-3">{integrations.map((item) => {
          const config = item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config as Record<string, unknown> : {};
          const sourceKey = typeof config.source_platform === 'string' ? config.source_platform : null;
          const source = sourceKey ? connectorByProvider.get(sourceKey as never)?.name ?? sourceKey : null;
          const definition = connectorByProvider.get(item.provider);
          const supportsIngest = item.provider === 'stract' || item.provider === 'generic_crm';
          const ingestConfigured = typeof config.ingest_key_hash === 'string';
          return <Card key={item.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><StatusIcon status={item.status} /><div className="min-w-0"><h3 className="truncate font-semibold">{item.account_name}</h3><p className="muted mt-1 text-xs">{definition?.name ?? item.provider}{source ? ` · ${source}` : ''} · {statusLabels[item.status] ?? item.status}</p><p className="muted mt-1 text-xs">Última sincronização: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString('pt-BR') : 'ainda não realizada'}</p>{item.last_error ? <p className="mt-2 text-xs text-red-300">{item.last_error}</p> : null}{supportsIngest ? <IngestEndpoint organizationId={org.id} integrationId={item.id} configured={ingestConfigured} /> : null}</div></div>{item.status !== 'pending' && !supportsIngest ? <IntegrationControls organizationId={org.id} integrationId={item.id} enabled={item.is_enabled} /> : <span className="connector-badge connector-badge-foundation">{ingestConfigured ? 'Endpoint preparado' : 'Aguardando credenciais'}</span>}</div></Card>;
        })}</div> : <Card className="border-dashed text-center"><p>Nenhuma integração preparada neste cliente.</p><p className="muted mt-2 text-sm">Conecte uma conta operacional ou prepare um dos conectores acima.</p></Card>}
      </section>
    </div>
  );
}
