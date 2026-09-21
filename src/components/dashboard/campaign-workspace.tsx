import {
  BadgeDollarSign,
  Eye,
  Gauge,
  MousePointerClick,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {Timeline} from '@/components/dashboard/charts';
import {Ranking} from '@/components/dashboard/ranking';
import {Funnel} from '@/components/dashboard/funnel';
import {money, number} from '@/lib/utils';
import type {CampaignPerformance, Platform} from '@/types/domain';

type TimelineRow = {date: string; spend: number | null; revenue: number | null};

const platformLabels: Partial<Record<Platform, string>> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
};

function total(rows: CampaignPerformance[], key: keyof CampaignPerformance) {
  if (!rows.length || rows.some((row) => row[key] == null)) return null;
  return rows.reduce((value, row) => value + Number(row[key]), 0);
}

function metrics(rows: CampaignPerformance[]) {
  const spend = total(rows, 'spend');
  const revenue = total(rows, 'revenue');
  const impressions = total(rows, 'impressions');
  const clicks = total(rows, 'clicks');
  const pageViews = total(rows, 'pageViews');
  const leads = total(rows, 'leads');
  const messageRows = rows.filter((row) => row.platform === 'meta_ads' && row.messageLeads != null);
  const messageLeads = messageRows.length ? messageRows.reduce((value, row) => value + Number(row.messageLeads), 0) : null;
  const checkouts = total(rows, 'checkouts');
  const purchases = total(rows, 'purchases');

  return {
    spend,
    revenue,
    impressions,
    clicks,
    pageViews,
    leads,
    messageLeads,
    checkouts,
    purchases,
    ctr: impressions && clicks != null ? clicks / impressions * 100 : null,
    cpm: impressions && spend != null ? spend / impressions * 1000 : null,
    cpc: clicks && spend != null ? spend / clicks : null,
    cpl: leads && spend != null ? spend / leads : null,
    cpa: purchases && spend != null ? spend / purchases : null,
    roas: spend && revenue != null ? revenue / spend : null,
  };
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

function TrafficFunnel({rows, currency}: {rows: CampaignPerformance[]; currency: string}) {
  const summary = metrics(rows);
  const steps = [
    {label: 'Impressões', value: summary.impressions, cost: summary.cpm, costLabel: 'CPM'},
    {label: 'Cliques', value: summary.clicks, cost: summary.cpc, costLabel: 'CPC'},
    {label: 'Page views', value: summary.pageViews, cost: summary.pageViews && summary.spend != null ? summary.spend / summary.pageViews : null, costLabel: 'CPV'},
    {label: 'Leads', value: summary.leads, cost: summary.cpl, costLabel: 'CPL', detail: summary.messageLeads == null ? null : `${number(summary.messageLeads)} por mensagens`},
    {label: 'Checkouts', value: summary.checkouts, cost: summary.checkouts && summary.spend != null ? summary.spend / summary.checkouts : null, costLabel: 'CPCO'},
    {label: 'Compras', value: summary.purchases, cost: summary.cpa, costLabel: 'CPA'},
  ];
  return <Card className="h-full">
    <div className="flex items-center justify-between gap-4">
      <div><p className="eyebrow">Jornada de conversão</p><h2 className="mt-2 text-lg font-semibold">Funil de campanhas</h2></div>
      <Target className="text-primary" size={20} />
    </div>
    <Funnel steps={steps} currency={currency} />
  </Card>;
}

function PlatformBreakdown({rows, currency}: {rows: CampaignPerformance[]; currency: string}) {
  const platforms = [...new Set(rows.map((row) => row.platform))];
  if (!platforms.length) return null;

  return <div className="grid gap-4 lg:grid-cols-3">
    {platforms.map((platform) => {
      const summary = metrics(rows.filter((row) => row.platform === platform));
      return <Card className="!p-5" key={platform}>
        <div className="flex items-center justify-between"><strong>{platformLabels[platform] || platform}</strong><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Com dados</span></div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-zinc-500">Investimento</p><strong className="mt-1 block">{money(summary.spend, currency)}</strong></div>
          <div><p className="text-xs text-zinc-500">Receita</p><strong className="mt-1 block">{money(summary.revenue, currency)}</strong></div>
          <div><p className="text-xs text-zinc-500">Leads</p><strong className="mt-1 block">{number(summary.leads)}</strong></div>
          <div><p className="text-xs text-zinc-500">ROAS</p><strong className="mt-1 block">{summary.roas == null ? '—' : `${number(summary.roas, 2)}x`}</strong></div>
        </div>
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
}: {
  rows: CampaignPerformance[];
  previousRows: CampaignPerformance[];
  timeline: TimelineRow[];
  currency: string;
  showPlatforms?: boolean;
}) {
  const current = metrics(rows);
  const previous = metrics(previousRows);
  const kpis = [
    {label: 'Investimento', value: current.spend, previous: previous.spend, format: (value: number | null) => money(value, currency), icon: BadgeDollarSign},
    {label: 'Impressões', value: current.impressions, previous: previous.impressions, format: (value: number | null) => number(value), icon: Eye},
    {label: 'Cliques', value: current.clicks, previous: previous.clicks, format: (value: number | null) => number(value), icon: MousePointerClick},
    {label: 'Leads', value: current.leads, previous: previous.leads, format: (value: number | null) => number(value), icon: Users},
    {label: 'Leads por mensagens', value: current.messageLeads, previous: previous.messageLeads, format: (value: number | null) => number(value), icon: Users},
    {label: 'CTR', value: current.ctr, previous: previous.ctr, format: (value: number | null) => value == null ? '—' : `${number(value, 2)}%`, icon: TrendingUp},
    {label: 'CPC', value: current.cpc, previous: previous.cpc, format: (value: number | null) => money(value, currency), inverse: true, icon: Gauge},
    {label: 'CPL', value: current.cpl, previous: previous.cpl, format: (value: number | null) => money(value, currency), inverse: true, icon: Target},
    {label: 'Compras', value: current.purchases, previous: previous.purchases, format: (value: number | null) => number(value), icon: ShoppingCart},
  ];

  return <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
    </section>
    {showPlatforms ? <PlatformBreakdown rows={rows} currency={currency} /> : null}
    <section className="grid gap-5 2xl:grid-cols-[0.9fr_1.4fr]">
      <TrafficFunnel rows={rows} currency={currency} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Evolução temporal</p><h2 className="mt-2 text-lg font-semibold">Investimento e receita atribuída</h2></div><p className="max-w-md text-right text-xs text-zinc-500">Receita real conciliada quando disponível; receita da plataforma como alternativa.</p></div>
        <Timeline rows={timeline} />
      </Card>
    </section>
    <Card>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Análise detalhada</p><h2 className="mt-2 text-lg font-semibold">Ranking de campanhas</h2></div><p className="text-xs text-zinc-500">Ordene por investimento, retorno ou receita.</p></div>
      <Ranking rows={rows} currency={currency} />
    </Card>
    <section className="grid gap-5 2xl:grid-cols-2">
      <ComparisonPanel currentRows={rows} previousRows={previousRows} currency={currency} />
      <AttentionPanel rows={rows} currency={currency} />
    </section>
  </div>;
}
