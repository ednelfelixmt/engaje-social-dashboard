'use client';

import {useMemo, useState} from 'react';
import {Activity, CirclePause, CircleSlash2, Layers3, Search} from 'lucide-react';
import type {CampaignPerformance} from '@/types/domain';
import {money, number} from '@/lib/utils';

const platformNames: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
};

type StatusGroup = 'active' | 'inactive' | 'attention' | 'unknown';

function statusGroup(value: string | null): StatusGroup {
  if (!value) return 'unknown';
  if (['ACTIVE', 'ENABLED'].includes(value)) return 'active';
  if (['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'REMOVED', 'ENDED'].includes(value)) return 'inactive';
  return 'attention';
}

function statusLabel(value: string | null) {
  const group = statusGroup(value);
  if (group === 'active') return 'Ativa';
  if (group === 'inactive') return 'Inativa';
  if (group === 'attention') return 'Atenção';
  return 'Não informado';
}

export function Ranking({rows, currency}: {rows: CampaignPerformance[]; currency: string}) {
  const [sort, setSort] = useState<keyof CampaignPerformance>('spend');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'attention' | 'unknown'>('all');
  const counts = useMemo(() => {
    const result: Record<StatusGroup, number> = {active: 0, inactive: 0, attention: 0, unknown: 0};
    for (const row of rows) result[statusGroup(row.campaignStatus)]++;
    return result;
  }, [rows]);
  const visibleRows = useMemo(() => [...rows]
    .filter((row) => row.campaignName.toLowerCase().includes(search.toLowerCase()))
    .filter((row) => status === 'all' || statusGroup(row.campaignStatus) === status)
    .sort((a, b) => Number(b[sort] ?? -Infinity) - Number(a[sort] ?? -Infinity)), [rows, search, sort, status]);

  return <>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" onClick={() => setStatus(status === 'active' ? 'all' : 'active')} className={`rounded-2xl border p-4 text-left transition ${status === 'active' ? 'border-emerald-400/35 bg-emerald-400/[.09]' : 'border-white/[.08] bg-white/[.025] hover:border-emerald-400/20'}`}><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-400"><Activity size={14} />Ativas</span><strong className="data-value mt-2 block text-2xl">{counts.active}</strong></button>
      <button type="button" onClick={() => setStatus(status === 'inactive' ? 'all' : 'inactive')} className={`rounded-2xl border p-4 text-left transition ${status === 'inactive' ? 'border-zinc-500/40 bg-zinc-500/[.09]' : 'border-white/[.08] bg-white/[.025] hover:border-zinc-400/20'}`}><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-zinc-400"><CirclePause size={14} />Inativas</span><strong className="data-value mt-2 block text-2xl">{counts.inactive}</strong></button>
      <button type="button" onClick={() => setStatus(status === 'attention' ? 'all' : 'attention')} className={`rounded-2xl border p-4 text-left transition ${status === 'attention' ? 'border-amber-400/35 bg-amber-400/[.09]' : 'border-white/[.08] bg-white/[.025] hover:border-amber-400/20'}`}><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-amber-300"><CircleSlash2 size={14} />Com atenção</span><strong className="data-value mt-2 block text-2xl">{counts.attention}</strong></button>
      <button type="button" onClick={() => setStatus('all')} className={`rounded-2xl border p-4 text-left transition ${status === 'all' ? 'border-primary/30 bg-primary/[.07]' : 'border-white/[.08] bg-white/[.025] hover:border-primary/20'}`}><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-primary"><Layers3 size={14} />Total</span><strong className="data-value mt-2 block text-2xl">{rows.length}</strong></button>
    </div>
    <div className="mb-5 flex flex-wrap justify-between gap-3 rounded-2xl border border-white/[.07] bg-black/10 p-3">
      <label className="relative min-w-64 flex-1 sm:max-w-sm">
        <span className="sr-only">Buscar campanha</span>
        <Search className="pointer-events-none absolute left-3 top-3 text-zinc-500" size={16} />
        <input className="w-full pl-9" aria-label="Buscar campanha" placeholder="Buscar campanha…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <select aria-label="Ordenar campanhas" value={sort} onChange={(event) => setSort(event.target.value as keyof CampaignPerformance)}>
        <option value="spend">Maior investimento</option>
        <option value="roas">Maior ROAS</option>
        <option value="roi">Maior ROI</option>
        <option value="revenue">Maior receita</option>
        <option value="leads">Mais leads</option>
        <option value="registrationLeads">Mais cadastros</option>
        <option value="messageLeads">Mais mensagens</option>
        <option value="purchases">Mais compras</option>
      </select>
    </div>
    <div className="overflow-x-auto">
      <table>
        <thead><tr>{['Campanha', 'Status', 'Investimento', 'Impressões', 'Cliques', 'Todos os leads', 'CPL', 'Cadastros', 'Custo/cadastro', 'Mensagens', 'Custo/mensagem', 'Receita', 'ROAS', 'ROI', 'CTR', 'CPA'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{visibleRows.map((row) => <tr key={row.platform + row.accountId + row.campaignId}>
          <td className="min-w-64"><strong className="font-medium text-zinc-200">{row.campaignName}</strong><small className="mt-1.5 block text-zinc-500"><span className="text-primary">{platformNames[row.platform] || row.platform}</span> · receita: {row.revenueSource}</small></td>
          <td><span className={`status-pill status-${statusGroup(row.campaignStatus)}`}>{statusLabel(row.campaignStatus)}</span></td>
          <td>{money(row.spend, currency)}</td>
          <td>{number(row.impressions)}</td>
          <td>{number(row.clicks)}</td>
          <td>{number(row.leads)}</td>
          <td>{money(row.cpl, currency)}</td>
          <td>{number(row.registrationLeads)}</td>
          <td>{money(row.costPerRegistration, currency)}</td>
          <td>{number(row.messageLeads)}</td>
          <td>{money(row.costPerMessage, currency)}</td>
          <td>{money(row.revenue, currency)}</td>
          <td>{row.roas == null ? '—' : `${number(row.roas, 2)}x`}</td>
          <td className={row.roi == null ? '' : row.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>{number(row.roi, 1)}{row.roi != null ? '%' : ''}</td>
          <td>{row.ctr == null ? '—' : `${number(row.ctr, 2)}%`}</td>
          <td>{money(row.cpa, currency)}</td>
        </tr>)}</tbody>
      </table>
      {!visibleRows.length ? <p className="muted py-12 text-center">{rows.length ? 'Nenhuma campanha corresponde à busca.' : 'Nenhuma campanha sincronizada no período.'}</p> : null}
    </div>
  </>;
}
