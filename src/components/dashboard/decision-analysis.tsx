'use client';

import {useMemo, useState} from 'react';
import {AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, CircleHelp} from 'lucide-react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';
import type {CampaignPerformance} from '@/types/domain';
import {rankCampaignDecisionImpacts} from '@/lib/metrics/decision-campaign';
import {campaignCpl} from '@/lib/metrics/efficiency';

export type DecisionTimelinePoint={date:string;spend:number;impressions:number|null;reach:number|null;clicks:number|null;leads:number|null};
type Metric='spend'|'impressions'|'reach'|'clicks'|'leads'|'cpl';
const metrics:{key:Metric;label:string}[]=[
  {key:'spend',label:'Investimento'},{key:'impressions',label:'Impressões'},{key:'reach',label:'Alcance'},
  {key:'clicks',label:'Cliques'},{key:'leads',label:'Leads'},{key:'cpl',label:'CPL'},
];

function value(row:DecisionTimelinePoint|undefined,metric:Metric){
  if(!row)return null;if(metric==='cpl')return campaignCpl(row.spend,row.leads);return row[metric];
}
function format(value_:unknown,metric:Metric,currency:string){
  const value=typeof value_==='number'&&Number.isFinite(value_)?value_:null;if(value===null)return '—';
  return metric==='spend'||metric==='cpl'?money(value,currency):number(value,metric==='reach'||metric==='impressions'?0:1);
}
function dateLabel(value:string){return value.slice(5).split('-').reverse().join('/');}

export function DecisionAnalysis({current,previous,campaigns,previousCampaigns,currency,comparing}:{current:DecisionTimelinePoint[];previous:DecisionTimelinePoint[];campaigns:CampaignPerformance[];previousCampaigns:CampaignPerformance[];currency:string;comparing:boolean}){
  const [metric,setMetric]=useState<Metric>('spend');
  const chart=useMemo(()=>Array.from({length:Math.max(current.length,previous.length)},(_,index)=>({index:index+1,date:current[index]?.date??previous[index]?.date??'',current:value(current[index],metric),previous:value(previous[index],metric)})),[current,previous,metric]);
  const impacts=useMemo(()=>rankCampaignDecisionImpacts(campaigns,previousCampaigns,comparing),[campaigns,previousCampaigns,comparing]);
  return <section data-tv-panel className="grid gap-5 2xl:grid-cols-[1.45fr_.8fr]">
    <Card className="overflow-hidden !p-0"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[.07] p-5 sm:p-6"><div><p className="eyebrow">Evolução de desempenho</p><h2 className="mt-2 text-xl font-semibold">Tendência e comparação</h2><p className="muted mt-2 text-xs">Leitura temporal da métrica selecionada.</p></div><label className="text-xs">Métrica<select className="mt-2 min-w-48" value={metric} onChange={(event)=>setMetric(event.target.value as Metric)}>{metrics.map((item)=><option value={item.key} key={item.key}>{item.label}</option>)}</select></label></div>
      {chart.length?<div className="h-[360px] p-4 sm:p-6"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:10,right:8,left:-8,bottom:0}}><defs><linearGradient id="currentDecision" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8ec5ff" stopOpacity={.35}/><stop offset="100%" stopColor="#8ec5ff" stopOpacity={0}/></linearGradient><linearGradient id="previousDecision" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4b5fd" stopOpacity={.18}/><stop offset="100%" stopColor="#c4b5fd" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#778195',fontSize:10}} tickFormatter={dateLabel}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#778195',fontSize:10}} tickFormatter={(v)=>Intl.NumberFormat('pt-BR',{notation:'compact'}).format(Number(v))}/><Tooltip contentStyle={{background:'#0f0f0f',border:'1px solid rgba(255,255,255,.12)',borderRadius:14}} formatter={(v,name)=>[format(v,metric,currency),name==='current'?'Período atual':'Período anterior']} labelFormatter={(v)=>dateLabel(String(v))}/>{comparing?<Area type="monotone" dataKey="previous" name="previous" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="6 5" fill="url(#previousDecision)" connectNulls/>:null}<Area type="monotone" dataKey="current" name="current" stroke="#8ec5ff" strokeWidth={3} fill="url(#currentDecision)" connectNulls/></AreaChart></ResponsiveContainer></div>:<div className="grid h-[360px] place-items-center text-sm text-zinc-500">Sem histórico no período.</div>}
      <div className="flex flex-wrap gap-5 border-t border-white/[.07] px-6 py-4 text-xs"><span className="flex items-center gap-2 text-zinc-300"><i className="h-0.5 w-6 bg-[#8ec5ff]"/>Período atual</span>{comparing?<span className="flex items-center gap-2 text-zinc-400"><i className="h-0.5 w-6 bg-[#c4b5fd]"/>Período anterior</span>:<span className="text-zinc-600">Ative a comparação nos filtros para visualizar dois períodos.</span>}</div>
    </Card>
    <Card className="!p-0"><div className="border-b border-white/[.07] p-5 sm:p-6"><p className="eyebrow">Impacto no resultado</p><h2 className="mt-2 text-xl font-semibold">O que escalar ou revisar</h2><p className="muted mt-2 text-xs">Campanhas classificadas por geração de demanda e eficiência.</p></div>{impacts.length?<div className="divide-y divide-white/[.06]">{impacts.map((row)=><div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4" key={row.decisionKey}><span className={`grid size-9 place-items-center rounded-xl ${row.recommendation==='scale'?'bg-emerald-400/10 text-emerald-300':row.recommendation==='review'?'bg-amber-400/10 text-amber-200':'bg-sky-400/10 text-sky-200'}`}>{row.recommendation==='scale'?<CheckCircle2 size={17}/>:row.recommendation==='review'?<AlertTriangle size={17}/>:<CircleHelp size={17}/>}</span><div className="min-w-0"><strong className="block truncate text-sm" title={row.campaignName}>{row.campaignName}</strong><p className="mt-1 text-[11px] text-zinc-500">{number(row.leads)} leads · CPL {row.cpl==null?'—':money(row.cpl,currency)}</p></div><div className="text-right"><span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${row.recommendation==='scale'?'text-emerald-300':row.recommendation==='review'?'text-amber-200':'text-sky-200'}`}>{row.recommendation==='scale'?<><ArrowUpRight size={12}/>Escalar</>:row.recommendation==='review'?<><ArrowDownRight size={12}/>Revisar</>:<><CircleHelp size={12}/>Avaliar</>}</span><p className="mt-1 text-[11px] text-zinc-500">{money(row.spend,currency)}</p></div></div>)}</div>:<div className="grid min-h-72 place-items-center px-6 text-center"><div><BarChart3 className="mx-auto text-zinc-700"/><p className="mt-3 text-sm text-zinc-500">Sem campanhas com investimento no período.</p></div></div>}</Card>
  </section>;
}
