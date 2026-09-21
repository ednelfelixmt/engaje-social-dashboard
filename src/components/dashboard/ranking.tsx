'use client';

import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import type {CampaignPerformance} from '@/types/domain';
import {money, number} from '@/lib/utils';

const platformNames: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  tiktok_ads: 'TikTok Ads',
};

export function Ranking({rows, currency}: {rows: CampaignPerformance[]; currency: string}) {
  const [sort, setSort] = useState<keyof CampaignPerformance>('spend');
  const [search, setSearch] = useState('');
  const visibleRows = useMemo(() => [...rows]
    .filter((row) => row.campaignName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b[sort] ?? -Infinity) - Number(a[sort] ?? -Infinity)), [rows, search, sort]);

  return <>
    <div className="mb-5 flex flex-wrap justify-between gap-3">
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
        <thead><tr>{['Campanha', 'Investimento', 'Impressões', 'Cliques', 'Todos os leads', 'CPL', 'Cadastros', 'Custo/cadastro', 'Mensagens', 'Custo/mensagem', 'Receita', 'ROAS', 'ROI', 'CTR', 'CPA'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{visibleRows.map((row) => <tr key={row.platform + row.accountId + row.campaignId}>
          <td className="min-w-64"><strong className="font-medium text-zinc-200">{row.campaignName}</strong><small className="mt-1.5 block text-zinc-500"><span className="text-primary">{platformNames[row.platform] || row.platform}</span> · receita: {row.revenueSource}</small></td>
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
