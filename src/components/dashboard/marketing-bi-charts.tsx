'use client';

import {useId,useState} from 'react';
import {Area,Bar,BarChart,Brush,CartesianGrid,Cell,ComposedChart,Line,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {paidMetric,type PaidMetricKey} from '@/lib/metrics/paid-metrics';
import {type BISelection,marketingDrivers,marketingTrendPoints,type BIAdditiveMetric} from '@/lib/reports/marketing-bi';
import {projectMarketingWaterfall} from '@/lib/reports/marketing-bi-waterfall';
import {analyticsFormat,analyticsMetricLabels} from './analytics-charts';

const compact=(value:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value);
const dateLabel=(value:unknown)=>String(value).slice(5).split('-').reverse().join('/');
type ChartMode='area'|'line'|'bar';
export function MarketingBITrend({selection,metric,secondary,currency,color='#df1728'}:{selection:BISelection;metric:PaidMetricKey;secondary?:PaidMetricKey;currency:string;color?:string}) {
  const gradient='bi-fill-'+useId().replace(/:/g,'');
  const [mode,setMode]=useState<ChartMode>('bar'),[windowSize,setWindowSize]=useState('all');
  const [hidden,setHidden]=useState<string[]>([]);
  const points=marketingTrendPoints(selection,metric,secondary);
  const hasPrior=points.some(p=>p.previous!==null);
  // Historical dates and historical measurements are different facts: retain
  // the comparison calendar even when every value is missing or withheld.
  const hasPreviousPeriod=points.some(p=>p.previousDate!==null);
  // A missing historical indicator is not proof of an attribution mismatch.
  // Inspect original observations before suppressing a historical comparison.
  const hasMeasuredHistoricalMetric=selection.timeline.some(day=>day.previous!==null&&paidMetric(day.previous,metric)!==null);
  const incompatibleLeadHistory = !selection.compatible && (metric==='leads'||metric==='cpl') && hasMeasuredHistoricalMetric;
  const missingPriorMeasurements=hasPreviousPeriod&&!hasPrior&&!incompatibleLeadHistory;
  const visiblePoints=windowSize==='all'?points:points.slice(-Number(windowSize));
  const [zoom,setZoom]=useState<{startIndex?:number;endIndex?:number}>({});
  const start=Math.min(zoom.startIndex??0,Math.max(0,visiblePoints.length-1));
  const end=Math.max(start,Math.min(zoom.endIndex??visiblePoints.length-1,visiblePoints.length-1));
  const toggle=(key:string)=>setHidden(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
  if(!points.some(p=>p.primary!==null||p.secondary!==null||p.previous!==null))return <p className="bi-empty">Sem medições diárias no recorte.</p>;
  const series=[{key:'primary',label:analyticsMetricLabels[metric]+' · atual',color},...(hasPrior?[{key:'previous',label:analyticsMetricLabels[metric]+' · comparativo',color:'#8794ad'}]:[]),...(secondary?[{key:'secondary',label:analyticsMetricLabels[secondary]+' · eixo direito',color:'#7c5cce'}]:[])];
  return <div className="bi-trend" aria-label={'Evolução de '+analyticsMetricLabels[metric]}>
    <div className="bi-chart-tools tv-hide"><div role="group" aria-label="Estilo do gráfico">{([{key:'area',label:'Área'},{key:'line',label:'Linhas'},{key:'bar',label:'Colunas'}] as const).map(item=><button type="button" key={item.key} aria-pressed={mode===item.key} onClick={()=>setMode(item.key)}>{item.label}</button>)}</div><label>Janela<select aria-label="Janela visual da série BI" value={windowSize} onChange={e=>{setWindowSize(e.target.value);setZoom({});}}><option value="all">Todo o período</option><option value="14">Últimos 14 dias</option><option value="7">Últimos 7 dias</option></select></label></div>
    <div className="bi-chart-legend">{series.map(item=><button type="button" key={item.key} style={{color:item.color}} aria-pressed={!hidden.includes(item.key)} aria-label={'Mostrar '+item.label} onClick={()=>toggle(item.key)}><i aria-hidden style={{background:item.color}}/>{item.label}</button>)}</div>
    <div className="agency-chart-units"><span>{analyticsMetricLabels[metric]} · {['spend','cpc','cpm','cpl'].includes(metric)?currency:metric==='ctr'?'%':'eventos'}</span>{secondary?<span>{analyticsMetricLabels[secondary]} · eixo direito</span>:null}</div><div className="bi-trend-plot"><ResponsiveContainer width="100%" height="100%"><ComposedChart accessibilityLayer data={visiblePoints} margin={{left:0,right:0,top:12,bottom:0}}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.28}/><stop offset="100%" stopColor={color} stopOpacity={.02}/></linearGradient></defs>
      <CartesianGrid vertical={false} stroke="var(--studio-grid,#e7e9ed)" strokeDasharray="3 4"/>
      <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={30} tick={{fontSize:11,fill:'var(--studio-muted,#63728a)'}} axisLine={false} tickLine={false}/>
      <YAxis yAxisId="primary" width={48} tickFormatter={compact} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} axisLine={false} tickLine={false}/>
      {secondary?<YAxis yAxisId="secondary" orientation="right" width={48} tickFormatter={compact} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} axisLine={false} tickLine={false}/>:null}
      <Tooltip cursor={{stroke:color,strokeDasharray:'4 4'}} content={({active,payload})=>{const p=payload?.[0]?.payload as typeof points[number]|undefined;return active&&p?<div className="analytics-tooltip"><strong>{p.currentDate??p.previousDate}</strong>{!hidden.includes('primary')?<p>{analyticsMetricLabels[metric]} · atual: {analyticsFormat(p.primary,metric,currency)}</p>:null}{hasPreviousPeriod&&p.previousDate&&!hidden.includes('previous')?<p>{analyticsMetricLabels[metric]} · comparativo ({p.previousDate}): {analyticsFormat(p.previous,metric,currency)}</p>:null}{secondary&&!hidden.includes('secondary')?<p>{analyticsMetricLabels[secondary]} · atual: {analyticsFormat(p.secondary,secondary,currency)}</p>:null}</div>:null;}}/>
      {mode==='area'?<Area yAxisId="primary" dataKey="primary" hide={hidden.includes('primary')} stroke={color} fill={'url(#'+gradient+')'} strokeWidth={2.8} dot={{r:2}} activeDot={{r:5,stroke:'var(--studio-surface)',strokeWidth:2}} connectNulls={false} isAnimationActive={false}/>:mode==='bar'?<Bar yAxisId="primary" dataKey="primary" hide={hidden.includes('primary')} fill={color} maxBarSize={28} radius={[4,4,0,0]} isAnimationActive={false}/>:<Line yAxisId="primary" dataKey="primary" hide={hidden.includes('primary')} stroke={color} strokeWidth={2.8} dot={{r:2}} activeDot={{r:5}} connectNulls={false} isAnimationActive={false}/>}
      {mode==='bar'?<Line yAxisId="primary" dataKey="primary" hide={hidden.includes('primary')} stroke="none" dot={{r:2,fill:color}} connectNulls={false} isAnimationActive={false}/>:null}
      {hasPrior?<Line yAxisId="primary" dataKey="previous" hide={hidden.includes('previous')} stroke="#8794ad" strokeDasharray="5 4" strokeWidth={2} dot={{r:2}} connectNulls={false} isAnimationActive={false}/>:null}
      {secondary?<Line yAxisId="secondary" dataKey="secondary" hide={hidden.includes('secondary')} stroke="#7c5cce" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>:null}
      {visiblePoints.length>7?<Brush className="bi-brush tv-hide" dataKey="date" height={22} travellerWidth={8} stroke={color} fill="var(--studio-surface,#fff)" tickFormatter={dateLabel} startIndex={start} endIndex={end} onChange={range=>{if(range)setZoom(range);}}/>:null}
    </ComposedChart></ResponsiveContainer></div>
    <p className="bi-footnote tv-hide">Passe o cursor ou use as setas no gráfico. Arraste as alças para ampliar.</p>
    {incompatibleLeadHistory?<p className="bi-footnote">Comparativo histórico de leads/CPL indisponível: janelas de atribuição não equivalentes.</p>:null}
    {missingPriorMeasurements?<p className="bi-footnote">Sem medições históricas para este indicador no período comparativo; a ausência não foi convertida em zero.</p>:null}
    <details className="analytics-details tv-hide"><summary>Consultar valores diários · {points.length} posições do calendário</summary><p className="bi-footnote">Zoom, legenda e estilo alteram somente o gráfico. Totais, tabela e CSV mantêm todo o recorte.</p><div className="analytics-table-wrap"><table><thead><tr><th>Data atual</th><th>{analyticsMetricLabels[metric]} · atual</th>{hasPreviousPeriod?<><th>Data comparativa</th><th>{analyticsMetricLabels[metric]} · comparativo</th></>:null}{secondary?<th>{analyticsMetricLabels[secondary]} · atual</th>:null}</tr></thead><tbody>{points.map((p,index)=><tr key={index}><th scope="row">{p.currentDate??'—'}</th><td>{analyticsFormat(p.primary,metric,currency)}</td>{hasPreviousPeriod?<><td>{p.previousDate??'—'}</td><td>{analyticsFormat(p.previous,metric,currency)}</td></>:null}{secondary?<td>{analyticsFormat(p.secondary,secondary,currency)}</td>:null}</tr>)}</tbody></table></div></details>
  </div>;
}

export function MarketingBIWaterfall({selection,metric,currency}:{selection:BISelection;metric:BIAdditiveMetric;currency:string}) {
  const report=marketingDrivers(selection,metric);
  if(!report.available)return <p className="bi-empty">Sem campanhas com medições comparáveis nos dois períodos. Ausência não foi convertida em zero.</p>;
  const projected=projectMarketingWaterfall(report);
  const data=projected?.map(row=>({...row,color:row.change===null?(row.name==='Comparativo'?'#7b879e':'#df1728'):metric==='spend'?'#8496b5':row.change>=0?'#16805d':'#cf4053'}))??[];
  return <>{projected?<div className="bi-waterfall" aria-label="Variação observada por campanha"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{left:0,right:10,top:12,bottom:10}}><CartesianGrid vertical={false} stroke="var(--studio-grid,#e7e9ed)"/><XAxis dataKey="name" interval={0} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} tickFormatter={value=>String(value).length>13?String(value).slice(0,12)+'…':String(value)}/><YAxis width={55} tickFormatter={compact} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}}/><Tooltip content={({active,payload})=>{const row=payload?.[0]?.payload as typeof data[number]|undefined;return active&&row?<div className="analytics-tooltip"><strong>{row.name}</strong><p>{row.change===null?'Total: ':'Variação: '}{analyticsFormat(row.change===null?row.magnitude:row.change,metric,currency)}</p></div>:null;}}/><Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false}/><Bar dataKey="magnitude" stackId="waterfall" radius={[3,3,0,0]} isAnimationActive={false}>{data.map((row,index)=><Cell key={index} fill={row.color}/>)}</Bar></BarChart></ResponsiveContainer></div>:<p className="bi-empty">Cascata indisponível: a escala intermediária excede o intervalo numérico finito. A tabela preserva as medições comparáveis, sem sintetizar barras.</p>}<p className="bi-footnote">{report.rows.length} campanhas com medições nos dois períodos; {report.excluded} sem par válido, fora desta decomposição. A cascata representa variação observada, sem atribuir causa. Investimento não tem direção favorável presumida.</p><div className="analytics-table-wrap"><table><thead><tr><th>Campanha comparável</th><th>Comparativo</th><th>Atual</th><th>Variação absoluta</th></tr></thead><tbody>{report.rows.map(row=><tr key={row.key}><th scope="row">{row.name}</th><td>{analyticsFormat(row.previous,metric,currency)}</td><td>{analyticsFormat(row.current,metric,currency)}</td><td>{analyticsFormat(row.change,metric,currency)}</td></tr>)}</tbody></table></div></>;
}
