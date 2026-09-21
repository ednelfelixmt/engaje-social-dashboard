'use client';

import {useMemo, useState} from 'react';
import {BarChart3, CircleDollarSign, MousePointerClick, Users} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {LeadBreakdown} from '@/components/dashboard/lead-breakdown';
import {money, number} from '@/lib/utils';
import type {CampaignPerformance, Platform} from '@/types/domain';

const platformNames: Partial<Record<Platform, string>> = {meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads'};
const platformMarks: Partial<Record<Platform, string>> = {meta_ads: 'META', google_ads: 'G ADS', tiktok_ads: 'TIKTOK'};
type Metric = 'spend' | 'impressions' | 'clicks' | 'leads' | 'registrationLeads' | 'messageLeads' | 'cpl' | 'costPerRegistration' | 'costPerMessage' | 'cpc' | 'ctr';

function total(rows: CampaignPerformance[], key: keyof CampaignPerformance) {
  if (!rows.length || rows.every((row) => row[key] == null)) return null;
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function costFor(rows: CampaignPerformance[], key: 'leads' | 'registrationLeads' | 'messageLeads') {
  const available = rows.filter((row) => row[key] != null);
  const count = available.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  const spend = available.reduce((sum, row) => sum + row.spend, 0);
  return count > 0 ? spend / count : null;
}

function summary(rows: CampaignPerformance[]) {
  const spend = total(rows, 'spend');
  const impressions = total(rows, 'impressions');
  const clicks = total(rows, 'clicks');
  const leads = total(rows, 'leads');
  const registrationLeads = total(rows, 'registrationLeads');
  const messageLeads = total(rows, 'messageLeads');
  return {
    spend, impressions, clicks, leads, registrationLeads, messageLeads,
    cpl: costFor(rows, 'leads'),
    costPerRegistration: costFor(rows, 'registrationLeads'),
    costPerMessage: costFor(rows, 'messageLeads'),
    cpc: clicks && spend != null ? spend / clicks : null,
    ctr: impressions && clicks != null ? clicks / impressions * 100 : null,
  };
}

function formatMetric(metric: Metric, value: number | null, currency: string) {
  if (['spend', 'cpl', 'costPerRegistration', 'costPerMessage', 'cpc'].includes(metric)) return money(value, currency);
  if (metric === 'ctr') return value == null ? '—' : `${number(value, 2)}%`;
  return number(value);
}

export function CampaignOverview({rows, currency}: {rows: CampaignPerformance[]; currency: string}) {
  const [metric, setMetric] = useState<Metric>('spend');
  const platforms = useMemo(() => [...new Set(rows.map((row) => row.platform))], [rows]);
  const all = summary(rows);
  const groups = platforms.map((platform) => ({platform, rows: rows.filter((row) => row.platform === platform)}));
  const metricOptions: {key: Metric; label: string}[] = [
    {key: 'spend', label: 'Investimento'}, {key: 'impressions', label: 'Impressões'}, {key: 'clicks', label: 'Cliques'},
    {key: 'leads', label: 'Todos os leads'}, {key: 'registrationLeads', label: 'Cadastros'}, {key: 'messageLeads', label: 'Mensagens'},
    {key: 'cpl', label: 'CPL'}, {key: 'costPerRegistration', label: 'Custo/cadastro'}, {key: 'costPerMessage', label: 'Custo/mensagem'}, {key: 'cpc', label: 'CPC'}, {key: 'ctr', label: 'CTR'},
  ];

  return <div className="campaign-report overflow-hidden rounded-2xl border border-white/10 bg-[#121218]">
    <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4">
      <div><p className="eyebrow">Tráfego pago</p><h2 className="mt-1 text-lg font-semibold tracking-wide">PERFORMANCE DE CAMPANHAS</h2></div>
      <BarChart3 className="text-primary" size={20} />
    </div>

    <div className="space-y-5 p-5">
      <section className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3 xl:grid-cols-6">
        {groups.map(({platform, rows: platformRows}) => <div className="bg-[#18181f] p-4" key={`${platform}-spend`}><p className="text-[10px] font-bold text-primary">{platformMarks[platform] ?? platform}</p><strong className="mt-2 block text-xl">{money(summary(platformRows).spend, currency)}</strong><span className="text-xs text-zinc-500">Investimento</span></div>)}
        <div className="bg-black/60 p-4"><p className="text-[10px] font-bold text-zinc-400">TOTAL</p><strong className="mt-2 block text-xl">{money(all.spend, currency)}</strong><span className="text-xs text-zinc-500">Investimento</span></div>
        {groups.map(({platform, rows: platformRows}) => <div className="bg-[#18181f] p-4" key={`${platform}-leads`}><p className="text-[10px] font-bold text-primary">{platformMarks[platform] ?? platform}</p><strong className="mt-2 block text-xl">{number(summary(platformRows).leads)}</strong><span className="text-xs text-zinc-500">Leads</span></div>)}
        <div className="bg-black/60 p-4"><p className="text-[10px] font-bold text-zinc-400">TOTAL</p><strong className="mt-2 block text-xl">{number(all.leads)}</strong><span className="text-xs text-zinc-500">Leads</span></div>
      </section>

      <LeadBreakdown totalLeads={all.leads} registrationLeads={all.registrationLeads} messageLeads={all.messageLeads} totalCost={all.cpl} registrationCost={all.costPerRegistration} messageCost={all.costPerMessage} currency={currency} />

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
        <span className="px-3 text-xs font-semibold text-zinc-500">Exibir:</span>
        {metricOptions.map((option) => <button type="button" key={option.key} onClick={() => setMetric(option.key)} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${metric === option.key ? 'bg-primary text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{option.label}</button>)}
      </section>

      <section className={`grid gap-4 ${groups.length > 1 ? 'lg:grid-cols-2 xl:grid-cols-3' : ''}`}>
        {groups.map(({platform, rows: platformRows}) => {
          const current = summary(platformRows);
          const value = current[metric];
          const max = Math.max(...groups.map((group) => Number(summary(group.rows)[metric] ?? 0)), 1);
          return <Card className="min-h-52 !rounded-xl !p-5" key={platform}>
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-primary">{platformNames[platform] ?? platform}</p><strong className="mt-3 block text-2xl">{formatMetric(metric, value, currency)}</strong><span className="text-xs text-zinc-500">{metricOptions.find((item) => item.key === metric)?.label}</span></div><CircleDollarSign className="text-zinc-600" size={22} /></div>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary" style={{width: `${value == null ? 0 : Math.max(4, Number(value) / max * 100)}%`}} /></div>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs"><div><span className="text-zinc-600">Impressões</span><strong className="mt-1 block">{number(current.impressions)}</strong></div><div><span className="text-zinc-600">Cliques</span><strong className="mt-1 block">{number(current.clicks)}</strong></div><div><span className="text-zinc-600">Leads</span><strong className="mt-1 block">{number(current.leads)}</strong></div></div>
          </Card>;
        })}
      </section>

      <Card className="!rounded-xl !p-5">
        <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Consolidado por fonte</p><h3 className="mt-2 font-semibold">Investimento e geração de demanda</h3></div><MousePointerClick className="text-primary" size={19} /></div>
        <div className="overflow-x-auto"><table><thead><tr><th>Fonte</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>Todos os leads</th><th>CPL</th><th>Cadastros</th><th>Custo/cadastro</th><th>Mensagens</th><th>Custo/mensagem</th><th>CPC</th><th>CTR</th></tr></thead><tbody>{groups.map(({platform, rows: platformRows}) => {const item = summary(platformRows); return <tr key={platform}><td><strong>{platformNames[platform] ?? platform}</strong></td><td>{money(item.spend, currency)}</td><td>{number(item.impressions)}</td><td>{number(item.clicks)}</td><td>{number(item.leads)}</td><td>{money(item.cpl, currency)}</td><td>{number(item.registrationLeads)}</td><td>{money(item.costPerRegistration, currency)}</td><td>{number(item.messageLeads)}</td><td>{money(item.costPerMessage, currency)}</td><td>{money(item.cpc, currency)}</td><td>{item.ctr == null ? '—' : `${number(item.ctr, 2)}%`}</td></tr>;})}</tbody></table></div>
        {!rows.length ? <div className="grid min-h-48 place-items-center text-center"><div><Users className="mx-auto text-zinc-700" /><p className="mt-3 text-sm text-zinc-400">Nenhuma campanha com movimento no período selecionado.</p><p className="mt-1 text-xs text-zinc-600">Atualize os integradores ou selecione um intervalo com veiculação.</p></div></div> : null}
      </Card>
    </div>
  </div>;
}
