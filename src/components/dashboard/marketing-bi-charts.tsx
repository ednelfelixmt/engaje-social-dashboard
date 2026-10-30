'use client';

import {Bar,BarChart,CartesianGrid,Cell,ComposedChart,Line,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {paidMetric,type PaidMetricKey} from '@/lib/metrics/paid-metrics';
import {type BISelection,marketingDrivers,type BIAdditiveMetric} from '@/lib/reports/marketing-bi';
import {analyticsFormat,analyticsMetricLabels} from './analytics-charts';

const compact=(value:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value);
export function MarketingBITrend({selection,metric,secondary,currency}:{selection:BISelection;metric:PaidMetricKey;secondary?:PaidMetricKey;currency:string}) {
  const points=selection.timeline.map(row=>({date:row.currentDate??row.previousDate,
    primary:row.current?paidMetric(row.current,metric):null,
    secondary:secondary&&row.current?paidMetric(row.current,secondary):null}));
  if(!points.some(p=>p.primary!==null||p.secondary!==null))return <p className="bi-empty">Sem medições diárias no recorte.</p>;
  return <div className="bi-trend" aria-label={'Evolução de '+analyticsMetricLabels[metric]}>
    <div className="bi-chart-legend"><span>● {analyticsMetricLabels[metric]}</span>{secondary?<span>● {analyticsMetricLabels[secondary]} · eixo direito</span>:null}</div>
    <ResponsiveContainer width="100%" height="86%"><ComposedChart data={points} margin={{left:0,right:0,top:8,bottom:0}}>
      <CartesianGrid vertical={false} stroke="var(--studio-grid,#e7e9ed)" strokeDasharray="3 4"/>
      <XAxis dataKey="date" tickFormatter={value=>String(value).slice(5).split('-').reverse().join('/')} minTickGap={30} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} axisLine={false} tickLine={false}/>
      <YAxis yAxisId="primary" width={45} tickFormatter={compact} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} axisLine={false} tickLine={false}/>
      {secondary?<YAxis yAxisId="secondary" orientation="right" width={45} tickFormatter={compact} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} axisLine={false} tickLine={false}/>:null}
      <Tooltip content={({active,payload})=>{const p=payload?.[0]?.payload as typeof points[number]|undefined;return active&&p?<div className="analytics-tooltip"><strong>{p.date}</strong><p>{analyticsMetricLabels[metric]}: {analyticsFormat(p.primary,metric,currency)}</p>{secondary?<p>{analyticsMetricLabels[secondary]}: {analyticsFormat(p.secondary,secondary,currency)}</p>:null}</div>:null;}}/>
      <Line yAxisId="primary" dataKey="primary" stroke="#df1728" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false}/>
      {secondary?<Line yAxisId="secondary" dataKey="secondary" stroke="#64748b" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>:null}
    </ComposedChart></ResponsiveContainer>
  </div>;
}

export function MarketingBIWaterfall({selection,metric,currency}:{selection:BISelection;metric:BIAdditiveMetric;currency:string}) {
  const report=marketingDrivers(selection,metric);
  if(!report.available)return <p className="bi-empty">Sem campanhas com medições comparáveis nos dois períodos. Ausência não foi convertida em zero.</p>;
  const shown=report.rows.slice(0,8).map(row=>({name:row.name,change:row.change}));
  if(report.rows.length>8)shown.push({name:'Demais campanhas',change:report.rows.slice(8).reduce((sum,row)=>sum+row.change,0)});
  let running=report.start!;
  const data=[{name:'Comparativo',base:0,magnitude:running,change:null as number|null,color:'#7b879e'}];
  for(const row of shown){const next=running+row.change;data.push({...row,base:Math.min(running,next),magnitude:Math.abs(row.change),color:metric==='spend'?'#8496b5':row.change>=0?'#16805d':'#cf4053'});running=next;}
  data.push({name:'Atual',base:0,magnitude:report.end!,change:null,color:'#df1728'});
  return <><div className="bi-waterfall" aria-label="Variação observada por campanha"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{left:0,right:10,top:12,bottom:10}}><CartesianGrid vertical={false} stroke="var(--studio-grid,#e7e9ed)"/><XAxis dataKey="name" interval={0} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}} tickFormatter={value=>String(value).length>13?String(value).slice(0,12)+'…':String(value)}/><YAxis width={55} tickFormatter={compact} tick={{fontSize:10,fill:'var(--studio-muted,#63728a)'}}/><Tooltip content={({active,payload})=>{const row=payload?.[0]?.payload as typeof data[number]|undefined;return active&&row?<div className="analytics-tooltip"><strong>{row.name}</strong><p>{row.change===null?'Total: ':'Variação: '}{analyticsFormat(row.change===null?row.magnitude:row.change,metric,currency)}</p></div>:null;}}/><Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false}/><Bar dataKey="magnitude" stackId="waterfall" radius={[3,3,0,0]} isAnimationActive={false}>{data.map((row,index)=><Cell key={index} fill={row.color}/>)}</Bar></BarChart></ResponsiveContainer></div><p className="bi-footnote">{report.rows.length} campanhas com medições nos dois períodos; {report.excluded} sem par válido, fora desta decomposição. A cascata representa variação observada, sem atribuir causa. Investimento não tem direção favorável presumida.</p><div className="analytics-table-wrap"><table><thead><tr><th>Campanha comparável</th><th>Comparativo</th><th>Atual</th><th>Variação absoluta</th></tr></thead><tbody>{report.rows.map(row=><tr key={row.key}><th scope="row">{row.name}</th><td>{analyticsFormat(row.previous,metric,currency)}</td><td>{analyticsFormat(row.current,metric,currency)}</td><td>{analyticsFormat(row.change,metric,currency)}</td></tr>)}</tbody></table></div></>;
}
