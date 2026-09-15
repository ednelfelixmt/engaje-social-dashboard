import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Images} from 'lucide-react';
import {tenant} from '@/lib/auth/session';
import {filters, dashboardData, totals, sum} from '@/lib/metrics/query';
import {campaigns} from '@/lib/metrics/campaigns';
import {platformDashboardByRoute, platformDashboards, type DashboardPlatform} from '@/lib/metrics/platforms';
import {Filters} from '@/components/dashboard/filters';
import {Kpis} from '@/components/dashboard/kpis';
import {OrganicKpis} from '@/components/dashboard/organic-kpis';
import {Timeline} from '@/components/dashboard/charts';
import {Funnel} from '@/components/dashboard/funnel';
import {Ranking} from '@/components/dashboard/ranking';
import {Card} from '@/components/ui/card';
import {UploadForm} from '@/components/upload-form';
import type {CampaignPerformance} from '@/types/domain';
import type {Row} from '@/types/database.types';

const baseTitles: Record<string, string> = {
  overview: 'Visão geral', paid: 'Tráfego pago', funnel: 'Funil de vendas', organic: 'Tráfego orgânico',
  creatives: 'Criativos & posts', external: 'Dados externos',
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

export default async function Page({params, searchParams}: {params: {organizationSlug: string; section: string}; searchParams: Record<string, string | undefined>}) {
  const {db, org} = await tenant(params.organizationSlug);
  const platformPage = platformDashboardByRoute.get(params.section);
  const title = baseTitles[params.section] ?? platformPage?.label;
  if (!title) notFound();

  const [{data: config}, {data: orgs}] = await Promise.all([
    db.from('dashboard_configs').select('*').eq('organization_id', org.id).single(),
    db.from('organizations').select('name,slug').eq('status', 'active').order('name'),
  ]);
  if (!config) throw new Error('Configuração do dashboard não encontrada.');
  const requiredPage = platformPage?.group ?? params.section;
  if (!config.enabled_pages.includes(requiredPage)) return <Card>Esta página foi desativada nas configurações do dashboard.</Card>;

  const f = filters(searchParams, org.timezone, org.currency);
  const data = await dashboardData(org.slug, f);
  const sectionGroup = platformPage?.group ?? (params.section === 'paid' || params.section === 'organic' ? params.section : null);
  const visibleChecks = await Promise.all(platformDashboards.filter((item) => item.group === sectionGroup).map(async (item) => {
    const table = item.group === 'paid' ? 'metrics_ads' : 'metrics_organic';
    const {count, error} = await db.from(table).select('id', {head: true, count: 'exact'}).eq('organization_id', org.id).eq('platform', item.platform as never);
    if (error) throw error;
    if (count) return item.platform;
    if (item.group === 'organic') {
      const {count: creativeCount, error: creativeError} = await db.from('creatives').select('id', {head: true, count: 'exact'}).eq('organization_id', org.id).eq('platform', item.platform as never);
      if (creativeError) throw creativeError;
      if (creativeCount) return item.platform;
    }
    return null;
  }));
  const visible = visibleChecks.filter((item): item is DashboardPlatform => item !== null);
  if (platformPage && !visible.includes(platformPage.platform)) notFound();
  const requestedPlatform = visible.find((platform) => platform === searchParams.platform);
  const chosen = platformPage?.platform ?? requestedPlatform ?? null;
  const ads = chosen ? data.ads.filter((row) => row.platform === chosen) : data.ads;
  const previousAds = chosen ? data.adsComparison.filter((row) => row.platform === chosen) : data.adsComparison;
  const organic = chosen ? data.organic.filter((row) => row.platform === chosen) : data.organic;
  const previousOrganic = chosen ? data.organicComparison.filter((row) => row.platform === chosen) : data.organicComparison;
  const currentCampaigns = campaigns(ads, data.crm, config.preferred_revenue_source);
  const previousCampaigns = campaigns(previousAds, data.crmComparison, config.preferred_revenue_source);
  const filteredCreatives = data.creatives.filter((creative) => !chosen || creative.platform === chosen);
  const queryWithoutPlatform = Object.fromEntries(Object.entries(f));

  return <div className="space-y-7">
    <header><p className="eyebrow mb-2">{org.name} / INTELIGÊNCIA DE MARKETING</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="muted mt-2 text-sm">Resultados com origem identificada. Valores indisponíveis aparecem como —.</p></header>
    <Filters value={f} organizations={orgs ?? []} slug={org.slug} />

    {sectionGroup && !platformPage ? <div className="flex flex-wrap gap-3"><Link className={`rounded-lg px-4 py-2 text-sm ${chosen ? 'bg-white/5' : 'bg-primary text-black'}`} href={`?${new URLSearchParams(queryWithoutPlatform).toString()}`}>Todas com dados</Link>{visible.map((platform) => {const definition = platformDashboards.find((item) => item.platform === platform); return <Link key={platform} className={`rounded-lg px-4 py-2 text-sm ${chosen === platform ? 'bg-primary text-black' : 'bg-white/5'}`} href={`?${new URLSearchParams({...queryWithoutPlatform, platform}).toString()}`}>{definition?.label ?? platform}</Link>;})}</div> : null}

    {params.section === 'overview' ? <div className="flex flex-col gap-5">{[...new Set(config.widget_order)].map((widget) => widget === 'kpis'
      ? <Kpis key={widget} current={totals(data.days)} previous={f.compare === 'none' ? undefined : totals(data.comparison)} currency={f.currency} enabled={config.enabled_metrics} />
      : widget === 'timeline' ? <Card key={widget}><h2 className="font-semibold">Investimento e receita</h2><p className="muted mt-2 text-xs">Receita real conciliada, com receita de anúncios como alternativa.</p><Timeline rows={data.days.map((day) => ({date: day.metric_date!, spend: day.spend, revenue: day.revenue}))} /></Card>
      : widget === 'funnel' ? <Card key={widget}><h2 className="font-semibold">Funil geral</h2><Funnel values={['impressions', 'clicks', 'page_views', 'leads', 'checkouts', 'purchases'].map((key) => sum(data.days, key))} /></Card>
      : widget === 'campaigns' ? <Card key={widget}><h2 className="mb-5 font-semibold">Campanhas em destaque</h2><Ranking rows={currentCampaigns} currency={f.currency} /></Card>
      : null)}</div> : null}

    {sectionGroup === 'paid' ? <><Kpis current={totals(currentCampaigns)} previous={f.compare === 'none' ? undefined : totals(previousCampaigns)} currency={f.currency} enabled={config.enabled_metrics} /><Card><h2 className="font-semibold">Investimento e receita atribuída</h2><p className="muted mt-2 text-xs">A receita real é usada quando existe conciliação completa para a campanha; do contrário, vale a receita informada pela plataforma.</p><Timeline rows={timelineRows(ads)} /></Card><Card><h2 className="mb-5 font-semibold">Ranking de campanhas</h2><Ranking rows={currentCampaigns} currency={f.currency} /></Card></> : null}

    {params.section === 'funnel' ? <Card><h2 className="font-semibold">Da descoberta à compra</h2><p className="muted mt-2 text-sm">Taxas entre eventos; sem identificação de usuários, não representam uma coorte individual.</p><Funnel values={['impressions', 'clicks', 'page_views', 'leads', 'checkouts', 'purchases'].map((key) => sum(data.days, key))} /></Card> : null}

    {sectionGroup === 'organic' ? <><Card><p className="muted text-sm">Métricas diárias da plataforma selecionada. Os cards dos conteúdos exibem os contadores acumulados até a última sincronização.</p></Card><OrganicKpis current={organic} previous={f.compare === 'none' ? undefined : previousOrganic} /><Card><h2 className="font-semibold">Funil orgânico</h2><Funnel values={[sum(organic, 'impressions'), sum(organic, 'clicks'), sum(organic, 'page_views'), null, null, null]} /></Card></> : null}

    {(params.section === 'creatives' || sectionGroup === 'organic') ? <Card><h2 className="mb-5 font-semibold">Conteúdos publicados</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{filteredCreatives.map((creative) => <article className="overflow-hidden rounded-xl border border-white/10" key={creative.id}>{creative.thumbnail_url || creative.media_url ? <Image unoptimized className="aspect-square w-full object-cover" width={640} height={640} src={creative.thumbnail_url || creative.media_url!} alt={creative.caption?.slice(0, 100) || 'Criativo publicado'} /> : <div className="grid aspect-square place-items-center bg-white/5"><Images className="text-zinc-600" /></div>}<div className="p-4"><p className="text-xs text-primary">{platformDashboards.find((item) => item.platform === creative.platform)?.label ?? creative.platform} · {creative.kind}</p><p className="mt-2 line-clamp-2 text-sm">{creative.caption || 'Publicação sem legenda'}</p>{creative.platform !== 'meta_ads' ? <div className="mt-4 text-xs"><p className="mb-2 text-zinc-500">Acumulado até a sincronização</p>{Object.entries(creative.lifetime_metrics || {}).map(([key, value]) => <p key={key} className="flex justify-between py-1"><span>{({likes: 'Curtidas', comments: 'Comentários', shares: 'Compartilhamentos', reactions: 'Reações'} as Record<string, string>)[key] || key}</span><strong>{typeof value === 'number' ? value.toLocaleString('pt-BR') : '—'}</strong></p>)}<p className="mt-2 text-zinc-600">{new Date(creative.synced_at).toLocaleDateString('pt-BR')}</p></div> : null}{creative.permalink ? <a target="_blank" rel="noopener noreferrer" className="muted mt-3 block text-xs" href={creative.permalink}>Abrir publicação ↗</a> : null}</div></article>)}</div>{!filteredCreatives.length ? <p className="muted py-10 text-center">Nenhum conteúdo importado no período.</p> : null}</Card> : null}

    {params.section === 'external' ? <><Card><h2 className="mb-3 text-lg font-semibold">Importar receita real</h2><p className="muted mb-5 text-sm">Importe CSV com datas, receita e compras conciliadas por dia. A importação é validada antes de gravar.</p><UploadForm organizationId={org.id} /></Card><Card><h2 className="mb-4 font-semibold">Registros de receita</h2><p className="muted">{data.crm.length} registros no período selecionado.</p></Card></> : null}
  </div>;
}
