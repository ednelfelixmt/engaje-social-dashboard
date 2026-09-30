import {
  BadgeDollarSign,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Target,
  TrendingUp,
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {TimelineLazy} from '@/components/dashboard/timeline-lazy';
import {Ranking} from '@/components/dashboard/ranking';
import {Funnel, type FunnelStep} from '@/components/dashboard/funnel';
import {LeadBreakdown} from '@/components/dashboard/lead-breakdown';
import {PerformanceRankings} from '@/components/dashboard/performance-rankings';
import {money, number} from '@/lib/utils';
import {dashboardMetricLabels, paidMetricKeys, type DashboardMetricKey} from '@/lib/metrics/catalog';
import type {CampaignPerformance, Platform} from '@/types/domain';
import type {PerformanceRankingGroups} from '@/lib/metrics/rankings';
import {paidSummary} from '@/lib/metrics/paid-summary';
import {SortableCardGrid} from '@/components/dashboard/sortable-card-grid';
import {Block} from '@/components/layout/block';

type TimelineRow = {date: string; spend: number | null; revenue: number | null};

const platformLabels: Partial<Record<Platform, string>> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
};

function hasMeasuredPerformance(row: CampaignPerformance) {
  return row.spend > 0
    || (row.impressions ?? 0) > 0
    || (row.clicks ?? 0) > 0
    || row.leads != null
    || row.revenue != null
    || row.purchases != null;
}

function metrics(rows: CampaignPerformance[]) {
  return paidSummary(rows);
}

const paidCardDefinitions = paidMetricKeys.map((key) => ({
  key: key as DashboardMetricKey,
  label: dashboardMetricLabels[key as DashboardMetricKey],
  inverse: ['cpa','cpm','cpc','cpl','cost_per_conversion','cost_per_registration','cost_per_message','cost_per_call','cost_per_page_view','cost_per_thruplay','cost_per_add_to_cart','cost_per_checkout','cost_per_subscription'].includes(key),
  icon: ['spend','revenue','conversion_value','profit','cpa','cpm','cpc','cpl'].includes(key) || key.startsWith('cost_per_') ? BadgeDollarSign : ['purchases','checkouts','add_to_cart'].includes(key) ? ShoppingCart : ['impressions','reach','page_views','video_views'].includes(key) ? Eye : ['clicks','link_clicks','outbound_clicks','ctr','conversion_rate'].includes(key) ? MousePointerClick : TrendingUp,
}));

function formatPaidMetric(key: string, value: number | null, currency: string) {
  if (['spend','revenue','conversion_value','profit','cpa','cpm','cpc','cpl'].includes(key) || key.startsWith('cost_per_')) return money(value, currency);
  if (['ctr','unique_ctr','roi','conversion_rate','search_impression_share','search_top_impression_share','search_absolute_top_impression_share'].includes(key)) return value == null ? '—' : `${number(value, 2)}%`;
  if (key === 'roas' || key === 'frequency') return value == null ? '—' : `${number(value, 2)}x`;
  return number(value);
}

function delta(current: number | null, previous: number | null) {
  return current != null && previous != null && previous !== 0
    ? (current - previous) / Math.abs(previous) * 100
    : null;
}

function KpiCard({
  label,
  value,
  previous,
  format,
  inverse = false,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  format: (value: number | null) => string;
  inverse?: boolean;
  icon: typeof Eye;
}) {
  const change = delta(value, previous);
  const positive = change == null ? null : inverse ? change < 0 : change > 0;

  return <Card className="group relative overflow-hidden !p-5">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
        <strong className="mt-4 block text-2xl tracking-tight text-white">{format(value)}</strong>
      </div>
      <span className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-primary"><Icon size={18} /></span>
    </div>
    <p className={`mt-4 text-xs ${change == null ? 'text-zinc-600' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {change == null ? (value == null ? 'Métrica indisponível' : 'No período selecionado') : `${change > 0 ? '+' : ''}${number(change, 1)}% vs. comparação`}
    </p>
  </Card>;
}

function TrafficFunnel({steps, currency, comparing}: {steps:FunnelStep[]; currency: string; comparing: boolean}) {
  return <Card className="h-full">
    <div className="flex items-center justify-between gap-4">
      <div><p className="eyebrow">Jornada de conversão</p><h2 className="mt-2 text-lg font-semibold">Funil de campanhas</h2></div>
      <Target className="text-primary" size={20} />
    </div>
    <Funnel steps={steps} currency={currency} comparing={comparing} />
  </Card>;
}

function PlatformBreakdown({rows, currency, enabledMetrics}: {rows: CampaignPerformance[]; currency: string; enabledMetrics: string[]}) {
  const platforms = [...new Set(rows.map((row) => row.platform))];
  const visibleMetrics = paidCardDefinitions.filter((item) => enabledMetrics.includes(item.key)).slice(0, 6);
  if (!platforms.length) return null;

  return <div className="grid gap-4 lg:grid-cols-3">
    {platforms.map((platform) => {
      const summary = metrics(rows.filter((row) => row.platform === platform));
      return <Card className="!p-5" key={platform}>
        <div className="flex items-center justify-between"><strong>{platformLabels[platform] || platform}</strong><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Com dados</span></div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">{visibleMetrics.map((metric)=><div key={metric.key}><p className="text-xs text-zinc-500">{metric.label}</p><strong className="mt-1 block">{formatPaidMetric(metric.key, summary[metric.key as keyof typeof summary] as number|null, currency)}</strong></div>)}</div>
      </Card>;
    })}
  </div>;
}

function ComparisonPanel({currentRows, previousRows, currency}: {currentRows: CampaignPerformance[]; previousRows: CampaignPerformance[]; currency: string}) {
  if (!previousRows.length) return null;
  const current = metrics(currentRows);
  const previous = metrics(previousRows);
  const comparisonRows = [
    {label: 'Investimento', current: current.spend, previous: previous.spend, format: (value: number | null) => money(value, currency), inverse: false},
    {label: 'Leads', current: current.leads, previous: previous.leads, format: (value: number | null) => number(value), inverse: false},
    {label: 'CPL', current: current.cpl, previous: previous.cpl, format: (value: number | null) => money(value, currency), inverse: true},
    {label: 'Compras', current: current.purchases, previous: previous.purchases, format: (value: number | null) => number(value), inverse: false},
    {label: 'ROAS', current: current.roas, previous: previous.roas, format: (value: number | null) => value == null ? '—' : `${number(value, 2)}x`, inverse: false},
  ];

  return <Card>
    <div className="mb-5"><p className="eyebrow">Comparativo</p><h2 className="mt-2 text-lg font-semibold">Período atual versus período comparado</h2></div>
    <div className="overflow-x-auto">
      <table><thead><tr><th>Métrica</th><th>Período atual</th><th>Período comparado</th><th>Variação</th><th>Leitura</th></tr></thead>
        <tbody>{comparisonRows.map((row) => {
          const change = delta(row.current, row.previous);
          const good = change == null ? null : row.inverse ? change < 0 : change > 0;
          return <tr key={row.label}><td className="font-medium text-zinc-200">{row.label}</td><td>{row.format(row.current)}</td><td>{row.format(row.previous)}</td><td className={change == null ? 'text-zinc-500' : good ? 'text-emerald-400' : 'text-red-400'}>{change == null ? '—' : `${change > 0 ? '+' : ''}${number(change, 1)}%`}</td><td><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${good == null ? 'bg-white/5 text-zinc-500' : good ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{good == null ? 'Sem base' : good ? 'Evolução' : 'Atenção'}</span></td></tr>;
        })}</tbody>
      </table>
    </div>
  </Card>;
}

function AttentionPanel({rows, currency}: {rows: CampaignPerformance[]; currency: string}) {
  const ranked = [...rows]
    .filter((row) => row.spend > 0)
    .sort((a, b) => {
      const aScore = (a.cpl ?? a.cpa ?? 0) - (a.roas ?? 0);
      const bScore = (b.cpl ?? b.cpa ?? 0) - (b.roas ?? 0);
      return bScore - aScore;
    })
    .slice(0, 5);
  if (!ranked.length) return null;

  return <Card>
    <div className="mb-5"><p className="eyebrow">Diagnóstico objetivo</p><h2 className="mt-2 text-lg font-semibold">Campanhas que exigem atenção</h2><p className="muted mt-2 text-xs">Priorização baseada somente em custo, geração de leads e retorno disponível.</p></div>
    <div className="space-y-3">{ranked.map((row, index) => {
      const issue = row.leads === 0
        ? 'Investimento sem leads registrados'
        : row.roas != null && row.roas < 1
          ? 'Receita atribuída abaixo do investimento'
          : row.ctr != null && row.ctr < 1
            ? 'CTR abaixo de 1%'
            : 'Revisar custo e distribuição de verba';
      return <div className="grid gap-3 rounded-xl border border-white/10 bg-black/10 p-4 md:grid-cols-[28px_1fr_auto_auto] md:items-center" key={row.platform + row.accountId + row.campaignId}>
        <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
        <div><strong className="text-sm font-medium">{row.campaignName}</strong><p className="mt-1 text-xs text-zinc-500">{issue}</p></div>
        <div className="text-sm md:text-right"><p className="text-[10px] uppercase tracking-wider text-zinc-600">Investimento</p>{money(row.spend, currency)}</div>
        <div className="text-sm md:text-right"><p className="text-[10px] uppercase tracking-wider text-zinc-600">CPL</p>{money(row.cpl, currency)}</div>
      </div>;
    })}</div>
  </Card>;
}

export function CampaignWorkspace({
  rows,
  previousRows,
  timeline,
  currency,
  showPlatforms = false,
  enabledMetrics,
  rankings,
  funnelSteps,
  storageKey,
}: {
  rows: CampaignPerformance[];
  previousRows: CampaignPerformance[];
  timeline: TimelineRow[];
  currency: string;
  showPlatforms?: boolean;
  enabledMetrics: string[];
  rankings: PerformanceRankingGroups;
  funnelSteps: FunnelStep[];
  storageKey: string;
}) {
  const measuredRows = rows.filter(hasMeasuredPerformance);
  const measuredPreviousRows = previousRows.filter(hasMeasuredPerformance);
  const current = metrics(measuredRows);
  const previous = metrics(measuredPreviousRows);
  const kpis = paidCardDefinitions.filter((item)=>enabledMetrics.includes(item.key)).map((item)=>({
    ...item,
    value: current[item.key as keyof typeof current] as number|null,
    previous: previous[item.key as keyof typeof previous] as number|null,
    format: (value:number|null)=>formatPaidMetric(item.key,value,currency),
  }));
  const showLeadBreakdown=['leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message'].some((key)=>enabledMetrics.includes(key));

  return <div className="flex flex-col gap-5">
    <Block id="kpis"><SortableCardGrid gridId="kpis" storageKey={storageKey} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6" items={kpis.map(({key,...kpi})=>({id:key,content:<KpiCard {...kpi}/>}))}/></Block>
    {showLeadBreakdown?<Block id="kpis"><LeadBreakdown totalLeads={current.leads} registrationLeads={current.registrationLeads} messageLeads={current.messageLeads} totalCost={current.cpl} registrationCost={current.costPerRegistration} messageCost={current.costPerMessage} currency={currency} /></Block>:null}
    {showPlatforms ? <Block id="platforms"><PlatformBreakdown rows={measuredRows} currency={currency} enabledMetrics={enabledMetrics} /></Block> : null}
    <Block id="funnel">
      <TrafficFunnel steps={funnelSteps} currency={currency} comparing={previousRows.length>0} />
    </Block>
    <Block id="timeline">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Evolução temporal</p><h2 className="mt-2 text-lg font-semibold">Investimento e receita atribuída</h2></div><p className="max-w-md text-right text-xs text-zinc-500">Receita real conciliada quando disponível; receita da plataforma como alternativa.</p></div>
        <TimelineLazy rows={timeline} currency={currency} />
      </Card>
    </Block>
    <Block id="campaigns"><Card>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Análise detalhada</p><h2 className="mt-2 text-lg font-semibold">Ranking de campanhas</h2></div><p className="text-xs text-zinc-500">Ordene por investimento, retorno ou receita.</p></div>
      <Ranking rows={rows} currency={currency} />
    </Card></Block>
    <Block id="creatives"><PerformanceRankings rankings={rankings} currency={currency} /></Block>
    <section className="grid gap-5 2xl:grid-cols-2" style={{order:999}}>
      <ComparisonPanel currentRows={measuredRows} previousRows={measuredPreviousRows} currency={currency} />
      <AttentionPanel rows={measuredRows} currency={currency} />
    </section>
  </div>;
}
