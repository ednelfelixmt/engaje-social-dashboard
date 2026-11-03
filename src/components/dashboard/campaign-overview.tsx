import {BarChart3, Users} from 'lucide-react';
import {LeadBreakdown} from '@/components/dashboard/lead-breakdown';
import {money, number} from '@/lib/utils';
import {dashboardMetricLabels, paidMetricKeys, type DashboardMetricKey} from '@/lib/metrics/catalog';
import type {CampaignPerformance} from '@/types/domain';
import {paidSummary} from '@/lib/metrics/paid-summary';
import {paidWeightedMetrics, type WeightedMetricSummary} from '@/lib/metrics/weighted-metrics';
import {WeightedMetricNote} from '@/components/dashboard/weighted-metric-note';
import {computeDelta} from '@/lib/metrics/delta';
import {ArrowDownRight, ArrowUpRight, Minus} from 'lucide-react';

type Metric = string;

function summary(rows: CampaignPerformance[]) {
  return paidSummary(rows);
}

function formatMetric(metric: Metric, value: number | null, currency: string) {
  if (['spend','revenue','conversion_value','profit','cpa','cpm','cpc','cpl'].includes(metric) || metric.startsWith('cost_per_')) return money(value, currency);
  if (['ctr','unique_ctr','roi','conversion_rate','search_impression_share','search_top_impression_share','search_absolute_top_impression_share'].includes(metric)) return value == null ? '—' : `${number(value, 2)}%`;
  if (metric === 'roas' || metric === 'frequency') return value == null ? '—' : `${number(value, 2)}x`;
  return number(value);
}

function DeltaChip({current, previous, metric, comparing}: {current: number | null | undefined; previous: number | null | undefined; metric: string; comparing: boolean}) {
  if (!comparing) return null;
  const delta = computeDelta(current, previous, metric);
  if (!delta) return <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-zinc-600"><Minus size={10} />sem base de comparação</span>;
  const tone = delta.good === null ? 'text-zinc-400' : delta.good ? 'text-emerald-400' : 'text-rose-400';
  const Icon = delta.change >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold ${tone}`}><Icon size={11} />{delta.change > 0 ? '+' : ''}{number(delta.change, 1)}% vs. período anterior</span>;
}

const shortDate = (value: string) => value.split('-').reverse().slice(0, 2).join('/');

export function CampaignOverview({rows, currency, enabledMetrics, previousRows = [], comparing = false, previousRange}: {rows: CampaignPerformance[]; currency: string; enabledMetrics: string[]; previousRows?: CampaignPerformance[]; comparing?: boolean; previousRange?: {from: string; to: string} | null}) {
  const metricOptions = paidMetricKeys.filter((key)=>enabledMetrics.includes(key)).map((key)=>({key:key as Metric,label:dashboardMetricLabels[key as DashboardMetricKey]}));
  const all = summary(rows);
  const previousAll = summary(previousRows);
  const coverage: Record<string, WeightedMetricSummary> = paidWeightedMetrics(rows);
  const previousCoverage: Record<string, WeightedMetricSummary> = paidWeightedMetrics(previousRows);
  const hasPrevious = comparing && previousRows.length > 0;
  const showLeadBreakdown=['leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message'].some((key)=>enabledMetrics.includes(key));
  const quickPriority=['spend','reach','leads','cpl'];
  const quickMetrics=[...metricOptions].sort((a,b)=>{
    const ai=quickPriority.indexOf(a.key),bi=quickPriority.indexOf(b.key);
    return (ai<0?99:ai)-(bi<0?99:bi);
  }).slice(0,4);

  if(!metricOptions.length)return <div className="rounded-2xl border border-white/10 bg-[#131313] p-6"><p className="muted text-sm">Nenhuma métrica de mídia paga foi selecionada. Escolha os indicadores em Configurar dashboard.</p></div>;

  return <div className="campaign-report overflow-hidden rounded-2xl border border-white/10 bg-[#131313]">
    <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4">
      <div><p className="eyebrow">Tráfego pago</p><h2 className="mt-1 text-lg font-semibold tracking-wide">DESEMPENHO DE MÍDIA</h2></div>
      <BarChart3 className="text-primary" size={20} />
    </div>

    <div className="space-y-5 p-5">
      {comparing && previousRange ? (hasPrevious
        ? <p className="text-xs text-zinc-400">Comparando com o período anterior: <strong className="text-zinc-200">{shortDate(previousRange.from)} a {shortDate(previousRange.to)}</strong>.</p>
        : <p className="rounded-xl border border-amber-400/25 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100">Não há dados de <strong>{shortDate(previousRange.from)} a {shortDate(previousRange.to)}</strong> para comparar. Contas conectadas recentemente só têm dados a partir da data em que começaram a veicular; a sincronização importa até 6 meses de histórico quando ele existe na plataforma.</p>) : null}
      <section className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">{quickMetrics.map((option)=><div className="bg-[#191919] p-5" key={option.key}><p className="text-sm font-extrabold uppercase tracking-[.08em] text-zinc-100">{option.label}</p><strong className="data-value mt-3 block text-2xl text-white">{formatMetric(option.key,all[option.key as keyof typeof all] as number|null,currency)}</strong><DeltaChip current={all[option.key as keyof typeof all] as number|null} previous={previousAll[option.key as keyof typeof previousAll] as number|null} metric={option.key} comparing={hasPrevious && (!coverage[option.key] || (coverage[option.key].status === 'complete' && previousCoverage[option.key].status === 'complete'))} /><WeightedMetricNote summary={coverage[option.key]} comparisonIncomplete={hasPrevious && !!coverage[option.key] && (coverage[option.key].status !== 'complete' || previousCoverage[option.key].status !== 'complete')} /></div>)}</section>

      {showLeadBreakdown?<LeadBreakdown totalLeads={all.leads} registrationLeads={all.registration_leads} messageLeads={all.message_leads} totalCost={all.cpl} registrationCost={all.cost_per_registration} messageCost={all.cost_per_message} currency={currency} />:null}
      {!rows.length ? <div className="grid min-h-40 place-items-center rounded-xl border border-white/10 bg-black/20 text-center"><div><Users className="mx-auto text-zinc-700" /><p className="mt-3 text-sm text-zinc-400">Nenhum resultado no período selecionado.</p><p className="mt-1 text-xs text-zinc-600">Selecione outro intervalo para consultar o histórico.</p></div></div> : null}
    </div>
  </div>;
}
