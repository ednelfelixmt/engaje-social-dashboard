import Link from 'next/link';
import {Card} from '@/components/ui/card';
import {FunnelExplorer} from './funnel-explorer';
import {PerformanceReportPrint} from './performance-report-print';
import {PerformanceReportExport} from './performance-report-export';
import {funnelPlatforms,funnelReportHref,type FunnelReport} from '@/lib/reports/funnel-report';
import {funnelReportCsv,funnelReportFilename} from '@/lib/export/funnel-report';
const platforms={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
const number=(value:number|null)=>value===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
const money=(value:number|null,currency:string)=>value===null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(value);
export function FunnelReportView({report}:{report:FunnelReport}) {
 const {scope,current,previous,stages}=report,empty=!current.sourceIds.length&&!previous?.sourceIds.length;
 return <article className="performance-report space-y-5" aria-label="Relatório de funil de mídia paga">
  <nav aria-label="Plataforma do funil" data-print-hide className="flex flex-wrap gap-2">{[null,...funnelPlatforms].map(platform=><Link key={platform??'all'} aria-current={scope.platform===platform?'page':undefined} className={'rounded-xl border px-4 py-3 text-sm '+(scope.platform===platform?'border-primary/40 text-primary':'border-white/10 text-zinc-400')} href={funnelReportHref(scope.organizationSlug,scope,platform)}>{platform?platforms[platform]:'Todas as plataformas'}</Link>)}</nav>
  <Card><h2 className="text-xl font-semibold">Etapas do funil · {scope.organizationName}</h2>
   <p className="mt-2 text-sm text-zinc-400">Atual: {current.from} a {current.to} · {scope.currency} · {scope.platform?platforms[scope.platform]:'Todas as plataformas'}</p>
   {previous?<p className="mt-1 text-sm text-zinc-400">Comparativo: {previous.from} a {previous.to}</p>:null}
   <p className="mt-2 text-xs text-zinc-400">Fuso cadastral: {scope.timezone}. Datas diárias conforme a origem. Gerado em {new Intl.DateTimeFormat('pt-BR',{timeZone:scope.timezone,dateStyle:'short',timeStyle:'short'}).format(new Date(scope.generatedAt))}.</p>
   <div className="mt-4 flex flex-wrap items-start gap-4"><PerformanceReportPrint disabled={empty}/><PerformanceReportExport content={empty?'':funnelReportCsv(report)} filename={funnelReportFilename(report)} disabled={empty} note="Exportação local: cada etapa e período em linha separada. As etapas podem se sobrepor e não devem ser somadas. Campos vazios indicam indicadores indisponíveis; zero é uma medição recebida."/></div>
  </Card>
  {empty?<Card>Sem registros de mídia paga nos períodos selecionados. Nenhum zero foi presumido.</Card>:null}
  <section data-print-hide className="studio-funnel-report"><FunnelExplorer stages={stages.map(stage=>({metric:stage.metric,label:stage.label,value:stage.current.value,previousValue:stage.previous?.value??null,cost:stage.current.cost,costLabel:stage.costLabel,detail:stage.current.detail,target:stage.target}))} currency={scope.currency} comparing={previous!==null}/></section>
  <section aria-label="Etapas configuradas" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{stages.map((stage,index)=><Card key={stage.metric}>
   <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Etapa {index+1}</p><h3 className="mt-2 text-lg font-semibold" style={{color:stage.color}}>{stage.label}</h3>
   <strong className="mt-3 block text-3xl tabular-nums">{number(stage.current.value)}</strong><p className="mt-1 text-sm text-zinc-400">{stage.costLabel}: {money(stage.current.cost,scope.currency)}</p>
   <p className="mt-3 text-xs text-zinc-400">{stage.current.detail}</p>
   {stage.previous?<div className="mt-4 border-t border-white/10 pt-3 text-sm"><p>Comparativo: {number(stage.previous.value)} · {stage.costLabel}: {money(stage.previous.cost,scope.currency)}</p><p className="mt-2 text-xs text-zinc-400">{stage.previous.detail}</p></div>:null}
   {stage.target!==null?<p className="mt-3 text-xs text-amber-200">Referência cadastrada: {number(stage.target)}. Vigência não confirmada; sem cálculo de atingimento.</p>:null}
  </Card>)}</section>
  <Card><h2 className="text-lg font-semibold">Origem e limites de interpretação</h2><div className="mt-3 space-y-3 text-sm text-zinc-400">
   <p>Fonte: fatos diários de anúncios (metrics_ads). Os custos usam o investimento total dividido pelo resultado observado; CPM usa mil impressões. Totais parciais ficam indisponíveis. Alcance não é somado entre campanhas ou dias sem deduplicação comprovada.</p>
   <p>Leads e compras são atribuições das plataformas, podem se sobrepor e não representam pessoas únicas nem vendas financeiras. As etapas são indicadores independentes; a ordem configurada não comprova passagem das mesmas pessoas, taxa de conversão ou perda entre etapas.</p>
   <p>Etapas comerciais sem fonte integrada permanecem indisponíveis. Os dois períodos são apresentados separadamente, sem variações percentuais ou presunção de janelas equivalentes. Cobertura descreve registros recebidos e não comprova coleta completa.</p>
   {[{title:'Atual',period:current},...(previous?[{title:'Comparativo',period:previous}]:[])].map(({title,period})=><section key={title} aria-label={'Origem '+title}><h3 className="font-semibold text-zinc-200">{title}: {period.from} a {period.to} · {period.sourceIds.length} registros</h3><ul className="mt-2 space-y-1">{period.attribution.map(entry=><li key={JSON.stringify([entry.platform,entry.account])}>{platforms[entry.platform as keyof typeof platforms]} · Conta {entry.account} · Janela reportada: {entry.windows.map(w=>w||'não informada').join(' / ')}</li>)}</ul></section>)}
  </div></Card>
 </article>;
}
