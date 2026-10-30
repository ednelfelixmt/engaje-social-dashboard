import type {summarizeClientAds} from '@/lib/metrics/agency-overview';

export type AgencyClientCard = {
  id: string; name: string; slug: string; currency: string;
  summary: ReturnType<typeof summarizeClientAds>;
  hasData: boolean; connected: boolean; lastSync: string | null; logoUrl: string | null;
};
export type AgencyClientFilter = 'all' | 'connected' | 'attention' | 'no_data';
export type AgencyChartMetric = 'spend' | 'leads';

export function selectAgencyClients(clients: readonly AgencyClientCard[], query: string, filter: AgencyClientFilter) {
  const search = query.trim().toLocaleLowerCase('pt-BR');
  return clients.filter(client => client.name.toLocaleLowerCase('pt-BR').includes(search) &&
    (filter === 'all' || filter === 'connected' && client.connected ||
      filter === 'attention' && !client.connected || filter === 'no_data' && !client.hasData));
}

/** Bars compare observed volumes, never currencies or unavailable measurements. */
export function agencyPortfolioChart(clients: readonly AgencyClientCard[], metric: AgencyChartMetric) {
  const observed = clients.flatMap(client => {
    const value = client.summary[metric];
    return value !== null && Number.isFinite(value) && value >= 0 && client.hasData
      ? [{client, value}] : [];
  });
  const currencies = new Set(observed.map(row => row.client.summary.currency));
  const currency = currencies.size === 1 ? observed[0]?.client.summary.currency ?? null : null;
  if (metric === 'spend' && (currency === null || !/^[A-Z]{3}$/.test(currency))) {
    return {rows: [], currency: null, excluded: clients.length, totalObserved: observed.length, mixedCurrency: currencies.size > 1};
  }
  const maximum = Math.max(1, ...observed.map(row => row.value));
  const rows = [...observed].sort((a,b) => b.value-a.value || a.client.name.localeCompare(b.client.name,'pt-BR'))
    .slice(0,8).map(row => ({...row, width: row.value/maximum*100}));
  return {rows, currency, excluded: clients.length-observed.length, totalObserved: observed.length, mixedCurrency: false};
}
