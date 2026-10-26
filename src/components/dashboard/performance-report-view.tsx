import {Card} from '@/components/ui/card';
import {performanceMetrics, performanceDelta, comparableAttribution, type PerformanceGroup, type PerformancePeriod, type PerformanceReport} from '@/lib/reports/performance-report';
import type {PaidMetricKey} from '@/lib/metrics/paid-metrics';
import {PerformanceReportPrint} from './performance-report-print';
import {PerformanceReportExport} from './performance-report-export';
import {performanceReportCsv, performanceReportFilename} from '@/lib/export/performance-report';

const labels: Record<PaidMetricKey, string> = {spend: 'Investimento', impressions: 'Impressões', clicks: 'Cliques', leads: 'Leads atribuídos', ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', cpl: 'CPL atribuído'};
const platformLabel = (key: string) => ({meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads'}[key] ?? key);
function value(number: number | null, metric: PaidMetricKey, currency: string) {
 if (number === null) return '—';
 if (['spend', 'cpc', 'cpm', 'cpl'].includes(metric)) return new Intl.NumberFormat('pt-BR', {style: 'currency', currency}).format(number);
 return new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2}).format(number) + (metric === 'ctr' ? '%' : '');
}
function change(current: PerformancePeriod, previous: PerformancePeriod | null, metric: PaidMetricKey) {
 const delta = performanceDelta(current, previous, metric);
 return delta === null ? 'Variação indisponível' : (delta > 0 ? '+' : '') + new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2}).format(delta) + '% vs. comparativo';
}
function Source({period, title}: {period: PerformancePeriod; title: string}) {
 return <section aria-label={title} className="space-y-2 text-sm">
  <h3 className="font-semibold">{title}: {period.from} a {period.to}</h3>
  <p>{period.sourceIds.length} registros recebidos. Observações válidas: investimento {period.coverage.spend}, impressões {period.coverage.impressions}, cliques {period.coverage.clicks}, leads {period.coverage.leads}.</p>
  <ul className="space-y-1">{period.attribution.map(entry => <li key={JSON.stringify([entry.platform, entry.account])}>{platformLabel(entry.platform)} · Conta {entry.account} · Janela reportada: {entry.windows.map(window => window || 'não informada').join(' / ')}</li>)}</ul>
 </section>;
}
function Detail({groups, campaigns, currency, comparison}: {groups: PerformanceGroup[]; campaigns?: boolean; currency: string; comparison: boolean}) {
 return <div className="performance-table overflow-x-auto"><table className="w-full text-left text-sm">
  <caption className="py-3 text-left text-zinc-400">{campaigns ? 'Campanhas com fatos em pelo menos um período' : 'Plataformas com fatos em pelo menos um período'}. {comparison ? 'Cada linha apresenta os dois períodos; ausência permanece indisponível.' : 'Período selecionado.'}</caption>
  <thead><tr><th scope="col" className="p-2">{campaigns ? 'Campanha / conta' : 'Plataforma'}</th><th scope="col" className="p-2">Período</th>{performanceMetrics.map(metric => <th scope="col" className="p-2" key={metric}>{labels[metric]}</th>)}</tr></thead>
  <tbody>{groups.flatMap(group => [{name: 'Atual', data: group.current}, ...(group.previous ? [{name: 'Comparativo', data: group.previous}] : [])].map(({name, data}) => <tr className="border-t border-white/10 align-top" key={group.key + name}>
   <th scope="row" className="p-2 font-medium">{campaigns ? group.label : platformLabel(group.platform)}{campaigns ? <small className="block text-zinc-400">{platformLabel(group.platform)} · {group.account} · {group.campaignId}</small> : null}</th>
   <td className="p-2">{name}<small className="block">{data.from} a {data.to}</small><small className="block">{data.sourceIds.length} registros</small></td>
   {performanceMetrics.map(metric => <td className="p-2 tabular-nums" key={metric}>{value(data.totals[metric], metric, currency)}</td>)}
  </tr>))}</tbody>
 </table></div>;
}
export function PerformanceReportView({report}: {report: PerformanceReport}) {
 const {scope, current, previous} = report;
 const empty = !current.sourceIds.length && !previous?.sourceIds.length;
 return <article className="performance-report space-y-5" aria-label="Relatório executivo de mídia paga">
  <Card><h2 className="text-lg font-semibold">Resumo executivo · {scope.organizationName}</h2><p className="mt-2 text-sm text-zinc-400">Período atual: {scope.from} a {scope.to} · {scope.currency} · Fuso cadastral: {scope.timezone}</p>
   <p className="mt-2 text-xs text-zinc-400">Gerado em {new Intl.DateTimeFormat('pt-BR', {timeZone: scope.timezone, dateStyle: 'short', timeStyle: 'short'}).format(new Date(scope.generatedAt))} ({scope.timezone}). Datas diárias conforme a fonte, sem conversão.</p>
   <div className="mt-4 flex flex-wrap items-start gap-4"><PerformanceReportPrint disabled={empty}/><PerformanceReportExport content={empty ? '' : performanceReportCsv(report)} filename={performanceReportFilename(scope)} disabled={empty}/></div>
  </Card>
  {empty ? <Card><p>Sem registros de mídia paga nos períodos selecionados. Nenhum zero foi presumido.</p></Card> : null}
  <section aria-label="Indicadores consolidados" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{performanceMetrics.map(metric => <Card key={metric}>
   <h3 className="text-sm text-zinc-400">{labels[metric]}</h3><strong className="mt-2 block text-2xl">{value(current.totals[metric], metric, scope.currency)}</strong>
   {previous ? <p className="mt-2 text-xs text-zinc-400">Comparativo: {value(previous.totals[metric], metric, scope.currency)} · {change(current, previous, metric)}</p> : null}
  </Card>)}</section>
  <Card><h2 className="text-lg font-semibold">Origem, cobertura e limites</h2><div className="mt-3 space-y-4 text-zinc-400"><Source period={current} title="Atual"/>{previous ? <Source period={previous} title="Comparativo"/> : null}
   <p className="text-sm">Fonte: fatos diários de anúncios. Cobertura descreve apenas registros recebidos; não comprova coleta completa. Totais com observações ausentes, inválidas ou em overflow ficam indisponíveis. CTR, CPC, CPM e CPL usam razões dos totais, sem média de percentuais.</p>
   <p className="text-sm">Leads são atribuições reportadas pelas plataformas, podem se sobrepor entre canais e não representam pessoas únicas ou vendas. Receita e ROI não são calculados neste relatório.</p>
   {previous && !comparableAttribution(current, previous) ? <p className="text-sm">Variação de leads e CPL indisponível: contas e janelas de atribuição precisam ser conhecidas, únicas por conta e equivalentes nos dois períodos.</p> : null}
  </div></Card>
  {report.platforms.length ? <Card><h2 className="text-lg font-semibold">Por plataforma</h2><Detail groups={report.platforms} currency={scope.currency} comparison={!!previous}/></Card> : null}
  {report.campaigns.length ? <Card><h2 className="text-lg font-semibold">Por campanha</h2><Detail groups={report.campaigns} campaigns currency={scope.currency} comparison={!!previous}/></Card> : null}
 </article>;
}
