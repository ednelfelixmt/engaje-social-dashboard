import {Card} from '@/components/ui/card';
import {PerformanceReportPrint} from './performance-report-print';
import {performanceMetrics} from '@/lib/reports/performance-report';
import {campaignDelta,type CampaignReport,type CampaignPeriod} from '@/lib/reports/campaign-report';
import type {PaidMetricKey} from '@/lib/metrics/paid-metrics';
const labels:Record<PaidMetricKey,string>={spend:'Investimento',impressions:'Impressões',clicks:'Cliques',leads:'Leads atribuídos',ctr:'CTR',cpc:'CPC',cpm:'CPM',cpl:'CPL atribuído'};
function format(value:number|null,key:PaidMetricKey,currency:string){
 if(value===null)return '—';
 const notation=value!==0&&Math.abs(value)<0.000001?'scientific':'standard';
 if(['spend','cpc','cpm','cpl'].includes(key))return new Intl.NumberFormat('pt-BR',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:6,notation}).format(value);
 return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6,notation}).format(value)+(key==='ctr'?'%':'');
}
function Days({period,title,currency}:{period:CampaignPeriod;title:string;currency:string}){
 return <Card><h2 className="text-lg font-semibold">{title}: {period.from} a {period.to}</h2><p className="mt-2 text-sm text-zinc-400">{period.sourceIds.length} registros · {period.adCount} anúncios distintos recebidos.</p>
 <div className="performance-table mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="pb-3 text-left text-zinc-400">Calendário completo do recorte. Sem registro é indisponível; zero só é exibido quando informado.</caption><thead><tr><th scope="col">Dia</th>{performanceMetrics.map(key=><th key={key} scope="col">{labels[key]}</th>)}<th scope="col">Registros / anúncios</th></tr></thead><tbody>{period.days.map(day=><tr key={day.date}><th scope="row">{day.date}</th>{performanceMetrics.map(key=><td key={key}>{format(day.totals[key],key,currency)}</td>)}<td>{day.records?day.records+' / '+day.ads:'Sem registro'}</td></tr>)}</tbody></table></div>
 </Card>;
}
export function CampaignReportView({report}:{report:CampaignReport}){
 const {scope,current,previous,selection}=report;
 const empty=!current.sourceIds.length&&!previous?.sourceIds.length;
 return <article className="performance-report space-y-4" aria-label="Detalhamento privado de campanha">
 <Card><h2 className="text-xl font-semibold">{report.name}</h2><p className="mt-2 text-sm text-zinc-400">{selection.platform} · Conta {selection.account} · Campanha {selection.campaign}</p><p className="mt-2 text-sm text-zinc-400">{scope.organizationName} · {scope.currency} · {scope.from} a {scope.to} · Fuso cadastral {scope.timezone}</p><div className="mt-4"><PerformanceReportPrint disabled={empty}/></div></Card>
 {empty?<Card><p role="status">Sem registros desta campanha, conta e moeda nos períodos selecionados. Nenhum zero foi presumido.</p></Card>:null}
 <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Valores observados nos registros">{performanceMetrics.map(key=>{const change=campaignDelta(report,key);return <Card key={key}><h2 className="text-sm text-zinc-400">{labels[key]}</h2><strong className="mt-2 block break-words text-2xl">{format(current.totals[key],key,scope.currency)}</strong><p className="mt-2 text-xs text-zinc-400">Observado nos registros recebidos · {current.knownDays[key]}/{current.days.length} dias com componentes informados.</p>{previous?<p className="mt-2 text-xs text-zinc-400">Comparativo observado: {format(previous.totals[key],key,scope.currency)} ({previous.knownDays[key]}/{previous.days.length} dias). {change===null?'Variação indisponível':(change>0?'+':'')+new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(change)+'%'}.</p>:null}</Card>;})}</section>
 <Card><h2 className="font-semibold">Origem, cobertura e comparação</h2><p className="mt-3 text-sm text-zinc-400">Fonte: anúncios diários da campanha e conta selecionadas. Os cartões somam somente os registros recebidos; lacunas do calendário não representam zero. Não confundir esses valores observados com totais de uma coleta completa.</p><p className="mt-3 text-sm text-zinc-400">Variações exigem componentes em todos os dias de ambos os períodos. Leads e CPL também exigem janelas de atribuição conhecidas e equivalentes. Razões usam os totais, sem média de taxas. Leads não são pessoas únicas ou vendas. Receita, lucro, ROI e alcance deduplicado não são inferidos.</p>
 <ul className="mt-3 space-y-1 text-xs text-zinc-500">{[{label:'Atual',period:current},...(previous?[{label:'Comparativo',period:previous}]:[])].map(({label,period})=><li key={label}>{label}: {period.attribution.map(item=>item.windows.map(value=>value||'não informada').join(' / ')).join('; ')||'janela não informada'}</li>)}</ul><p className="mt-3 text-xs text-zinc-500">Datas conforme a fonte, sem conversão. Gerado em UTC: {scope.generatedAt}. A existência de registros por dia não comprova coleta completa de todos os anúncios.</p>
 </Card>
 <Days period={current} title="Atual" currency={scope.currency}/>{previous?<Days period={previous} title="Comparativo" currency={scope.currency}/>:null}
 </article>;
}
