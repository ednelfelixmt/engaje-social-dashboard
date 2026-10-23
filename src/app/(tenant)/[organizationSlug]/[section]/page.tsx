import Link from 'next/link';
import {Suspense} from 'react';
import {notFound, redirect} from 'next/navigation';
import {dashboardConfig, tenant} from '@/lib/auth/session';
import {filters, dashboardData, previous as previousRange} from '@/lib/metrics/query';
import {Ranking} from '@/components/dashboard/ranking';
import {campaigns} from '@/lib/metrics/campaigns';
import {preparePerformanceRankings} from '@/lib/metrics/rankings';
import {defaultFunnelIcons, funnelMetricDefinitions, parseFunnelSteps, type FunnelDataKey} from '@/lib/metrics/funnel-config';
import {platformDashboardByRoute, platformDashboards} from '@/lib/metrics/platforms';
import {Filters} from '@/components/dashboard/filters';
import {Funnel} from '@/components/dashboard/funnel';
import {CampaignWorkspace} from '@/components/dashboard/campaign-workspace';
import {CampaignOverview} from '@/components/dashboard/campaign-overview';
import {DisplayModeController} from '@/components/dashboard/display-mode-controller';
import {CreativeSummary} from '@/components/dashboard/creative-summary';
import {CreativeLibrary} from '@/components/dashboard/creative-library';
import {AudienceControl} from '@/components/dashboard/performance-rankings';
import {ExecutiveIntelligence} from '@/components/dashboard/executive-intelligence';
import {StrategicDecisionBrief} from '@/components/dashboard/strategic-decision-brief';
import {PlatformAnalyticsV3,type PlatformRow,type PlatformDay} from '@/components/dashboard/platform-analytics-v3';
import {ExecutiveOverviewV2,type ExecutiveCampaign,type ExecutiveDay} from '@/components/dashboard/executive-overview-v2';
import {DecisionAnalysis, type DecisionTimelinePoint} from '@/components/dashboard/decision-analysis';
import {Card} from '@/components/ui/card';
import {UploadForm} from '@/components/upload-form';
import {DashboardLayoutProvider} from '@/components/layout/dashboard-layout';
import {PersonalizeBar} from '@/components/layout/personalize-bar';
import {Block} from '@/components/layout/block';
import {effectiveLayout} from '@/lib/layout/schema';
import type {CampaignPerformance} from '@/types/domain';
import type {Row} from '@/types/database.types';

const baseTitles: Record<string, string> = {
  overview: 'Visão geral', paid: 'Tráfego pago', funnel: 'Funil de vendas',
  'paid-creatives': 'Criativos de mídia paga', external: 'Dados externos',
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

function platformRows(rows:CampaignPerformance[]):PlatformRow[]{return rows.map(r=>({id:[r.platform,r.accountId,r.campaignId].join(':'),name:r.campaignName,spend:r.spend,impressions:r.impressions,clicks:r.clicks,leads:r.leads,reach:r.reach,messages:r.messageLeads,revenue:r.revenue,status:r.campaignStatus}));}
function platformDays(rows:Row<'metrics_ads'>[]):PlatformDay[]{return executiveDays(rows);}
function executiveShape(rows:CampaignPerformance[]):ExecutiveCampaign[]{return rows.map(r=>({id:[r.platform,r.accountId,r.campaignId].join(':'),name:r.campaignName,platform:r.platform,spend:r.spend,impressions:r.impressions,clicks:r.clicks,leads:r.leads}));}
function executiveDays(rows:Row<'metrics_ads'>[]):ExecutiveDay[]{const days=new Map<string,ExecutiveDay>();for(const r of rows){const d=days.get(r.metric_date)??{date:r.metric_date,spend:0,impressions:null,clicks:null,leads:null};d.spend+=r.spend;for(const k of ['impressions','clicks','leads'] as const){if(r[k]!=null)d[k]=(d[k]??0)+r[k];}days.set(r.metric_date,d);}return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function decisionTimeline(rows:Row<'metrics_ads'>[]):DecisionTimelinePoint[]{
  const grouped=new Map<string,DecisionTimelinePoint>();
  for(const row of rows){const item=grouped.get(row.metric_date)??{date:row.metric_date,spend:0,impressions:0,reach:0,clicks:0,leads:0};item.spend+=row.spend;for(const key of ['impressions','reach','clicks','leads'] as const)item[key]=item[key]===null||row[key]===null?null:Number(item[key])+Number(row[key]);grouped.set(row.metric_date,item);}
  return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
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
  if(['organic','facebook_organic','instagram_organic','tiktok_organic','youtube','google_business','organic-posts'].includes(params.section))redirect(`/${params.organizationSlug}/paid`);
  const {db, org, user, superAdmin} = await tenant(params.organizationSlug);
  const platformPage = platformDashboardByRoute.get(params.section);
  const title = baseTitles[params.section] ?? platformPage?.label;
  if (!title) notFound();
  const sectionGroup = platformPage?.group ?? (params.section === 'paid' ? 'paid' : null);
  const contentMode=params.section==='paid-creatives'?'paid':null;

  const [config, {data: orgs}, {data: latestMovement}, {data: personalLayout}, {data: branding}] = await Promise.all([
    dashboardConfig(params.organizationSlug),
    superAdmin?db.from('organizations').select('name,slug').eq('status', 'active').order('name'):Promise.resolve({data:[{name:org.name,slug:org.slug}]}),
    params.section==='overview'?db.from('metrics_ads').select('metric_date').eq('organization_id', org.id).gt('spend', 0).order('metric_date', {ascending: false}).limit(1).maybeSingle():Promise.resolve({data:null}),
    db.from('user_dashboard_layouts').select('layout').eq('user_id', user.id).eq('organization_id', org.id).eq('scope', params.section).maybeSingle(),
    db.from('branding').select('logo_path').eq('organization_id', org.id).maybeSingle(),
  ]);
  const clientLogoUrl = branding?.logo_path
    ? (await db.storage.from('branding').createSignedUrl(branding.logo_path, 3600)).data?.signedUrl ?? null
    : null;
  const requiredPage = params.section==='paid-creatives'?'creatives':platformPage?.group ?? params.section;
  if (!config.enabled_pages.includes(requiredPage)) return <Card>Esta página foi desativada nas configurações do dashboard.</Card>;

  const blockCatalog = params.section === 'overview'
    ? [{id: 'executive', label: 'Controle executivo'}, {id: 'campaigns', label: 'Indicadores de mídia'}, {id: 'trend', label: 'Evolução e impactos'}, {id: 'analytics', label: 'Funil e dados demográficos'}, {id: 'campaign-list', label: 'Análise detalhada'}]
    : sectionGroup === 'paid'
      ? [{id: 'kpis', label: 'Indicadores'}, ...(!platformPage ? [{id: 'platforms', label: 'Plataformas'}] : []), {id: 'funnel', label: 'Funil de campanhas'}, {id: 'timeline', label: 'Evolução temporal'}, {id: 'campaigns', label: 'Ranking de campanhas'}, {id: 'creatives', label: 'Rankings de desempenho'}]
      : [];
  const customizable = blockCatalog.length > 0 || contentMode !== null;
  const layoutDefaults = (config.default_layouts && typeof config.default_layouts === 'object' && !Array.isArray(config.default_layouts) ? (config.default_layouts as Record<string, unknown>)[params.section] : null) ?? null;
  const {layout: initialLayout, personalized} = effectiveLayout(personalLayout?.layout, layoutDefaults);
  const canCustomizeClient = superAdmin;
  const f = filters(searchParams, org.timezone, org.currency);
  const visible = platformDashboards.filter((item)=>item.group===sectionGroup).map((item)=>item.platform);
  const requestedPlatform = visible.find((platform) => platform === searchParams.platform);
  const chosen = platformPage?.platform ?? requestedPlatform ?? null;
  const needsCampaignData=params.section==='overview'||params.section==='funnel'||sectionGroup==='paid'||contentMode==='paid';
  const data = await dashboardData(db,org.id,f,{
    platform:chosen,
    ads:needsCampaignData,
    adsComparison:(sectionGroup==='paid'||params.section==='overview'||params.section==='funnel')&&f.compare!=='none',
    breakdowns:sectionGroup==='paid'||params.section==='overview',
    crm:needsCampaignData||params.section==='external',
    crmComparison:(sectionGroup==='paid'||params.section==='overview'||params.section==='funnel')&&f.compare!=='none',
    creatives:contentMode!==null,
    creativePeriod:false,
    adCampaigns:needsCampaignData,
  });
  const platformHasData=!platformPage||data.ads.length>0;
  const ads = data.ads;
  const breakdowns = data.breakdowns;
  const previousAds = data.adsComparison;
  const catalog = data.adCampaigns;
  const currentCampaigns = campaigns(ads, data.crm, config.preferred_revenue_source, catalog);
  const previousCampaigns = campaigns(previousAds, data.crmComparison, config.preferred_revenue_source, catalog);
  const campaignsWithMovement = currentCampaigns.filter((row) => row.spend > 0 || Number(row.impressions ?? 0) > 0 || Number(row.clicks ?? 0) > 0 || Number(row.leads ?? 0) > 0 || Number(row.purchases ?? 0) > 0);
  const previousCampaignsWithMovement = previousCampaigns.filter((row) => row.spend > 0 || Number(row.impressions ?? 0) > 0 || Number(row.clicks ?? 0) > 0 || Number(row.leads ?? 0) > 0 || Number(row.purchases ?? 0) > 0);
  const funnelSteps=configuredFunnel(campaignsWithMovement,config.funnel_steps,f.compare==='none'?[]:previousCampaignsWithMovement);
  const paidCreativePlatforms=new Set(['meta_ads','google_ads','tiktok_ads']);
  const movingAdIds=new Set(data.ads.map((row)=>row.ad_id));
  const filteredCreatives = data.creatives.filter((creative) => contentMode==='paid'&&paidCreativePlatforms.has(creative.platform)&&(!movingAdIds.size||movingAdIds.has(creative.ad_id??'')));
  const performanceRankings = sectionGroup==='paid'||params.section==='overview'?preparePerformanceRankings(campaignsWithMovement, ads, breakdowns, filteredCreatives):{campaign:[],audience:[],creative:[],gender:[],age:[],device:[],state:[],city:[]};
  const queryWithoutPlatform = Object.fromEntries(Object.entries(f));
  return <DashboardLayoutProvider slug={org.slug} scope={params.section} initialLayout={initialLayout} initialPersonalized={personalized} canPromote={canCustomizeClient} blocks={blockCatalog} defaultBlockOrder={config.widget_order}>
  <div className="dashboard-content mx-auto max-w-[1780px] space-y-6 lg:space-y-8">
    <Suspense fallback={null}><DisplayModeController /></Suspense>
    <header className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary">{org.name.slice(0,2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs text-zinc-400">{org.name}</p><h1 className="truncate text-xl font-semibold text-white">{params.section==='overview'?'Visão geral consolidada':title}</h1></div></header>
    <div className="tv-hide"><Filters value={f} organizations={orgs ?? []} slug={org.slug} actions={customizable ? <PersonalizeBar/> : undefined}/></div>
    {platformPage&&ads.length>0?<p className="text-xs text-zinc-500">Métricas registradas de {ads.map(r=>r.metric_date).sort()[0].split('-').reverse().join('/')} a {ads.map(r=>r.metric_date).sort().at(-1)!.split('-').reverse().join('/')} dentro do período filtrado. Dados posteriores dependem da coleta da plataforma.</p>:null}
    {platformPage&&!platformHasData?<Card><strong className="text-sm text-zinc-200">Sem resultados registrados para {platformPage.label}</strong><p className="mt-2 text-sm leading-6 text-zinc-400">Não há métricas disponíveis no período selecionado. Consulte o histórico de outros períodos quando necessário.</p></Card>:null}

    {sectionGroup && !platformPage ? <div className="tv-hide flex flex-wrap gap-3"><Link prefetch className={`rounded-lg px-4 py-2 text-sm ${chosen ? 'bg-white/5' : 'bg-primary text-black'}`} href={`?${new URLSearchParams(queryWithoutPlatform).toString()}`}>Todas</Link>{visible.map((platform) => {const definition = platformDashboards.find((item) => item.platform === platform); return <Link prefetch key={platform} className={`rounded-lg px-4 py-2 text-sm ${chosen === platform ? 'bg-primary text-black' : 'bg-white/5'}`} href={`?${new URLSearchParams({...queryWithoutPlatform, platform}).toString()}`}>{definition?.label ?? platform}</Link>;})}</div> : null}
    {params.section === 'overview' ? <ExecutiveOverviewV2 rows={executiveShape(campaignsWithMovement)} previous={f.compare==='none'?[]:executiveShape(previousCampaignsWithMovement)} days={executiveDays(ads)} previousDays={f.compare==='none'?[]:executiveDays(previousAds)} currency={f.currency} slug={org.slug} period={f.from+' a '+f.to}/> : null}
    {platformPage ? <PlatformAnalyticsV3 rows={platformRows(campaignsWithMovement)} previous={f.compare==='none'?[]:platformRows(previousCampaignsWithMovement)} days={platformDays(ads)} previousDays={f.compare==='none'?[]:platformDays(previousAds)} currency={f.currency} platform={platformPage.platform} slug={org.slug}/> : null}
    {sectionGroup === 'paid' && !platformPage ? <CampaignWorkspace rows={currentCampaigns} previousRows={f.compare === 'none' ? [] : previousCampaigns} comparing={f.compare!=='none'} timeline={timelineRows(ads)} currency={f.currency} showPlatforms={!chosen} enabledMetrics={config.enabled_metrics} rankings={performanceRankings} funnelSteps={funnelSteps} storageKey={`${org.id}:${params.section}:${chosen??'all'}:paid-metrics`} /> : null}

    {params.section === 'funnel' ? <section data-tv-panel><Card><h2 className="font-semibold">Funil do modelo de negócio</h2><p className="muted mt-2 text-sm">Etapas configuradas para este cliente. As taxas são relações entre eventos agregados e não representam uma coorte individual.</p><Funnel currency={f.currency} steps={funnelSteps} comparing={f.compare!=='none'} /></Card></section> : null}

    {contentMode === 'paid' ? <section data-tv-panel><CreativeSummary rows={ads} currency={f.currency} /></section> : null}

    {contentMode ? <section data-tv-panel><CreativeLibrary creatives={filteredCreatives} mode="paid" storageKey={`${org.id}:${params.section}:${chosen??'all'}:creatives`} organicInsightsUnavailable={false} /></section> : null}

    {params.section === 'external' ? <><Card><h2 className="mb-3 text-lg font-semibold">Importar receita real</h2><p className="muted mb-5 text-sm">Importe CSV com datas, receita e compras conciliadas por dia. A importação é validada antes de gravar.</p><UploadForm organizationId={org.id} /></Card><Card><h2 className="mb-4 font-semibold">Registros de receita</h2><p className="muted">{data.crm.length} registros no período selecionado.</p></Card></> : null}
  </div>
  </DashboardLayoutProvider>;
}
