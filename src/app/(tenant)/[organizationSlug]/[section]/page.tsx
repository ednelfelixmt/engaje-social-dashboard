import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {dashboardConfig, tenant} from '@/lib/auth/session';
import {filters, dashboardData} from '@/lib/metrics/query';
import {campaigns} from '@/lib/metrics/campaigns';
import {preparePerformanceRankings} from '@/lib/metrics/rankings';
import {defaultFunnelIcons, funnelMetricDefinitions, parseFunnelSteps, type FunnelDataKey} from '@/lib/metrics/funnel-config';
import {platformDashboardByRoute, platformDashboards, type DashboardPlatform} from '@/lib/metrics/platforms';
import {Filters} from '@/components/dashboard/filters';
import {OrganicKpis} from '@/components/dashboard/organic-kpis';
import {Funnel} from '@/components/dashboard/funnel';
import {CampaignWorkspace} from '@/components/dashboard/campaign-workspace';
import {CampaignOverview} from '@/components/dashboard/campaign-overview';
import {DataFreshness} from '@/components/dashboard/data-freshness';
import {CreativeSummary} from '@/components/dashboard/creative-summary';
import {CreativeLibrary} from '@/components/dashboard/creative-library';
import {Card} from '@/components/ui/card';
import {UploadForm} from '@/components/upload-form';
import {DashboardLayoutProvider} from '@/components/layout/dashboard-layout';
import {PersonalizeBar} from '@/components/layout/personalize-bar';
import {Block} from '@/components/layout/block';
import {effectiveLayout} from '@/lib/layout/schema';
import type {CampaignPerformance} from '@/types/domain';
import type {Row} from '@/types/database.types';

const baseTitles: Record<string, string> = {
  overview: 'Visão geral', paid: 'Tráfego pago', funnel: 'Funil de vendas', organic: 'Tráfego orgânico',
  'paid-creatives': 'Criativos de mídia paga', 'organic-posts': 'Posts orgânicos', external: 'Dados externos',
};

function timelineRows(rows: Row<'metrics_ads'>[]) {
  const grouped = new Map<string, {date: string; spend: number; revenue: number | null}>();
  for (const row of rows) {
    const current = grouped.get(row.metric_date) ?? {date: row.metric_date, spend: 0, revenue: 0};
    current.spend += row.spend;
    current.revenue = current.revenue === null || row.revenue === null ? null : current.revenue + row.revenue;
    grouped.set(row.metric_date, current);
  }
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function funnelValue(rows:CampaignPerformance[],key:FunnelDataKey|undefined){
  const available=key?rows.filter((row)=>row[key]!=null):[];
  return {value:key&&available.length?available.reduce((total,row)=>total+Number(row[key]),0):null,spend:available.reduce((total,row)=>total+row.spend,0)};
}

function configuredFunnel(rows:CampaignPerformance[],rawSteps:unknown,previousRows:CampaignPerformance[]=[]){
  return parseFunnelSteps(rawSteps).map((step)=>{
    const definition=funnelMetricDefinitions.find((item)=>item.key===step.metric)!;const key='dataKey' in definition?definition.dataKey:undefined;
    const {value,spend}=funnelValue(rows,key);
    const previous=previousRows.length?funnelValue(previousRows,key).value:null;
    const cost=value?spend/value*('costMultiplier' in definition&&definition.costMultiplier?definition.costMultiplier:1):null;
    return {label:step.label,value,costLabel:definition.costLabel,cost,color:step.color,icon:step.icon??defaultFunnelIcons[step.metric],target:step.target??null,previousValue:previous};
  });
}

export default async function Page({params: params_, searchParams: searchParams_}: {params: Promise<{organizationSlug: string; section: string}>; searchParams: Promise<Record<string, string | undefined>>}) {
  const params = await params_;
  const searchParams = await searchParams_;
  if(params.section==='creatives')redirect(`/${params.organizationSlug}/paid-creatives`);
  const {db, org, user, superAdmin} = await tenant(params.organizationSlug);
  const platformPage = platformDashboardByRoute.get(params.section);
  const title = baseTitles[params.section] ?? platformPage?.label;
  if (!title) notFound();
  const sectionGroup = platformPage?.group ?? (params.section === 'paid' || params.section === 'organic' ? params.section : null);
  const contentMode=params.section==='paid-creatives'?'paid':params.section==='organic-posts'?'organic':null;

  const [config, {data: orgs}, {data: membership}, {data: activeIntegrations}, {data: latestMovement}, {data: personalLayout}] = await Promise.all([
    dashboardConfig(params.organizationSlug),
    superAdmin?db.from('organizations').select('name,slug').eq('status', 'active').order('name'):Promise.resolve({data:[{name:org.name,slug:org.slug}]}),
    superAdmin?Promise.resolve({data:null}):db.from('organization_members').select('role').eq('organization_id', org.id).eq('user_id', user.id).maybeSingle(),
    db.from('integrations').select('id,provider,last_synced_at,status,last_error').eq('organization_id', org.id).eq('is_enabled', true).in('provider', ['meta_ads', 'windsor', 'stract', 'facebook_organic', 'instagram_organic', 'tiktok_organic', 'youtube', 'google_business']),
    params.section==='overview'?db.from('metrics_ads').select('metric_date').eq('organization_id', org.id).gt('spend', 0).order('metric_date', {ascending: false}).limit(1).maybeSingle():Promise.resolve({data:null}),
    db.from('user_dashboard_layouts').select('layout').eq('user_id', user.id).eq('organization_id', org.id).eq('scope', params.section).maybeSingle(),
  ]);
  const requiredPage = params.section==='paid-creatives'?'creatives':params.section==='organic-posts'?'organic':platformPage?.group ?? params.section;
  if (!config.enabled_pages.includes(requiredPage)) return <Card>Esta página foi desativada nas configurações do dashboard.</Card>;

  const blockCatalog = params.section === 'overview'
    ? [{id: 'campaigns', label: 'Visão de campanhas'}, {id: 'funnel', label: 'Funil geral'}]
    : sectionGroup === 'paid'
      ? [{id: 'kpis', label: 'Indicadores'}, ...(!platformPage ? [{id: 'platforms', label: 'Plataformas'}] : []), {id: 'funnel', label: 'Funil de campanhas'}, {id: 'timeline', label: 'Evolução temporal'}, {id: 'campaigns', label: 'Ranking de campanhas'}, {id: 'creatives', label: 'Rankings de desempenho'}]
      : [];
  const customizable = blockCatalog.length > 0 || sectionGroup === 'organic' || contentMode !== null;
  const layoutDefaults = (config.default_layouts && typeof config.default_layouts === 'object' && !Array.isArray(config.default_layouts) ? (config.default_layouts as Record<string, unknown>)[params.section] : null) ?? null;
  const {layout: initialLayout, personalized} = effectiveLayout(personalLayout?.layout, layoutDefaults);
  const canCustomizeClient = superAdmin || ['client_admin', 'editor'].includes(membership?.role ?? '');
  const f = filters(searchParams, org.timezone, org.currency);
  const visible = platformDashboards.filter((item)=>item.group===sectionGroup).map((item)=>item.platform);
  const requestedPlatform = visible.find((platform) => platform === searchParams.platform);
  const organicPostPlatform=contentMode==='organic'&&['facebook_organic','instagram_organic','tiktok_organic','youtube','google_business'].includes(searchParams.platform??'')?searchParams.platform as DashboardPlatform:null;
  const chosen = platformPage?.platform ?? organicPostPlatform ?? requestedPlatform ?? null;
  const showAllCreatives=searchParams.creatives==='all';
  const needsCampaignData=params.section==='overview'||params.section==='funnel'||sectionGroup==='paid'||contentMode==='paid';
  const data = await dashboardData(db,org.id,f,{
    platform:chosen,
    ads:needsCampaignData,
    adsComparison:(sectionGroup==='paid'||params.section==='overview'||params.section==='funnel')&&f.compare!=='none',
    breakdowns:sectionGroup==='paid',
    crm:needsCampaignData||params.section==='external',
    crmComparison:(sectionGroup==='paid'||params.section==='overview'||params.section==='funnel')&&f.compare!=='none',
    organic:sectionGroup==='organic',
    organicComparison:sectionGroup==='organic'&&f.compare!=='none',
    organicAccounts:sectionGroup==='organic',
    organicAccountsComparison:sectionGroup==='organic'&&f.compare!=='none',
    creatives:contentMode!==null,
    creativeLimit:contentMode==='organic'&&!showAllCreatives?24:undefined,
    creativePeriod:contentMode==='organic',
    adCampaigns:needsCampaignData,
  });
  const platformHasData=!platformPage||data.ads.length>0||data.organic.length>0||data.organicAccounts.length>0;
  const needsReachSync = data.ads.some((row) => Number(row.impressions ?? 0) > 0 && row.reach == null);
  const ads = data.ads;
  const breakdowns = data.breakdowns;
  const previousAds = data.adsComparison;
  const organic = data.organic;
  const previousOrganic = data.organicComparison;
  const catalog = data.adCampaigns;
  const currentCampaigns = campaigns(ads, data.crm, config.preferred_revenue_source, catalog);
  const previousCampaigns = campaigns(previousAds, data.crmComparison, config.preferred_revenue_source, catalog);
  const campaignsWithMovement = currentCampaigns.filter((row) => row.spend > 0 || Number(row.impressions ?? 0) > 0 || Number(row.clicks ?? 0) > 0 || Number(row.leads ?? 0) > 0 || Number(row.purchases ?? 0) > 0);
  const previousCampaignsWithMovement = previousCampaigns.filter((row) => row.spend > 0 || Number(row.impressions ?? 0) > 0 || Number(row.clicks ?? 0) > 0 || Number(row.leads ?? 0) > 0 || Number(row.purchases ?? 0) > 0);
  const funnelSteps=configuredFunnel(campaignsWithMovement,config.funnel_steps,f.compare==='none'?[]:previousCampaignsWithMovement);
  const paidCreativePlatforms=new Set(['meta_ads','google_ads','tiktok_ads']);
  const organicCreativePlatforms=new Set(['facebook_organic','instagram_organic','tiktok_organic','youtube','google_business']);
  const movingAdIds=new Set(data.ads.map((row)=>row.ad_id));
  const filteredCreatives = data.creatives.filter((creative) => contentMode==='paid'?paidCreativePlatforms.has(creative.platform)&&(!movingAdIds.size||movingAdIds.has(creative.ad_id??'')):contentMode==='organic'?organicCreativePlatforms.has(creative.platform)&&(!chosen||creative.platform===chosen):false);
  const performanceRankings = sectionGroup==='paid'?preparePerformanceRankings(campaignsWithMovement, ads, breakdowns, filteredCreatives):{campaign:[],audience:[],creative:[],gender:[],age:[],device:[],state:[],city:[]};
  const queryWithoutPlatform = Object.fromEntries(Object.entries(f));
  const showAllCreativesHref=`?${new URLSearchParams({...queryWithoutPlatform,...(chosen?{platform:chosen}:{}),creatives:'all'}).toString()}`;
  const paidIntegrations=(activeIntegrations??[]).filter((item)=>['meta_ads','windsor','stract'].includes(item.provider));
  const organicProviders=['facebook_organic','instagram_organic','tiktok_organic','youtube','google_business'];
  const relevantOrganicIntegrations=(activeIntegrations??[]).filter((item)=>organicProviders.includes(item.provider)&&(!chosen||item.provider===chosen));
  const organicIntegrationIssue=relevantOrganicIntegrations.find((item)=>item.last_error)?.last_error??null;
  const refreshIntegrations=(sectionGroup==='organic'||contentMode==='organic')?relevantOrganicIntegrations:paidIntegrations;

  return <DashboardLayoutProvider slug={org.slug} scope={params.section} initialLayout={initialLayout} initialPersonalized={personalized} canPromote={canCustomizeClient} blocks={blockCatalog} defaultBlockOrder={config.widget_order}>
  <div className="mx-auto max-w-[1780px] space-y-6 lg:space-y-8">
    <header className="dashboard-hero flex flex-wrap items-end justify-between gap-6"><div className="relative z-10 max-w-4xl"><p className="eyebrow mb-4">{org.name} · INTELIGÊNCIA DE MARKETING</p><h1 className="display-title">{title}</h1><p className="muted mt-4 max-w-2xl text-sm leading-6">Performance consolidada, leitura executiva e origem identificada. Sem maquiagem estatística: dados indisponíveis aparecem como —.</p></div><div className="relative z-10 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-zinc-300 shadow-inner">{f.from.split('-').reverse().join('/')} <span className="mx-2 text-primary">→</span> {f.to.split('-').reverse().join('/')}</div></header>
    <DataFreshness organizationId={org.id} integrations={refreshIntegrations.map((item) => ({id: item.id, provider: item.provider, lastSyncedAt: item.last_synced_at, status: item.status}))} canSync={superAdmin || ['client_admin', 'editor'].includes(membership?.role ?? '')} renderedAt={Date.now()} timezone={org.timezone} needsReachSync={(sectionGroup==='paid'||contentMode==='paid')&&needsReachSync} />
    <Filters value={f} organizations={orgs ?? []} slug={org.slug} />
    {customizable ? <PersonalizeBar /> : null}
    {platformPage&&!platformHasData?<Card className="border-amber-400/25 bg-amber-400/[.06]"><strong className="text-sm text-amber-200">{platformPage.label} ainda não possui dados</strong><p className="mt-2 text-sm leading-6 text-amber-100/70">Conecte e selecione o ativo correspondente em Integrações. A página permanecerá disponível e começará a exibir métricas após a primeira sincronização.</p><Link className="mt-4 inline-flex rounded-lg border border-amber-300/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/10" href={`/${org.slug}/settings/integrations`}>Abrir integrações</Link></Card>:null}

    {sectionGroup && !platformPage ? <div className="flex flex-wrap gap-3"><Link prefetch className={`rounded-lg px-4 py-2 text-sm ${chosen ? 'bg-white/5' : 'bg-primary text-black'}`} href={`?${new URLSearchParams(queryWithoutPlatform).toString()}`}>Todas</Link>{visible.map((platform) => {const definition = platformDashboards.find((item) => item.platform === platform); return <Link prefetch key={platform} className={`rounded-lg px-4 py-2 text-sm ${chosen === platform ? 'bg-primary text-black' : 'bg-white/5'}`} href={`?${new URLSearchParams({...queryWithoutPlatform, platform}).toString()}`}>{definition?.label ?? platform}</Link>;})}</div> : null}
    {contentMode==='organic'?<div className="flex flex-wrap gap-3"><Link className={`rounded-lg px-4 py-2 text-sm ${chosen?'bg-white/5':'bg-primary text-black'}`} href={`?${new URLSearchParams(queryWithoutPlatform).toString()}`}>Todos os posts</Link>{platformDashboards.filter((item)=>item.group==='organic').map((item)=><Link key={item.platform} className={`rounded-lg px-4 py-2 text-sm ${chosen===item.platform?'bg-primary text-black':'bg-white/5'}`} href={`?${new URLSearchParams({...queryWithoutPlatform,platform:item.platform}).toString()}`}>{item.label}</Link>)}</div>:null}

    {params.section === 'overview' ? <div className="flex flex-col gap-5">
      {!campaignsWithMovement.length && latestMovement?.metric_date ? <Card style={{order: -1}} className="border-amber-400/20 bg-amber-400/[0.05] !py-4"><p className="text-sm text-amber-100">Não houve veiculação no intervalo selecionado. O último investimento registrado foi em <strong>{latestMovement.metric_date.split('-').reverse().join('/')}</strong>.</p></Card> : null}
      <Block id="campaigns"><CampaignOverview rows={campaignsWithMovement} currency={f.currency} enabledMetrics={config.enabled_metrics} /></Block><Block id="funnel"><Card><div><p className="eyebrow">Jornada completa</p><h2 className="mt-2 text-lg font-semibold">Funil geral de campanhas</h2><p className="muted mt-2 text-sm">Inclui leads de formulários e conversas iniciadas por mensagens.</p></div><Funnel currency={f.currency} steps={funnelSteps} comparing={f.compare!=='none'} /></Card></Block>
    </div> : null}

    {sectionGroup === 'paid' ? <CampaignWorkspace rows={currentCampaigns} previousRows={f.compare === 'none' ? [] : previousCampaigns} timeline={timelineRows(ads)} currency={f.currency} showPlatforms={!platformPage && !chosen} enabledMetrics={config.enabled_metrics} rankings={performanceRankings} funnelSteps={funnelSteps} storageKey={`${org.id}:${params.section}:${chosen??'all'}:paid-metrics`} /> : null}

    {params.section === 'funnel' ? <Card><h2 className="font-semibold">Funil do modelo de negócio</h2><p className="muted mt-2 text-sm">Etapas configuradas para este cliente. As taxas são relações entre eventos agregados e não representam uma coorte individual.</p><Funnel currency={f.currency} steps={funnelSteps} comparing={f.compare!=='none'} /></Card> : null}

    {sectionGroup === 'organic' ? <><Card><p className="muted text-sm">Métricas da conta e das publicações são tratadas separadamente. Arraste os cards para organizar a grade; a posição fica salva neste navegador. O valor 0 é um resultado válido da plataforma; — significa que a fonte não forneceu o indicador.</p></Card>{organicIntegrationIssue?<Card className="border-amber-400/25 bg-amber-400/[.06] !py-4"><strong className="text-sm text-amber-200">Sincronização orgânica parcial</strong><p className="mt-1 text-xs leading-5 text-amber-100/70">{organicIntegrationIssue} Os indicadores já coletados continuam visíveis; somente os dados ausentes aparecem como —.</p></Card>:null}<OrganicKpis current={organic} previous={f.compare === 'none' ? undefined : previousOrganic} accountCurrent={data.organicAccounts} accountPrevious={f.compare === 'none' ? undefined : data.organicAccountsComparison} enabledMetrics={config.enabled_metrics} storageKey={`${org.id}:${params.section}:${chosen??'all'}:organic-metrics`}/></> : null}

    {contentMode === 'paid' ? <CreativeSummary rows={ads} currency={f.currency} /> : null}

    {contentMode ? <CreativeLibrary creatives={filteredCreatives} mode={contentMode} storageKey={`${org.id}:${params.section}:${chosen??'all'}:creatives`} organicInsightsUnavailable={contentMode==='organic'&&Boolean(organicIntegrationIssue)} showAllHref={contentMode==='organic'&&!showAllCreatives&&filteredCreatives.length===24?showAllCreativesHref:undefined} /> : null}

    {params.section === 'external' ? <><Card><h2 className="mb-3 text-lg font-semibold">Importar receita real</h2><p className="muted mb-5 text-sm">Importe CSV com datas, receita e compras conciliadas por dia. A importação é validada antes de gravar.</p><UploadForm organizationId={org.id} /></Card><Card><h2 className="mb-4 font-semibold">Registros de receita</h2><p className="muted">{data.crm.length} registros no período selecionado.</p></Card></> : null}
  </div>
  </DashboardLayoutProvider>;
}
