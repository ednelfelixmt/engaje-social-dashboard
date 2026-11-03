'use client';
import {useState} from 'react';
import {money,number} from '@/lib/utils';
import {breakdownBarWidth, breakdownMetricValue, type BreakdownPoint} from '@/lib/reports/audience-report';
export type AudiencePoint=BreakdownPoint;
const dimensions=['Impressões','Cliques','Leads','Investimento'] as const;
type Dimension=typeof dimensions[number];
const getValue=(p:AudiencePoint,k:Dimension)=>breakdownMetricValue(p,k==='Impressões'?'impressions':k==='Cliques'?'clicks':k==='Leads'?'leads':'spend');
const format=(v:number|null,k:Dimension,c:string)=>v==null?'—':k==='Investimento'?money(v,c):number(v);
const panel='rounded-2xl border border-white/10 bg-[#161616] p-4';
export function RegionPerformance({states,cities,currency}:{states:AudiencePoint[];cities:AudiencePoint[];currency:string}){
 const [metric,setMetric]=useState<Dimension>('Impressões');
 const [group,setGroup]=useState<'state'|'city'>('state');
 const received=group==='state'?states:cities;
 const measured=[...received].filter(r=>getValue(r,metric)!=null).sort((a,b)=>(getValue(b,metric)??0)-(getValue(a,metric)??0));
 const rows=measured.slice(0,12);
 const max=rows.reduce((highest,row)=>Math.max(highest,getValue(row,metric)??0),0);
 return <section className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Inteligência geográfica</p><h2 className="mt-1 text-base font-semibold">Distribuição regional da mídia</h2></div><div className="flex flex-wrap gap-2"><select aria-label="Região ou cidade" value={group} onChange={e=>setGroup(e.target.value as 'state'|'city')} className="!h-8 !min-h-0 !text-xs"><option value="state">Estados</option><option value="city">Cidades</option></select><select aria-label="Indicador geográfico" value={metric} onChange={e=>setMetric(e.target.value as Dimension)} className="!h-8 !min-h-0 !text-xs">{dimensions.map(d=><option key={d}>{d}</option>)}</select></div></div><p className="mt-1 text-xs text-zinc-500">{measured.length} de {received.length} grupos recebidos com valor válido para {metric.toLocaleLowerCase('pt-BR')}. {measured.length<received.length?'Recorte parcial: grupos sem medição não entram nas barras. ':''}{measured.length>12?'Exibindo os 12 maiores valores. ':''}Os registros disponíveis não comprovam completude da coleta nem segmentação configurada.</p>{rows.length?<div className="mt-5 grid gap-3 sm:grid-cols-2">{rows.map((r,i)=><div key={r.label}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-zinc-200">{r.label}</span><strong>{format(getValue(r,metric),metric,currency)}</strong></div><div className="h-2 rounded-full bg-white/[.07]"><div className="h-2 rounded-full" style={{width:`${breakdownBarWidth(getValue(r,metric),max)}%`,background:['#facc15','#38bdf8','#a78bfa','#34d399'][i%4]}}/></div></div>)}</div>:<div className="mt-4 grid h-36 place-items-center rounded-xl border border-dashed border-white/10 text-xs text-zinc-500">{received.length?'Grupos geográficos recebidos, mas sem valores válidos para este indicador.':'Sem registros geográficos recebidos da plataforma para este recorte.'}</div>}</section>;
}
export function GenderAgeMatrix({available}:{available:boolean}){
 return <section className={panel}><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Análise cruzada</p><h2 className="mt-1 text-base font-semibold">Mapa de calor — sexo × idade</h2><p className="mt-2 text-xs leading-6 text-zinc-400">{available?'Matriz disponível para conferência.':'A integração ainda não armazenou valores conjuntos de idade e sexo. Os totais separados não permitem construir uma matriz confiável.'}</p><div className="mt-4 grid h-32 place-items-center rounded-xl border border-dashed border-white/10 bg-black/10 text-center text-xs text-zinc-500">Aguardando breakdown conjunto age × gender da plataforma.</div></section>;
}
