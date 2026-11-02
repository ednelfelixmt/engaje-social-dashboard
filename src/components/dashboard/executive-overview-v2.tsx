'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ChartFrame,ChartModeSwitch} from '@/components/charts/chart-frame';
import {TimeSeriesChart,timeSeriesModes,type TimePoint,type TimeSeriesMode} from '@/components/charts/time-series-chart';
import {DonutChart} from '@/components/charts/composition-charts';
import {RankingBarChart,rankingHeight} from '@/components/charts/ranking-bar-chart';
import {ScatterBubbleChart} from '@/components/charts/relation-charts';
import {FunnelBarsChart} from '@/components/charts/flow-charts';
import {platformColor} from '@/components/charts/tokens';
import {formatChartValue,shortDate,type ChartFormat} from '@/lib/charts/format';
import {ArrowUpRight,Activity,BarChart3,Layers3,Target,ChartScatter,Info,TrendingUp} from 'lucide-react';
import {money,number} from '@/lib/utils';
import {paidMetric,paidTotals,sumKnown,percentChange} from '@/lib/metrics/paid-metrics';
import {campaignCpl} from '@/lib/metrics/efficiency';
import {BudgetTreemap,PeriodBridge} from '@/components/dashboard/analytics-chart-library';
export type ExecutiveCampaign={id:string;name:string;platform:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null};
export type ExecutiveDay={date:string;spend:number|null;impressions:number|null;clicks:number|null;leads:number|null};
type Metric='spend'|'impressions'|'clicks'|'leads'|'ctr'|'cpc'|'cpl';
const labels:Record<Metric,string>={spend:'Investimento',impressions:'Impressões',clicks:'Cliques',leads:'Leads',ctr:'CTR',cpc:'CPC',cpl:'CPL'};
const formatOf=(k:Metric,currency:string):ChartFormat=>k==='spend'||k==='cpc'||k==='cpl'?{kind:'money',currency}:k==='ctr'?{kind:'percent'}:{kind:'count'};
const isRatio=(k:Metric)=>k==='ctr'||k==='cpc'||k==='cpl';
const channelNames:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
function rollup(rows:ExecutiveCampaign[]){return paidTotals(rows);}
function metric(r:{spend:number|null;impressions:number|null;clicks:number|null;leads:number|null},k:Metric):number|null{return paidMetric(r,k);}
function fmt(v:number|null|undefined,k:Metric,currency:string){return v==null?'—':k==='spend'||k==='cpc'||k==='cpl'?money(v,currency):k==='ctr'?number(v,2)+'%':number(v);}
function Panel({children,className=''}:{children:React.ReactNode;className?:string}){return <div className={`min-w-0 rounded-2xl border border-white/[.09] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,.045),transparent_75%)] bg-[#101722] p-4 shadow-[0_8px_35px_rgba(0,0,0,.12)] ${className}`}>{children}</div>;}
function SectionHeading({eyebrow,title,aside}:{eyebrow:string;title:string;aside?:React.ReactNode}){return <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-zinc-500">{eyebrow}</p><h3 className="mt-1 text-sm font-semibold tracking-tight text-white">{title}</h3></div>{aside}</div>;}
function Kpi({label,value,change,subtitle,kind}:{label:string;value:string;change:number|null;subtitle:string;kind?:'lower'|'higher'}){
 const positive=change==null?null:kind==='lower'?change<=0:kind==='higher'?change>=0:null;
 return <Panel className="!p-3.5"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-zinc-400">{label}</p><Activity size={13} className="text-zinc-600"/></div><p className="mt-2 text-[clamp(1.3rem,1.7vw,1.9rem)] font-semibold tracking-tight text-white">{value}</p><div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className="text-zinc-500">{subtitle}</span><span className={positive===true?'text-emerald-300':positive===false?'text-rose-300':'text-zinc-400'}>{change==null?'Sem comparativo':`${change>0?'+':''}${number(change,1)}%`}</span></div></Panel>;
}
export function ExecutiveOverviewV2({rows,previous,days,previousDays,currency,slug,period}:{rows:ExecutiveCampaign[];previous:ExecutiveCampaign[];days:ExecutiveDay[];previousDays:ExecutiveDay[];currency:string;slug:string;period:string}){
 const [selected,setSelected]=useState<Metric>('leads');
 const [campaignMetric,setCampaignMetric]=useState<'spend'|'leads'|'cpl'>('spend');
 const [chosenMode,setChosenMode]=useState<TimeSeriesMode|null>(null);
 const aggregate=rollup(rows),prior=rollup(previous);
 const delta=(k:Metric)=>previous.length?percentChange(metric(aggregate,k),metric(prior,k)):null;
 const points=useMemo<TimePoint[]>(()=>Array.from({length:Math.max(days.length,previousDays.length)},(_,i)=>{const d=days[i],p=previousDays[i];return {label:shortDate(d?.date??p?.date)||'Dia '+(i+1),detail:d?shortDate(d.date,true):'Sem dia correspondente',current:d?metric(d,selected):null,previous:p?metric(p,selected):null,previousDetail:p?shortDate(p.date,true):undefined};}),[days,previousDays,selected]);
 const mode:TimeSeriesMode=chosenMode??(isRatio(selected)?'line':'columns');
 const comparing=previousDays.length>0;
 const channelRows=Object.keys(channelNames).map((platform)=>{const values=rows.filter(r=>r.platform===platform);return {platform,name:channelNames[platform],...rollup(values),count:values.length};});
 const activeChannels=channelRows.filter(r=>r.count>0&&r.spend!=null&&r.spend>0);
 // The authenticated route supplies measured facts only; zero is a measured result.
 const campaigns=[...rows].sort((a,b)=>b.spend-a.spend);
 const ranked=campaigns.filter(r=>metric(r,campaignMetric)!=null).sort((a,b)=>(metric(b,campaignMetric)??-1)-(metric(a,campaignMetric)??-1)).slice(0,8).map(r=>({id:r.id,label:r.name,value:metric(r,campaignMetric),color:platformColor(r.platform)}));
 const rankFormat:ChartFormat=campaignMetric==='leads'?{kind:'count'}:{kind:'money',currency};
 const scatter=campaigns.flatMap(r=>{const cpl=campaignCpl(r.spend,r.leads);return cpl===null?[]:[{id:r.id,spend:r.spend,cpl,leads:r.leads!,name:r.name}];});
 const tiers=[{name:'Impressões',value:aggregate.impressions,color:'#53a8f8'},{name:'Cliques',value:aggregate.clicks,color:'#facc15'},{name:'Leads',value:aggregate.leads,color:'#3bc7a0'}];
 const score=[{name:'Leads',value:aggregate.leads,previous:prior.leads},{name:'CTR',value:aggregate.ctr,previous:prior.ctr},{name:'CPL',value:aggregate.cpl,previous:prior.cpl}];
 const leader=campaigns[0];const leaderShare=leader&&aggregate.spend?leader.spend/aggregate.spend*100:null;
 const best=[...scatter].sort((a,b)=>a.cpl-b.cpl||b.leads-a.leads||a.name.localeCompare(b.name))[0];
 const coverage=days.length?days[0].date.split('-').reverse().join('/')+' a '+days[days.length-1].date.split('-').reverse().join('/'):'Sem datas registradas';
 return <section aria-label="Painel executivo de marketing e performance" className="space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Engaje / Performance intelligence</p><h2 className="mt-1 text-lg font-semibold text-white">Visão executiva e decisões</h2></div><div className="text-right text-[10px] text-zinc-500">Filtro: {period}<p>Datas com registros: {coverage}</p></div></div>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Kpi label="Investimento" value={rows.length?money(aggregate.spend,currency):'—'} change={delta('spend')} subtitle="Mídia paga"/><Kpi label="Impressões" value={fmt(aggregate.impressions,'impressions',currency)} change={delta('impressions')} kind="higher" subtitle="Exibições registradas"/><Kpi label="Leads atribuídos" value={fmt(aggregate.leads,'leads',currency)} change={delta('leads')} kind="higher" subtitle="Eventos, não pessoas"/><Kpi label="Custo por lead" value={fmt(aggregate.cpl,'cpl',currency)} change={delta('cpl')} kind="lower" subtitle="Investimento / leads"/></div>
  <div className="grid gap-3 xl:grid-cols-[1.65fr_1fr]">
   <Panel><SectionHeading eyebrow="Tendência e comparação" title="Evolução do indicador no período" aside={<select value={selected} onChange={e=>setSelected(e.target.value as Metric)} aria-label="Selecionar métrica da evolução" className="!h-9 !min-h-0 !py-0 !rounded-lg !text-xs">{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>}/>
    <ChartFrame bare hideTitle title={'Evolução de '+labels[selected]} height={270} empty={points.length?null:'Sem série temporal neste intervalo.'}
      actions={<ChartModeSwitch label="Estilo do gráfico" value={mode} options={timeSeriesModes} onChange={setChosenMode}/>}
      legend={comparing?[{label:'Atual',color:'var(--chart-primary)'},{label:'Anterior',color:mode==='columns'?'var(--chart-compare)':'var(--chart-compare-stroke)',kind:mode==='columns'?'compare':'dash'}]:[{label:'Atual',color:'var(--chart-primary)'}]}
      table={{columns:['Dia','Atual','Anterior'],rows:points.map(point=>[point.detail??point.label,fmt(point.current,selected,currency),fmt(point.previous??null,selected,currency)])}}>
      <TimeSeriesChart points={points} format={formatOf(selected,currency)} mode={mode} name="Atual" compare={comparing} compareName="Anterior" ariaLabel={'Evolução de '+labels[selected]+' no período'}/>
    </ChartFrame>
    <p className="mt-2 text-xs text-zinc-400">Períodos alinhados pelo índice do dia com registro, não por dia civil. Lacunas não são estimadas.</p></Panel>
   <Panel><SectionHeading eyebrow="Participação de investimento" title="Mix de mídia paga"/>{activeChannels.length?<ChartFrame bare hideTitle title="Mix de mídia paga" height="auto"><DonutChart slices={activeChannels.map(c=>({id:c.platform,label:c.name,value:c.spend,color:platformColor(c.platform)}))} format={{kind:'money',currency}} centerLabel="Total investido" ariaLabel="Participação do investimento por plataforma"/></ChartFrame>:<div className="grid h-64 place-content-center text-sm text-zinc-500">Sem investimento registrado.</div>}</Panel>
  </div>
  <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
   <Panel><SectionHeading eyebrow="Ranking de eficiência" title="Comparação das campanhas" aside={<select aria-label="Métrica do ranking de campanhas" value={campaignMetric} onChange={e=>setCampaignMetric(e.target.value as 'spend'|'leads'|'cpl')} className="!h-9 !min-h-0 !py-0 !text-xs"><option value="spend">Investimento</option><option value="leads">Leads</option><option value="cpl">CPL</option></select>}/>
    <ChartFrame bare hideTitle title={'Campanhas por '+(campaignMetric==='spend'?'investimento':campaignMetric==='leads'?'leads':'CPL')} height={rankingHeight(ranked.length)} empty={ranked.length?null:'Não há campanhas para este indicador.'}
      legend={[...new Set(ranked.map(r=>campaigns.find(c=>c.id===r.id)?.platform??''))].filter(Boolean).map(platform=>({label:channelNames[platform]??platform,color:platformColor(platform)}))}
      table={{columns:['Campanha','Valor'],rows:ranked.map(r=>[r.label,fmt(r.value,campaignMetric,currency)])}}>
      <RankingBarChart rows={ranked} format={rankFormat} ariaLabel="Ranking de campanhas"/>
    </ChartFrame></Panel>
   <Panel><SectionHeading eyebrow="Relação entre investimento e resultado" title="Matriz de escala e eficiência"/>
    <ChartFrame bare hideTitle title="Investimento e CPL por campanha" height={300} empty={scatter.length?null:'Esta análise exige campanhas com investimento observado e leads positivos. Não há pontos suficientes no período.'}
      footnote="Horizontal: investimento. Vertical: CPL. Tamanho da bolha: leads. Linhas tracejadas: medianas. Não mede qualidade comercial."
      table={{columns:['Campanha','Investimento','CPL','Leads'],rows:scatter.map(p=>[p.name,money(p.spend,currency),money(p.cpl,currency),number(p.leads)])}}>
      <ScatterBubbleChart points={scatter.map(p=>({id:p.id,label:p.name,x:p.spend,y:p.cpl,size:p.leads}))} xName="Investimento" yName="CPL" sizeName="Leads" xFormat={{kind:'money',currency}} yFormat={{kind:'money',currency}} ariaLabel="Investimento versus CPL por campanha"/>
    </ChartFrame></Panel>
  </div>
  <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr]">
   <Panel><SectionHeading eyebrow="Jornada de aquisição" title="Funil de eventos"/><FunnelBarsChart stages={tiers.map(t=>({id:t.name,label:t.name,value:t.value}))} ariaLabel="Funil de eventos de mídia"/><p className="mt-3 text-xs text-zinc-400">Eventos agregados não representam pessoas únicas.</p></Panel>
   <Panel><SectionHeading eyebrow="Mudança de performance" title="Indicadores comparativos"/><div className="space-y-5">{score.map(r=>{const k=r.name==='Leads'?'leads':r.name==='CTR'?'ctr':'cpl';const change=delta(k);return <div key={r.name}><div className="mb-2 flex justify-between text-xs"><span className="text-zinc-300">{r.name}</span><span className="font-semibold">{fmt(r.value,k,currency)}</span></div><div className="flex h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-2 rounded-full" style={{background:change!=null&&(k==='cpl'?change<=0:change>=0)?'#34d399':'#facc15',width:`${r.previous&&r.value!=null?Math.min(100,100*r.value/Math.max(r.value,r.previous)):r.value!=null?100:0}%`}}/></div><p className="mt-1 text-[10px] text-zinc-500">{change==null?'Sem comparativo disponível':(change>=0?'+':'')+number(change,1)+'% ante o período anterior'}</p></div>})}</div></Panel>
   <Panel><SectionHeading eyebrow="Diagnóstico baseado em dados" title="Onde investigar primeiro"/><div className="space-y-4">{leaderShare!=null?<div><p className="text-[10px] font-bold uppercase text-amber-300">Concentração orçamentária</p><p className="mt-1 text-xs leading-5 text-zinc-300">{number(leaderShare,1)}% da verba está em uma campanha. Verifique dependência e retorno marginal.</p></div>:null}{best?<div><p className="text-[10px] font-bold uppercase text-emerald-300">Campanha com menor CPL</p><p className="mt-1 text-xs leading-5 text-zinc-300">{best.name}: {money(best.cpl,currency)} por lead. Verifique volume e qualidade antes de escalar.</p></div>:null}{!best&&!leader?<p className="text-xs text-zinc-400">Sem campanhas suficientes para uma leitura comparativa.</p>:null}<Link href={`/${slug}/intelligence`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">Análise completa <ArrowUpRight size={14}/></Link></div></Panel>
  </div>
  <div className="grid gap-3 xl:grid-cols-2">
    <BudgetTreemap rows={rows} currency={currency}/>
    <PeriodBridge current={rows} previous={previous} currency={currency}/>
  </div>
  <p className="text-[10px] leading-5 text-zinc-500">Fontes: campanhas pagas atribuídas pelas plataformas. Alcance único, receita e ROI exigem metodologia própria e/ou dados comerciais conciliados. Linhas e barras representam valores registrados, não projeções.</p>
 </section>;
}
