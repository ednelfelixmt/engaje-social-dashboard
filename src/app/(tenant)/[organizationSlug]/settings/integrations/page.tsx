import type {ReactNode} from 'react';
import {Activity, Blocks, Cable, CheckCircle2, Database, Facebook, Instagram, LineChart, MessageSquareText, TriangleAlert, Webhook} from 'lucide-react';
import {tenant} from '@/lib/auth/session';
import {connectorCatalog, connectorByProvider, type ConnectorDefinition} from '@/lib/integrations/catalog';
import {Card} from '@/components/ui/card';
import {IntegrationControls} from '@/components/integration-controls';
import {ExtractorSetup} from '@/components/extractor-setup';
import {FoundationConnector} from '@/components/foundation-connector';
import {IntegrationDiagnostics} from '@/components/integration-diagnostics';
import {MetaAccountSelector} from '@/components/meta-account-selector';
import {IntegrationAccountCard} from '@/components/integration-account-card';
import {PlatformAssetSelector} from '@/components/platform-asset-selector';
import {ClientPlatformAssets} from '@/components/client-platform-assets';

const icons: Record<string, ReactNode> = {
  meta_ads: <LineChart className="text-blue-400" />, facebook_organic: <Facebook className="text-blue-500" />,
  instagram_organic: <Instagram className="text-pink-400" />, tiktok_ads: <Activity className="text-cyan-300" />,
  tiktok_organic: <Activity className="text-cyan-300" />, windsor: <Database className="text-indigo-300" />,
  stract: <Database className="text-orange-300" />, hubspot: <MessageSquareText className="text-orange-400" />,
  rd_station: <Blocks className="text-teal-300" />, generic_crm: <Webhook className="text-zinc-300" />,
};

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
      <p className="muted text-xs">A conta só será vinculada após você selecioná-la e confirmar o cliente.</p>
      {connector.stage === 'live'
        ? <IntegrationControls organizationId={organizationId} provider={connector.provider} />
        : <FoundationConnector organizationId={organizationId} provider={connector.provider} prepared={prepared} />}
    </Card>
  );
}

export default async function Page({params, searchParams}: {params: {organizationSlug: string}; searchParams: Record<string, string | undefined>}) {
  const {db, org} = await tenant(params.organizationSlug);
  const [{data, error}, {data: assignmentRows, error: assignmentError}] = await Promise.all([
    db.from('integrations').select('id,provider,external_account_id,account_name,status,is_enabled,last_synced_at,last_error,config,updated_at').eq('organization_id', org.id).order('created_at', {ascending: false}),
    db.from('client_asset_assignments').select('id,asset_id,integration_id,sync_enabled').eq('organization_id', org.id).eq('assignment_status', 'assigned').order('assigned_at', {ascending: false}),
  ]);
  if (error) throw error;
  if (assignmentError) throw assignmentError;
  const assignedIds = (assignmentRows ?? []).map((item) => item.asset_id);
  const {data: assignedAssetRows, error: assignedAssetError} = assignedIds.length ? await db.from('platform_assets').select('id,name,external_id,asset_type').in('id', assignedIds) : {data: [], error: null};
  if (assignedAssetError) throw assignedAssetError;
  const connectionId = searchParams.connection_id && /^[0-9a-f-]{36}$/.test(searchParams.connection_id) ? searchParams.connection_id : null;
  const {data: discoveredRows, error: discoveredError} = connectionId ? await db.from('platform_assets').select('id,name,external_id,asset_type,asset_status,recommended').eq('connection_id', connectionId).order('asset_type').order('name') : {data: [], error: null};
  if (discoveredError) throw discoveredError;
  const availableDiscoveredRows = (discoveredRows ?? []).filter((item) => item.asset_status !== 'assigned');
  const assetById = new Map((assignedAssetRows ?? []).map((asset) => [asset.id, asset]));
  const assignedAssets = (assignmentRows ?? []).flatMap((assignment) => {const asset=assetById.get(assignment.asset_id);return asset?[{assignmentId:assignment.id,name:asset.name,externalId:asset.external_id,assetType:asset.asset_type,syncEnabled:assignment.sync_enabled}]:[];});
  const integrations = data ?? [];
  const configOf = (item: typeof integrations[number]) => item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config as Record<string, unknown> : {};
  const candidates = integrations.filter((item) => configOf(item).selection_pending === true);
  const legacyMetaProviders = new Set(['meta_ads','facebook_organic','instagram_organic']);
  const candidateGroups = Array.from(new Set(candidates.filter((item)=>!legacyMetaProviders.has(item.provider)).map((item) => `${item.provider}:${String(configOf(item).batch_id ?? 'unbatched')}`))).map((key) => {
    const [provider, batchValue] = key.split(':');
    return {
      provider,
      batchId: batchValue === 'unbatched' ? undefined : batchValue,
      candidates: candidates.filter((item) => item.provider === provider && String(configOf(item).batch_id ?? 'unbatched') === batchValue),
    };
  });
  const representedIntegrationIds = new Set((assignmentRows ?? []).map((item) => item.integration_id).filter(Boolean));
  const visibleIntegrations = integrations.filter((item) => configOf(item).selection_pending !== true && configOf(item).hidden !== true && !representedIntegrationIds.has(item.id));
  const connected = visibleIntegrations.filter((item) => item.status === 'connected' && item.is_enabled).length + assignedAssets.filter((item) => item.syncEnabled).length;
  const attention = visibleIntegrations.filter((item) => ['error', 'expired'].includes(item.status)).length;
  const preparedProviders = new Set(integrations.map((item) => item.provider));
  const official = connectorCatalog.filter((item) => item.group === 'official');
  const crms = connectorCatalog.filter((item) => item.group === 'crm');

  return (
    <div className="space-y-8">
      <header><p className="eyebrow mb-2">{org.name}</p><h1 className="text-3xl font-semibold">Central de integradores</h1><p className="muted mt-2 max-w-3xl">Conectores organizados por estágio real. Toda conta pertence exclusivamente a este workspace e os segredos permanecem no backend do Supabase.</p></header>
      {searchParams.select_assets && !availableDiscoveredRows.length ? <Card className="border-amber-500/40 bg-amber-500/5 text-amber-200">A descoberta foi concluída, mas não há novos ativos disponíveis. Os ativos já vinculados permanecem na área deste cliente.</Card> : null}
      {searchParams.select_accounts && !candidates.length ? <Card className="border-amber-500/40 bg-amber-500/5 text-amber-200">Nenhuma conta disponível foi encontrada.</Card> : null}
      {candidates.some((item)=>legacyMetaProviders.has(item.provider)) ? <Card className="border-blue-500/30 bg-blue-500/[.05] text-blue-100"><strong>Seleção Meta atualizada</strong><p className="muted mt-2 text-sm">O seletor antigo mostrava somente contas de anúncios. Use “Conectar e selecionar” no card da Meta para escolher, no mesmo fluxo, contas, Páginas do Facebook, Instagram, pixels, formulários, catálogos e conversões.</p></Card> : null}
      {searchParams.error ? <Card className="border-red-500/40 bg-red-500/5 text-red-300">A conexão não foi concluída. Verifique permissões e credenciais.</Card> : null}

      <IntegrationDiagnostics organizationId={org.id} />

      {searchParams.select_assets && connectionId && availableDiscoveredRows.length ? <PlatformAssetSelector organizationId={org.id} connectionId={connectionId} candidates={availableDiscoveredRows.map((item) => ({id:item.id,name:item.name,externalId:item.external_id,assetType:item.asset_type,status:item.asset_status,recommended:item.recommended}))} /> : null}

      {candidateGroups.map((group) => <MetaAccountSelector
        key={`${group.provider}:${group.batchId ?? 'unbatched'}`}
        organizationId={org.id}
        provider={group.provider}
        batchId={group.batchId}
        candidates={group.candidates.map((item) => ({id: item.id, accountName: item.account_name, externalAccountId: item.external_account_id}))}
      />)}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4"><Cable className="text-primary" /><div><strong className="text-xl">{visibleIntegrations.length + assignedAssets.length}</strong><p className="muted text-xs">ativos e integrações</p></div></Card>
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
          <Card><div className="mb-4 flex items-start justify-between gap-3"><div className="integration-brand">{icons.windsor}<div><h3>Windsor.ai</h3><p>Google Ads operacional; Google Business e YouTube com base registrada.</p></div></div><StageBadge stage="live" /></div><p className="muted mb-4 text-xs">Cadastre as contas disponíveis e confirme quais pertencem a este cliente.</p><ExtractorSetup organizationId={org.id} provider="windsor" /></Card>
          <Card><div className="mb-4 flex items-start justify-between gap-3"><div className="integration-brand">{icons.stract}<div><h3>Stract</h3><p>Destino Supabase e contas por cliente preparados para a carga externa.</p></div></div><StageBadge stage="foundation" /></div><p className="muted mb-4 text-xs">Cadastre as contas disponíveis e confirme quais pertencem a este cliente.</p><ExtractorSetup organizationId={org.id} provider="stract" /></Card>
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">CRM e receita real</h2><p className="muted mt-1 text-sm">Bases preparadas para que ROAS e ROI usem vendas reais quando a integração for finalizada.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{crms.map((connector) => <ConnectorCard connector={connector} organizationId={org.id} prepared={preparedProviders.has(connector.provider)} key={connector.provider} />)}</div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Ativos e bases deste cliente</h2><p className="muted mt-1 text-sm">Somente os ativos atribuídos nesta área podem alimentar o dashboard de {org.name}.</p></div>
        {assignedAssets.length ? <ClientPlatformAssets organizationId={org.id} assets={assignedAssets} /> : null}
        {visibleIntegrations.length ? <div className="grid gap-3">{visibleIntegrations.map((item) => {
          const config = item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config as Record<string, unknown> : {};
          const sourceKey = typeof config.source_platform === 'string' ? config.source_platform : null;
          const source = sourceKey ? connectorByProvider.get(sourceKey as never)?.name ?? sourceKey : null;
          const definition = connectorByProvider.get(item.provider);
          return <IntegrationAccountCard key={item.id} organizationId={org.id} item={item} providerName={definition?.name ?? item.provider} source={source} />;
        })}</div> : !assignedAssets.length ? <Card className="border-dashed text-center"><p>Nenhuma integração preparada neste cliente.</p><p className="muted mt-2 text-sm">Conecte uma conta operacional ou prepare um dos conectores acima.</p></Card> : null}
      </section>
    </div>
  );
}
