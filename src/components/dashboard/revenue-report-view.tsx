import {Card} from '@/components/ui/card';
import {RevenueReportExport} from './revenue-report-export';
import {revenueReportCsv, revenueReportFilename} from '@/lib/export/revenue-report';
import {revenueMetrics, revenueDelta, type RevenueMetric, type RevenuePeriod, type RevenueReport} from '@/lib/reports/revenue-report';
const labels: Record<RevenueMetric, string> = {revenue: 'Receita líquida informada', purchases: 'Compras informadas', leads: 'Leads informados', checkouts: 'Checkouts informados'};
function display(value: number | null, key: RevenueMetric, currency: string) {
 return value === null ? '—' : new Intl.NumberFormat('pt-BR', key === 'revenue' ? {style: 'currency', currency} : {maximumFractionDigits: 2}).format(value);
}
function Daily({period, title, currency, timezone}: {period: RevenuePeriod; title: string; currency: string; timezone: string}) {
 const syncLabel = (date: string) => new Intl.DateTimeFormat('pt-BR', {timeZone: timezone, dateStyle: 'short', timeStyle: 'short'}).format(new Date(date));
 return <Card><h2 className="text-lg font-semibold">{title}: {period.from} a {period.to}</h2>
  <p className="mt-2 text-sm text-zinc-400">{period.records} registros da fonte selecionada. {period.reconciledDays} de {period.days.length} dias com todos os registros recebidos marcados como conciliados. {period.otherSourceRecords} registros de outra fonte excluídos.</p>
  <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="pb-3 text-left text-xs text-zinc-400">Um dia sem registro permanece indisponível. A conciliação é declarada pela origem; não comprova auditoria financeira independente.</caption>
   <thead><tr><th scope="col">Dia</th>{revenueMetrics.map(key => <th key={key} scope="col">{labels[key]}</th>)}<th scope="col">Conciliação</th><th scope="col">Origem dos registros</th></tr></thead>
   <tbody>{period.days.map(day => <tr key={day.date}>
    <th scope="row">{day.date}</th>{revenueMetrics.map(key => <td key={key}>{display(day.values[key], key, currency)}</td>)}
    <td>{!day.sourceIds.length ? 'Sem registro' : day.reconciled ? 'Declarada pela origem' : 'Pendente'}</td>
    <td>{day.sourceIds.length ? <details><summary>{day.sourceIds.length} registros</summary><ul>{day.sourceIds.map(id => <li key={id}>{id}</li>)}</ul><p>Última sincronização recebida: {day.syncedAt ? syncLabel(day.syncedAt) + ' (' + timezone + ')' : 'indisponível'}</p></details> : '—'}</td>
   </tr>)}</tbody>
  </table></div></Card>;
}
export function RevenueReportView({report}: {report: RevenueReport}) {
 const {scope, current, previous} = report;
 const empty = current.records === 0 && (!previous || previous.records === 0);
 return <article className="space-y-4" aria-label="Análise de receita externa">
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores da fonte selecionada">{revenueMetrics.map(key => {
   const change = revenueDelta(report, key);
   return <Card key={key}><h2 className="text-sm text-zinc-400">{labels[key]}</h2><strong className="mt-2 block text-2xl">{display(current.totals[key], key, scope.currency)}</strong>
    <p className="mt-2 text-xs text-zinc-400">{current.knownDays[key]} de {current.days.length} dias com valor válido e conciliação declarada.</p>
    {previous ? <p className="mt-2 text-xs text-zinc-400">Comparativo: {display(previous.totals[key], key, scope.currency)} ({previous.knownDays[key]}/{previous.days.length} dias). {change === null ? 'Variação indisponível' : (change > 0 ? '+' : '') + new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2}).format(change) + '%'}.</p> : null}
   </Card>;
  })}</section>
  <Card><h2 className="font-semibold">Fonte e limites da análise</h2>
   <div className="mt-3"><RevenueReportExport content={empty ? '' : revenueReportCsv(report)} filename={revenueReportFilename(scope)} disabled={empty}/></div>
   <p className="mt-3 text-sm text-zinc-400">Fonte selecionada: {scope.source === 'crm' ? 'CRM' : 'Planilha'} · Moeda: {scope.currency} · Fuso cadastral: {scope.timezone}. As datas diárias seguem a origem, sem conversão.</p>
   <p className="mt-3 text-sm text-zinc-400">CRM e planilha são analisados separadamente. Não há troca automática para outra fonte nem soma entre elas. Ausência, conciliação pendente ou valor inválido tornam o total do indicador indisponível; zero só aparece quando informado. Estornos podem produzir receita negativa. Leads e eventos não são pessoas únicas.</p>
   <p className="mt-3 text-sm text-zinc-400">Este relatório apresenta valores externos registrados. Não calcula lucro, ROI, ROAS ou causalidade de campanhas, nem substitui conciliação financeira.</p>
  </Card>
  {!current.records ? <Card><p role="status">Sem registros da fonte selecionada no período atual. Se existir outra fonte, selecione-a explicitamente acima.</p></Card> : null}
  <Daily period={current} title="Atual" currency={scope.currency} timezone={scope.timezone}/>
  {previous ? <Daily period={previous} title="Comparativo" currency={scope.currency} timezone={scope.timezone}/> : null}
 </article>;
}
