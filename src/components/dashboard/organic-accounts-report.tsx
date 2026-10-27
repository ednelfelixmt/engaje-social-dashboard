import {PerformanceReportPrint} from './performance-report-print';
import {Card} from '@/components/ui/card';
import {OrganicAccountExport} from './organic-account-export';
import {organicAccountsCsv,organicAccountsFilename} from '@/lib/export/organic-accounts';
import {organicAccountLabels,organicAccountMetrics,type OrganicAccountsReport} from '@/lib/reports/organic-accounts';
const platform=(value:string)=>value==='facebook_organic'?'Facebook':'Instagram';
const number=(value:number|null)=>value===null?'—':new Intl.NumberFormat('pt-BR').format(value);
export function OrganicAccountsReportView({report}:{report:OrganicAccountsReport}){
 const {scope}=report;
 return <article aria-label="Dados orgânicos recebidos por conta" className="organic-report organic-accounts-report space-y-4">
  <PerformanceReportPrint disabled={!report.rows.length}/>
  <Card><p className="eyebrow">Dados orgânicos recebidos por conta</p><h2 className="text-xl font-semibold">{scope.organizationName}</h2>
   <p className="mt-3 text-sm text-zinc-400">Plataforma selecionada: {scope.platform==='all'?'Facebook e Instagram':platform(scope.platform)}.</p>
   <p className="mt-3 text-sm text-zinc-400">Datas registradas de {scope.from} a {scope.to}. Fuso cadastral: {scope.timezone}. A data registrada não é convertida nem alinhada ao fuso de outras contas.</p>
   <p className="mt-3 text-sm text-amber-200">Janela original de medição não confirmada. O rótulo diário armazenado não comprova atividade diária: a ingestão pode ter associado totais de vários dias à data da coleta. Estes valores não são somados, comparados ou apresentados como uma série de desempenho.</p>
   <p className="mt-3 text-sm text-zinc-400">Alcance pode se sobrepor entre datas e contas. Seguidores são estoque recebido na coleta, sem crescimento inferido ou preenchimento de outras datas. Ações em links reproduzem o campo recebido; o mapeamento específico de cliques no site do Instagram continua pendente.</p>
   <p className="mt-3 text-sm text-zinc-400">{report.rows.length} registro(s) exibido(s), de {report.accounts.length} conta(s) observada(s) neste documento. Isso não comprova que todas as contas ou medições foram coletadas. Zero recebido é zero; ausência, número inválido e coleta desconhecida mantêm o campo indisponível.</p>
   <p className="mt-3 text-xs text-zinc-500">Geração UTC: {scope.generatedAt}. Nenhuma conta esperada é deduzida a partir destes registros.</p>
  </Card>
  {report.truncated?<Card><p role="status">Documento limitado aos {report.limit} registros mais recentes. CSV, impressão e presença de registros por conta consideram somente as linhas exibidas; reduza o período ou selecione uma plataforma.</p></Card>:null}
  <div data-print-hide><OrganicAccountExport content={report.rows.length?organicAccountsCsv(report):''} filename={organicAccountsFilename(report)} disabled={!report.rows.length}/></div>
  {!report.rows.length?<Card><p role="status">Nenhum registro com rótulo diário armazenado neste recorte. Isso não representa ausência de atividade ou valores iguais a zero.</p></Card>:<>
   <section aria-label="Presença de registros por conta" className="grid gap-4 lg:grid-cols-2">{report.accounts.map(account=><Card data-organic-coverage key={JSON.stringify([account.platform,account.account])}>
    <h2 className="font-semibold break-all">{platform(account.platform)} · {account.account}</h2>
    <p className="mt-3 text-sm text-zinc-400">{account.recordDates} datas com registro exibido entre {account.selectedDates} datas do calendário selecionado. {account.datesWithoutRecord} datas sem registro exibido; isso não identifica dias sem atividade ou falha de coleta.</p>
    {account.missingDatePreview.length?<p className="mt-2 text-xs text-zinc-500">Exemplos sem registro: {account.missingDatePreview.join(', ')}.</p>:null}
    <ul className="mt-3 space-y-1 text-xs text-zinc-400">{organicAccountMetrics.map(metric=><li key={metric}>{organicAccountLabels[metric]}: campo aceito em {account.knownValues[metric]} de {account.records} registros exibidos.</li>)}</ul>
   </Card>)}</section>
   <Card><div className="organic-report-table overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm">
    <caption className="pb-4 text-left text-zinc-400">Valores recebidos por conta e data registrada. Janela de medição original não confirmada; não somar estas linhas.</caption>
    <thead><tr><th scope="col" className="p-2">Conta / origem</th><th scope="col" className="p-2">Data registrada</th><th scope="col" className="p-2">Coleta UTC</th>{organicAccountMetrics.map(metric=><th scope="col" className="p-2" key={metric}>{organicAccountLabels[metric]}</th>)}</tr></thead>
    <tbody>{report.rows.map(row=><tr key={row.id} className="border-t border-white/10 align-top">
     <th scope="row" className="break-all p-2 font-normal">{platform(row.platform)} · {row.account}</th>
     <td className="p-2"><time dateTime={row.recordDate}>{row.recordDate}</time><small className="block text-zinc-500">Rótulo armazenado: diário; janela não comprovada.</small></td>
     <td className="p-2">{row.collectionKnown?<time dateTime={row.collectedAt!}>{row.collectedAt}</time>:'Coleta desconhecida; valores indisponíveis.'}</td>
     {organicAccountMetrics.map(metric=><td key={metric} className="p-2 tabular-nums">{number(row.values[metric])}</td>)}
    </tr>)}</tbody>
   </table></div></Card>
  </>}
 </article>;
}
