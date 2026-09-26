'use client';

import {useMemo, useState} from 'react';
import {BarChart3, CircleDollarSign, MousePointerClick, Users} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {LeadBreakdown} from '@/components/dashboard/lead-breakdown';
import {money, number} from '@/lib/utils';
import {dashboardMetricLabels, paidMetricKeys, type DashboardMetricKey} from '@/lib/metrics/catalog';
import type {CampaignPerformance, Platform} from '@/types/domain';

const platformNames: Partial<Record<Platform, string>> = {meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads'};
type Metric = keyof ReturnType<typeof summary>;

function total(rows: CampaignPerformance[], key: keyof CampaignPerformance) {
  if (!rows.length || rows.every((row) => row[key] == null)) return null;
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function costFor(rows: CampaignPerformance[], key: keyof CampaignPerformance) {
  const available = rows.filter((row) => row[key] != null);
  const count = available.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  const spend = available.reduce((sum, row) => sum + row.spend, 0);
  return count > 0 ? spend / count : null;
}

function summary(rows: CampaignPerformance[]) {
  const spend = total(rows, 'spend');
  const impressions = total(rows, 'impressions');
  const clicks = total(rows, 'clicks');
  const pageViews = total(rows, 'pageViews');
  const leads = total(rows, 'leads');
  const registrationLeads = total(rows, 'registrationLeads');
  const messageLeads = total(rows, 'messageLeads');
  const checkouts = total(rows, 'checkouts');
  const purchases = total(rows, 'purchases');
  const revenue = total(rows, 'revenue');
  return {
    spend, revenue, impressions, clicks, page_views:pageViews, leads, registration_leads:registrationLeads, message_leads:messageLeads, checkouts, purchases,
    roas: spend && revenue != null ? revenue / spend : null,
    roi: spend && revenue != null ? (revenue-spend)/spend*100 : null,
    cpa: purchases && spend != null ? spend/purchases : null,
    conversion_rate: clicks && purchases != null ? purchases/clicks*100 : null,
    cost_per_checkout: checkouts && spend != null ? spend/checkouts : null,
    cpm: impressions && spend != null ? spend/impressions*1000 : null,
    cpl: costFor(rows, 'leads'),
    cost_per_registration: costFor(rows, 'registrationLeads'),
    cost_per_message: costFor(rows, 'messageLeads'),
    cost_per_page_view: pageViews && spend != null ? spend/pageViews : null,
    cpc: clicks && spend != null ? spend / clicks : null,
    ctr: impressions && clicks != null ? clicks / impressions * 100 : null,
  };
}

function formatMetric(metric: Metric, value: number | null, currency: string) {
  if (['spend','revenue','cpa','cpm','cpc','cpl','cost_per_registration','cost_per_message','cost_per_page_view','cost_per_checkout'].includes(metric)) return money(value, currency);
  if (['ctr','roi','conversion_rate'].includes(metric)) return value == null ? '—' : `${number(value, 2)}%`;
  if (metric === 'roas') return value == null ? '—' : `${number(value, 2)}x`;
  return number(value);
}

export function CampaignOverview({rows, currency, enabledMetrics}: {rows: CampaignPerformance[]; currency: string; enabledMetrics: string[]}) {
  const metricOptions = paidMetricKeys.filter((key)=>enabledMetrics.includes(key)).map((key)=>({key:key as Metric,label:dashboardMetricLabels[key as DashboardMetricKey]}));
  const [metric, setMetric] = useState<Metric>((metricOptions[0]?.key ?? 'spend') as Metric);
  const platforms = useMemo(() => [...new Set(rows.map((row) => row.platform))], [rows]);
  const all = summary(rows);
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
      <section className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">{quickMetrics.map((option)=><div className="bg-[#18181f] p-4" key={option.key}><p className="text-[10px] font-bold text-primary">CONSOLIDADO</p><strong className="mt-2 block text-xl">{formatMetric(option.key,all[option.key as keyof typeof all] as number|null,currency)}</strong><span className="text-xs text-zinc-500">{option.label}</span></div>)}</section>

      {showLeadBreakdown?<LeadBreakdown totalLeads={all.leads} registrationLeads={all.registration_leads} messageLeads={all.message_leads} totalCost={all.cpl} registrationCost={all.cost_per_registration} messageCost={all.cost_per_message} currency={currency} />:null}

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
        <span className="px-3 text-xs font-semibold text-zinc-500">Exibir:</span>
        {metricOptions.map((option) => <button type="button" key={option.key} onClick={() => setMetric(option.key)} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeMetric === option.key ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{option.label}</button>)}
      </section>

      <section className={`grid gap-4 ${groups.length > 1 ? 'lg:grid-cols-2 xl:grid-cols-3' : ''}`}>
        {groups.map(({platform, rows: platformRows}) => {
          const current = summary(platformRows);
          const value = current[activeMetric!];
          const max = Math.max(...groups.map((group) => Number(summary(group.rows)[activeMetric!] ?? 0)), 1);
          return <Card className="min-h-52 !rounded-xl !p-5" key={platform}>
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-primary">{platformNames[platform] ?? platform}</p><strong className="mt-3 block text-2xl">{formatMetric(activeMetric!, value, currency)}</strong><span className="text-xs text-zinc-500">{metricOptions.find((item) => item.key === activeMetric)?.label}</span></div><CircleDollarSign className="text-zinc-600" size={22} /></div>
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
