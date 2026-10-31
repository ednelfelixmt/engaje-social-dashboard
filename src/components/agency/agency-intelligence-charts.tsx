'use client';

import {useId,useState} from 'react';
import {Area,Bar,Brush,CartesianGrid,ComposedChart,Line,ResponsiveContainer,Scatter,ScatterChart,Tooltip,XAxis,YAxis,ZAxis} from 'recharts';
import {ObservationCoverage} from '@/components/dashboard/observation-coverage';
import {paidMetric,type PaidMetricKey} from '@/lib/metrics/paid-metrics';
import type {AgencyIntelligenceSelection} from '@/lib/reports/agency-intelligence';
import {analyticsFormat,analyticsMetricLabels,analyticsPlatformNames} from '@/components/dashboard/analytics-charts';

export const agencyPlatformColors:Record<string,string>={meta_ads:'#2563eb',google_ads:'#d99218',tiktok_ads:'#7c51d5'};
const short=(value:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value);
const date=(value:string)=>value.split('-').reverse().join('/');
export type AgencyClientPoint={id:string;name:string;current:AgencyIntelligenceSelection['totals'];previous:AgencyIntelligenceSelection['totals'];compatible:boolean;campaigns:number};
/** Recharts wraps the original datum in payload; never use a plotted numeric value as an identity. */
export function agencyChartIdentity(entry:unknown):string|null {if(!entry||typeof entry!=='object')return null;const row=entry as {payload?:{id?:unknown};id?:unknown};const id=row.payload?.id??row.id;return typeof id==='string'?id:null;}

export function AgencyTrendChart({selection,metric,secondary,currency}:{selection:AgencyIntelligenceSelection;metric:PaidMetricKey;secondary:PaidMetricKey|'none';currency:string}) {
 const id='agency-area-'+useId().replace(/:/g,'');
 const [mode,setMode]=useState('bar');
 const [showPrior,setShowPrior]=useState(true);
 const [zoom,setZoom]=useState<{startIndex?:number;endIndex?:number}>({});
 const [focused,setFocused]=useState<number|null>(null);
 const priorAllowed=selection.compatible||!['leads','cpl'].includes(metric);
 const oneYear=new Set(selection.timeline.flatMap(row=>row.current?[row.current.from.slice(0,4)]:[])).size<=1;
 const axisDate=(value:string)=>oneYear?date(value).slice(0,5):date(value);
 const points=selection.timeline.map(row=>{
  const current=row.current?paidMetric(row.current.totals,metric):null;
  const previous=priorAllowed&&row.previous?paidMetric(row.previous.totals,metric):null;
  return {label:row.current?axisDate(row.current.from):row.previous?date(row.previous.from):'',current,previous,zeroCurrent:current===0?0:null,zeroPrevious:previous===0?0:null,secondary:secondary!=='none'&&row.current?paidMetric(row.current.totals,secondary):null,context:row};
 });
 const hasPrior=points.some(point=>point.previous!==null);
 const hasComparisonCalendar=points.some(point=>point.context.previous!==null);
 const hasPriorRecords=selection.timeline.some(point=>(point.previous?.records??0)>0);
 const hasData=points.some(point=>point.current!==null||point.previous!==null||point.secondary!==null);
 const unit=['spend','cpc','cpm','cpl'].includes(metric)?currency:metric==='ctr'?'%':'eventos';
 const calendarDays=selection.timeline.reduce((sum,row)=>sum+(row.current?.calendarDays??0),0);
 const intervals=points.flatMap((point,index)=>point.context.current?[{
  index,
  label:date(point.context.current.from)+(point.context.current.to!==point.context.current.from?' a '+date(point.context.current.to):''),
  received:point.context.current.records>0,
  detail:`${point.context.current.observedDays} de ${point.context.current.calendarDays} dias com registros; ${point.context.current.observedClients} de ${selection.selectedClients} clientes observados`,
 }]:[]);
 const start=Math.min(zoom.startIndex??0,Math.max(0,points.length-1));
 const end=Math.max(start,Math.min(zoom.endIndex??points.length-1,points.length-1));
 function inspect(point:typeof points[number]) {
  return <div className="chart-interval-inspector">
   <strong>{point.context.current?date(point.context.current.from)+' a '+date(point.context.current.to):'Sem intervalo atual equivalente'}</strong>
   <p><i/>{analyticsMetricLabels[metric]} recebido <b>{analyticsFormat(point.current,metric,currency)}</b></p>
   {hasComparisonCalendar&&showPrior?<p><i data-prior/>Comparativo · {point.context.previous?date(point.context.previous.from)+' a '+date(point.context.previous.to):'sem intervalo equivalente'} <b>{!priorAllowed&&hasPriorRecords?'atribuição não comparável':analyticsFormat(point.previous,metric,currency)}</b></p>:null}
   {secondary!=='none'?<p>{analyticsMetricLabels[secondary]} · eixo direito <b>{analyticsFormat(point.secondary,secondary,currency)}</b></p>:null}
   <small>{point.context.current?.observedDays??0}/{point.context.current?.calendarDays??0} dias com registros · {point.context.current?.observedClients??0}/{selection.selectedClients} clientes. Ausência não equivale a zero.</small>
  </div>;
 }
 return <>
  <div className="agency-chart-summary">
   <div><span>Valor do período</span><strong>{analyticsFormat(paidMetric(selection.totals,metric),metric,currency)}</strong></div>
   <div><span>Valor comparativo</span><strong>{analyticsFormat(priorAllowed?paidMetric(selection.priorTotals,metric):null,metric,currency)}</strong></div>
   <div><span>Dias com registros</span><strong>{selection.observedDays}<small> / {calendarDays} dias</small></strong></div>
  </div>
  <div className="agency-bi-chart-controls">
   <div role="group" aria-label="Estilo da evolução da agência">{[{id:'bar',label:'Colunas'},{id:'area',label:'Área'},{id:'line',label:'Linhas'}].map(item=><button type="button" key={item.id} aria-pressed={mode===item.id} onClick={()=>setMode(item.id)}>{item.label}</button>)}</div>
   <span className="agency-bi-legend"><i/>Período selecionado{hasPrior?<button type="button" aria-pressed={showPrior} onClick={()=>setShowPrior(value=>!value)}><i data-prior/>Comparativo</button>:null}{secondary!=='none'?<b>● {analyticsMetricLabels[secondary]} · eixo direito</b>:null}</span>
  </div>
  <div className="agency-chart-units"><span>{analyticsMetricLabels[metric]} · {unit}</span>{secondary!=='none'?<span>{analyticsMetricLabels[secondary]} · eixo direito</span>:null}</div>
  {hasData?<div className="agency-bi-trend" aria-label="Evolução temporal da carteira">
   <ResponsiveContainer width="100%" height="100%"><ComposedChart accessibilityLayer data={points} barGap={2} margin={{top:14,right:12,left:0,bottom:6}}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#24356f" stopOpacity={.22}/><stop offset="100%" stopColor="#24356f" stopOpacity={.01}/></linearGradient></defs>
    <CartesianGrid vertical={false} stroke="#e7edf5" strokeDasharray="3 5"/>
    <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} tick={{fontSize:12,fill:'#526079'}}/>
    <YAxis yAxisId="current" allowDecimals={metric==='ctr'||['spend','cpl','cpm','cpc'].includes(metric)} tickFormatter={short} width={58} axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#526079'}}/>
    {secondary!=='none'?<YAxis yAxisId="secondary" orientation="right" allowDecimals={secondary==='ctr'||['spend','cpl','cpm','cpc'].includes(secondary)} tickFormatter={short} width={52} axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#0e7c86'}}/>:null}
    <Tooltip cursor={{fill:'#eaf0ff',fillOpacity:.5,stroke:'#d5dff0'}} content={({active,payload})=>{const point=payload?.[0]?.payload as typeof points[number]|undefined;return active&&point?inspect(point):null;}}/>
    {/* Recharts must discover graphical series as direct children in the App Router runtime. */}
    {mode==='bar'?<Bar yAxisId="current" dataKey="current" fill="#24356f" maxBarSize={28} radius={[4,4,0,0]} isAnimationActive={false}/>:mode==='area'?<Area yAxisId="current" dataKey="current" stroke="#24356f" fill={'url(#'+id+')'} strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}} connectNulls={false} isAnimationActive={false}/>:<Line yAxisId="current" dataKey="current" stroke="#24356f" strokeWidth={2.5} dot={{r:3}} connectNulls={false} isAnimationActive={false}/>}
    {mode==='bar'&&hasPrior?<Bar yAxisId="current" dataKey="previous" hide={!showPrior} fill="#e7edf8" stroke="#6079af" strokeWidth={1.5} maxBarSize={22} radius={[4,4,0,0]} isAnimationActive={false}/>:null}
    {mode==='bar'&&hasPrior?<Line yAxisId="current" dataKey="zeroPrevious" hide={!showPrior} stroke="none" dot={{r:3,fill:'#6079af'}} connectNulls={false} isAnimationActive={false}/>:null}
    {mode==='bar'?<Line yAxisId="current" dataKey="zeroCurrent" stroke="none" dot={{r:3,fill:'#24356f'}} connectNulls={false} isAnimationActive={false}/>:null}
    {mode!=='bar'&&hasPrior?<Line yAxisId="current" dataKey="previous" hide={!showPrior} stroke="#6079af" strokeDasharray="4 4" strokeWidth={2} dot={{r:2}} connectNulls={false} isAnimationActive={false}/>:null}
    {secondary!=='none'?<Line yAxisId="secondary" dataKey="secondary" stroke="#0e7c86" strokeWidth={2} dot={{r:2}} connectNulls={false} isAnimationActive={false}/>:null}
    {points.length>7?<Brush dataKey="label" height={20} travellerWidth={8} stroke="#becce3" fill="#f4f7fc" startIndex={start} endIndex={end} onChange={value=>{if(value)setZoom(value);}}/>:null}
   </ComposedChart></ResponsiveContainer>
  </div>:<p className="agency-bi-empty">Sem medições válidas neste recorte. Use o calendário abaixo para consultar os intervalos.</p>}
  <ObservationCoverage intervals={intervals} selected={focused} onSelect={setFocused}/>
  {focused!==null&&points[focused]?<div className="chart-inspection tv-hide" role="status">{inspect(points[focused])}<button type="button" aria-label="Fechar consulta do intervalo" onClick={()=>setFocused(null)}>Fechar</button></div>:null}
  {hasComparisonCalendar&&!hasPrior?<p className="agency-bi-note" role="note">{!priorAllowed&&hasPriorRecords?'Comparativo de leads/CPL indisponível: atribuição histórica não comparável.':'Sem medições históricas para este indicador; datas do calendário comparativo permanecem disponíveis.'}</p>:null}
  <p className="agency-bi-note">Colunas agrupadas comparam intervalos na mesma escala. Marcador na base indica zero recebido; cinza no calendário indica ausência. CTR e custos são razões por intervalo. Registros de um cliente não comprovam coleta completa da carteira.</p>
 </>;
}

export function AgencyPlatformChart({rows,currency,selected,onSelect}:{rows:{platform:string;value:number|null;campaigns:number}[];currency:string;selected:string;onSelect:(platform:string)=>void}) {
 const observed=rows.filter(row=>row.campaigns>0);
 const complete=observed.length>0&&observed.every(row=>row.value!==null&&Number.isFinite(row.value)&&row.value>=0);
 const sum=complete?observed.reduce((sum,row)=>sum+row.value!,0):null;
 const total=sum!==null&&Number.isFinite(sum)?sum:null;
 return <><div className="agency-source-cards">{rows.map(row=>{
  const share=total!==null&&total>0&&row.campaigns>0&&row.value!==null?row.value/total*100:null;
  return <button type="button" key={row.platform} aria-pressed={selected===row.platform} onClick={()=>onSelect(selected===row.platform?'all':row.platform)} style={{'--source-color':agencyPlatformColors[row.platform]} as React.CSSProperties}>
   <span><i/>{analyticsPlatformNames[row.platform]}<b>{share===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(share)+'%'}</b></span>
   <strong>{analyticsFormat(row.value,'spend',currency)}</strong>
   <span className="agency-source-track" aria-hidden><i style={{width:(share??0)+'%'}}/></span>
   <small>{row.campaigns>0?row.campaigns+' campanhas com registros':'Sem registros no recorte'}</small>
  </button>;
 })}</div>{total===null?<p className="agency-bi-note">Distribuição indisponível sem valores válidos para todas as fontes observadas.</p>:null}</>;
}

export function AgencyClientRanking({rows,metric,currency,comparing,onSelect}:{rows:AgencyClientPoint[];metric:PaidMetricKey;currency:string;comparing:boolean;onSelect:(id:string)=>void}) {
 const data=rows.flatMap(row=>{const value=paidMetric(row.current,metric);return value===null?[]:[{id:row.id,name:row.name,current:value,previous:comparing&&(row.compatible||!['leads','cpl'].includes(metric))?paidMetric(row.previous,metric):null}];}).sort((a,b)=>['cpc','cpm','cpl'].includes(metric)?a.current-b.current:b.current-a.current).slice(0,8);
 const maximum=Math.max(0,...data.flatMap(row=>[row.current,row.previous??0]));
 return <>{data.length?<><div className="agency-ranking-legend"><span><i/>Período selecionado</span>{comparing?<span><i/>Comparativo · mesma escala</span>:null}</div><div className="agency-ranking-list">{data.map(row=><button type="button" key={row.id} onClick={()=>onSelect(row.id)} aria-label={'Analisar '+row.name+' no ranking da carteira'}><span className="agency-ranking-name">{row.name}<strong>{analyticsFormat(row.current,metric,currency)}</strong></span><span className="agency-ranking-track" aria-hidden><i style={{width:(maximum?row.current/maximum*100:0)+'%'}}/></span>{comparing?<><span className="agency-ranking-track is-prior" aria-hidden><i style={{width:(maximum&&row.previous!==null?row.previous/maximum*100:0)+'%'}}/></span><small>Comparativo: {analyticsFormat(row.previous,metric,currency)}</small></>:null}</button>)}</div></>:<p className="agency-bi-empty">Nenhuma medição válida para este indicador e recorte.</p>}<p className="agency-bi-note">Até oito clientes. Custos ordenados do menor para o maior; volumes e taxas, do maior para o menor. {rows.length-data.length} fora desta apresentação. Posição não comprova eficiência.</p></>;
}

export function AgencyEfficiencyChart({rows,currency,onSelect}:{rows:AgencyClientPoint[];currency:string;onSelect:(id:string)=>void}) {
 const valid=rows.filter(row=>row.current.spend!==null&&row.current.leads!==null),weighted=valid.length>0&&valid.every(row=>row.current.clicks!==null);
 const data=valid.map(row=>({id:row.id,name:row.name,spend:row.current.spend,leads:row.current.leads,cpl:row.current.cpl,size:weighted?row.current.clicks:1}));
 return <>{data.length?<><div className="agency-bi-scatter"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{left:0,right:12,top:12,bottom:12}}><CartesianGrid stroke="#e9edf5" strokeDasharray="3 5"/><XAxis type="number" dataKey="spend" name="Investimento" tickFormatter={short} tick={{fontSize:10,fill:'#738098'}} axisLine={false} tickLine={false}/><YAxis type="number" allowDecimals={false} dataKey="leads" name="Leads atribuídos" width={45} tickFormatter={short} tick={{fontSize:10,fill:'#738098'}} axisLine={false} tickLine={false}/><ZAxis type="number" dataKey="size" range={weighted?[60,500]:[150,150]}/><Tooltip cursor={{strokeDasharray:'3 3'}} content={({active,payload})=>{const point=payload?.[0]?.payload as typeof data[number]|undefined;return active&&point?<div className="agency-bi-tooltip"><strong>{point.name}</strong><p>Investimento: {analyticsFormat(point.spend,'spend',currency)}</p><p>Leads atribuídos: {analyticsFormat(point.leads,'leads',currency)}</p><p>CPL: {analyticsFormat(point.cpl,'cpl',currency)}</p><small>Clique para filtrar a carteira.</small></div>:null;}}/><Scatter data={data} fill="#6366d6" fillOpacity={.7} stroke="#fff" strokeWidth={2} isAnimationActive={false} onClick={entry=>{const id=agencyChartIdentity(entry);if(id&&rows.some(row=>row.id===id))onSelect(id);}}/></ScatterChart></ResponsiveContainer></div><details className="agency-bi-scatter-navigation"><summary>Selecionar cliente sem utilizar o gráfico ({data.length})</summary><div className="agency-bi-client-picks">{data.map(row=><button type="button" key={row.id} aria-label={'Analisar '+row.name+' na dispersão da agência'} onClick={()=>onSelect(row.id)}>{row.name}<span>{analyticsFormat(row.spend,'spend',currency)} · {analyticsFormat(row.leads,'leads',currency)}</span></button>)}</div></details></>:<p className="agency-bi-empty">Dispersão indisponível sem investimento e leads observados juntos.</p>}<div className="agency-chart-units"><span>Horizontal: investimento ({currency})</span><span>Vertical: leads atribuídos</span></div><p className="agency-bi-note">X: investimento ({currency}) · Y: leads atribuídos · {weighted?'tamanho: cliques observados':'tamanho fixo, sem inferir cliques ausentes'}. {rows.length-data.length} clientes sem par de medidas. Eventos não são pessoas únicas ou vendas.</p></>;
}


export function AgencyEfficiencySummary({rows,currency,onSelect,page,onPage}:{rows:AgencyClientPoint[];currency:string;onSelect:(id:string)=>void;page:number;onPage:(page:number)=>void}) {
 const observed=rows.filter(row=>row.campaigns>0);
 const pages=Math.max(1,Math.ceil(observed.length/4));
 const activePage=Math.max(0,Math.min(page,pages-1));
 const shown=observed.slice(activePage*4,activePage*4+4);
 return <div className="agency-efficiency-summary">{shown.map(row=>{
  const spend=paidMetric(row.current,'spend'),leads=paidMetric(row.current,'leads'),cpl=paidMetric(row.current,'cpl');
  return <button type="button" key={row.id} onClick={()=>onSelect(row.id)} aria-label={'Analisar eficiência de '+row.name}>
   <span className="agency-efficiency-name">{row.name}<span>↗</span></span>
   <span className="agency-efficiency-values"><span>Investimento<strong>{analyticsFormat(spend,'spend',currency)}</strong></span><span>Leads atribuídos<strong>{analyticsFormat(leads,'leads',currency)}</strong></span><span>CPL<strong>{analyticsFormat(cpl,'cpl',currency)}</strong></span></span>
   {leads===0?<small>Sem lead atribuído nos registros recebidos.</small>:null}
  </button>;
 })}{!observed.length?<p className="agency-bi-empty">Sem registros por cliente neste recorte.</p>:null}{pages>1?<div className="agency-efficiency-pagination"><span>{activePage*4+1}–{activePage*4+shown.length} de {observed.length} clientes</span><button type="button" aria-label="Clientes anteriores no resumo de eficiência" disabled={activePage===0} onClick={()=>onPage(activePage-1)}>Anterior</button><button type="button" aria-label="Próximos clientes no resumo de eficiência" disabled={activePage===pages-1} onClick={()=>onPage(activePage+1)}>Próxima</button></div>:null}<p className="agency-bi-note">CPL = investimento ÷ leads atribuídos, quando há leads e investimento válidos. Não representa ROI ou receita.</p></div>;
}
