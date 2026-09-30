'use client';

import {useMemo, useState} from 'react';
import {BarChart3, CircleDollarSign, MousePointerClick, Users} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {LeadBreakdown} from '@/components/dashboard/lead-breakdown';
import {money, number} from '@/lib/utils';
import {dashboardMetricLabels, paidMetricKeys, type DashboardMetricKey} from '@/lib/metrics/catalog';
import type {CampaignPerformance, Platform} from '@/types/domain';
import {paidSummary} from '@/lib/metrics/paid-summary';
import {computeDelta} from '@/lib/metrics/delta';
import {ArrowDownRight, ArrowUpRight, Minus} from 'lucide-react';

const platformNames: Partial<Record<Platform, string>> = {meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads'};
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
  const [metric, setMetric] = useState<Metric>((metricOptions[0]?.key ?? 'spend') as Metric);
  const platforms = useMemo(() => [...new Set(rows.map((row) => row.platform))], [rows]);
  const all = summary(rows);
  const previousAll = summary(previousRows);
  const hasPrevious = comparing && previousRows.length > 0;
  const groups = platforms.map((platform) => ({platform, rows: rows.filter((row) => row.platform === platform)}));
  const showLeadBreakdown=['leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message'].some((key)=>enabledMetrics.includes(key));
  const quickMetrics=metricOptions.slice(0,3);
  const activeMetric=metricOptions.some((option)=>option.key===metric)?metric:metricOptions[0]?.key;

  if(!metricOptions.length)return <Card><p className="muted text-sm">Nenhuma métrica de mídia paga foi selecionada. Escolha os indicadores em Configurar dashboard.</p></Card>;

  return <div className="campaign-report overflow-hidden rounded-2xl border border-white/10 bg-[#121218]">
    <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4">
      <div><p className="eyebrow">Tráfego pago</p><h2 className="mt-1 text-lg font-semibold tracking-wide">PERFORMANCE DE CAMPANHAS</h2></div>
      <BarChart3 className="text-primary" size={20} />
    </div>

    <div className="space-y-5 p-5">
      {comparing && previousRange ? (hasPrevious
        ? <p className="text-xs text-zinc-400">Comparando com o período anterior: <strong className="text-zinc-200">{shortDate(previousRange.from)} a {shortDate(previousRange.to)}</strong>.</p>
        : <p className="rounded-xl border border-amber-400/25 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-100">Não há dados de <strong>{shortDate(previousRange.from)} a {shortDate(previousRange.to)}</strong> para comparar. Contas conectadas recentemente só têm dados a partir da data em que começaram a veicular; a sincronização importa até 6 meses de histórico quando ele existe na plataforma.</p>) : null}
      <section className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">{quickMetrics.map((option)=><div className="bg-[#18181f] p-4" key={option.key}><p className="text-[10px] font-bold text-primary">CONSOLIDADO</p><strong className="mt-2 block text-xl">{formatMetric(option.key,all[option.key as keyof typeof all] as number|null,currency)}</strong><span className="text-xs text-zinc-500">{option.label}</span><br /><DeltaChip current={all[option.key as keyof typeof all] as number|null} previous={previousAll[option.key as keyof typeof previousAll] as number|null} metric={option.key} comparing={hasPrevious} /></div>)}</section>

      {showLeadBreakdown?<LeadBreakdown totalLeads={all.leads} registrationLeads={all.registration_leads} messageLeads={all.message_leads} totalCost={all.cpl} registrationCost={all.cost_per_registration} messageCost={all.cost_per_message} currency={currency} />:null}

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
        <span className="px-3 text-xs font-semibold text-zinc-500">Exibir:</span>
        {metricOptions.map((option) => <button type="button" key={option.key} onClick={() => setMetric(option.key)} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeMetric === option.key ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{option.label}</button>)}
      </section>

      <section className={`grid gap-4 ${groups.length > 1 ? 'lg:grid-cols-2 xl:grid-cols-3' : ''}`}>
        {groups.map(({platform, rows: platformRows}) => {
          const current = summary(platformRows);
          const previousPlatform = summary(previousRows.filter((row) => row.platform === platform));
          const value = current[activeMetric!];
          const max = Math.max(...groups.map((group) => Number(summary(group.rows)[activeMetric!] ?? 0)), 1);
          return <Card className="min-h-52 !rounded-xl !p-5" key={platform}>
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-primary">{platformNames[platform] ?? platform}</p><strong className="mt-3 block text-2xl">{formatMetric(activeMetric!, value, currency)}</strong><span className="text-xs text-zinc-500">{metricOptions.find((item) => item.key === activeMetric)?.label}</span><br /><DeltaChip current={value} previous={previousPlatform[activeMetric!]} metric={activeMetric!} comparing={hasPrevious} /></div><CircleDollarSign className="text-zinc-600" size={22} /></div>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary" style={{width: `${value == null ? 0 : Math.max(4, Number(value) / max * 100)}%`}} /></div>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">{quickMetrics.map((option)=><div key={option.key}><span className="text-zinc-600">{option.label}</span><strong className="mt-1 block">{formatMetric(option.key,current[option.key as keyof typeof current] as number|null,currency)}</strong></div>)}</div>
          </Card>;
        })}
      </section>

      <Card className="!rounded-xl !p-5">
        <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Consolidado por fonte</p><h3 className="mt-2 font-semibold">Investimento e geração de demanda</h3></div><MousePointerClick className="text-primary" size={19} /></div>
        <div className="overflow-x-auto"><table><thead><tr><th>Fonte</th>{metricOptions.map((option)=><th key={option.key}>{option.label}</th>)}</tr></thead><tbody>{groups.map(({platform, rows: platformRows}) => {const item = summary(platformRows); return <tr key={platform}><td><strong>{platformNames[platform] ?? platform}</strong></td>{metricOptions.map((option)=><td key={option.key}>{formatMetric(option.key,item[option.key as keyof typeof item] as number|null,currency)}</td>)}</tr>;})}</tbody></table></div>
        {!rows.length ? <div className="grid min-h-48 place-items-center text-center"><div><Users className="mx-auto text-zinc-700" /><p className="mt-3 text-sm text-zinc-400">Nenhuma campanha com movimento no período selecionado.</p><p className="mt-1 text-xs text-zinc-600">Atualize os integradores ou selecione um intervalo com veiculação.</p></div></div> : null}
      </Card>
    </div>
  </div>;
}
