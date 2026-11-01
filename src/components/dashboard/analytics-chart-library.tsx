'use client';
import {useMemo,useState} from 'react';
import {ChartFrame,ChartModeSwitch} from '@/components/charts/chart-frame';
import {TreemapChart,WaterfallChart} from '@/components/charts/flow-charts';
import {platformColor} from '@/components/charts/tokens';
import type {ChartFormat} from '@/lib/charts/format';
import type {WaterfallInput} from '@/lib/charts/models';
import {money,number} from '@/lib/utils';
export type AnalysisCampaign={id:string;name:string;platform:string;spend:number;leads:number|null;clicks:number|null;impressions:number|null};
const PANEL='min-w-0 rounded-2xl border border-[var(--studio-border,#2b3649)] bg-[var(--studio-surface,#101722)] p-4';

/** Budget concentration: one rectangle per campaign, coloured by platform. Size is spend and nothing else. */
export function BudgetTreemap({rows,currency}:{rows:AnalysisCampaign[];currency:string}){
 const data=useMemo(()=>rows.filter(x=>x.spend>0).sort((a,b)=>b.spend-a.spend),[rows]);
 const [selection,setSelection]=useState<string|null>(null);
 const selected=data.find(x=>x.id===selection)??data[0];
 const total=data.reduce((s,x)=>s+x.spend,0);
 const top=data.slice(0,12);
 const invalid=rows.some(row=>!Number.isFinite(row.spend)||row.spend<0)||!Number.isFinite(total);
 const remainder=data.slice(12);
 const campaignIds=new Set(top.map(row=>row.id));
 let remainderId='budget-others';
 while(campaignIds.has(remainderId))remainderId+='-';
 const tiles=[...top.map(r=>({id:r.id,label:r.name,value:r.spend,color:platformColor(r.platform)})),...(remainder.length?[{id:remainderId,label:'Outras campanhas ('+remainder.length+')',value:remainder.reduce((sum,row)=>sum+row.spend,0),color:'var(--chart-axis)'}]:[])];
 if(invalid)return <section className={PANEL}><h3 className="text-sm font-semibold">Treemap de campanhas</h3><p role="status" className="mt-3 text-sm text-zinc-400">Investimento indisponível: valores inválidos ou soma fora do intervalo suportado. Nenhuma participação parcial foi calculada.</p></section>;
 const format:ChartFormat={kind:'money',currency};
 return <section className={PANEL}><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[.15em] text-zinc-500">Concentração de orçamento</p><h3 className="mt-1 text-sm font-semibold text-white">Treemap de campanhas</h3></div><span className="text-xs text-zinc-400">{data.length} campanhas</span></div>
 <div className="mt-3"><ChartFrame bare hideTitle title="Concentração de orçamento por campanha" height={260} empty={top.length?null:'Sem investimento para construir o treemap.'}
  legend={[...new Set(top.map(r=>r.platform))].map(platform=>({label:platform==='meta_ads'?'Meta Ads':platform==='google_ads'?'Google Ads':platform==='tiktok_ads'?'TikTok Ads':platform,color:platformColor(platform)}))}
  table={{columns:['Campanha','Investimento','Participação'],rows:tiles.map(r=>[r.label,money(r.value,currency),number(r.value/total*100,1)+'%'])}}>
  <TreemapChart items={tiles} format={format} selectedId={selection} ariaLabel="Concentração de orçamento por campanha"/>
 </ChartFrame></div>
 {remainder.length?<p className="mt-2 text-xs text-zinc-400">As 12 maiores campanhas são exibidas individualmente; as demais compõem Outras campanhas. Participações calculadas sobre todo o investimento válido.</p>:null}
 {selected?<><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{top.slice(0,6).map(r=><button key={r.id} type="button" aria-pressed={selected.id===r.id} onClick={()=>setSelection(selection===r.id?null:r.id)} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs ${selected.id===r.id?'border-yellow-400/50 bg-yellow-400/5':'border-white/[.07]'}`}><span className="flex min-w-0 items-center gap-2"><i className="size-2 shrink-0 rounded-sm" style={{background:platformColor(r.platform)}}/><span className="truncate" title={r.name}>{r.name}</span></span><strong className="whitespace-nowrap">{number(r.spend/total*100,1)}%</strong></button>)}</div><p className="mt-3 text-xs leading-5 text-zinc-400">Maior concentração: {selected.name} — {money(selected.spend,currency)} ({number(selected.spend/total*100,1)}% da verba). O tamanho representa exclusivamente investimento.</p></>:null}</section>;
}

type BridgeMetric='spend'|'leads'|'clicks';
const bridgeOptions=[{id:'spend',label:'Investimento'},{id:'leads',label:'Leads'},{id:'clicks',label:'Cliques'}] as const satisfies readonly {id:BridgeMetric;label:string}[];

/** What moved the result between two periods: previous total, the largest campaign contributions, current total. */
export function PeriodBridge({current,previous,currency}:{current:AnalysisCampaign[];previous:AnalysisCampaign[];currency:string}){
 const [metric,setMetric]=useState<BridgeMetric>('spend');
 const missing=metric!=='spend'&&[...current,...previous].some(r=>r[metric]==null);
 const available=previous.length>0&&(metric==='spend'||[...current,...previous].some(r=>r[metric]!=null));
 const format:ChartFormat=metric==='spend'?{kind:'money',currency}:{kind:'count'};
 const steps=useMemo<WaterfallInput[]>(()=>{
  const measure=(r:AnalysisCampaign)=>metric==='spend'?r.spend:(r[metric]??0);
  const sum=(rs:AnalysisCampaign[])=>rs.reduce((n,r)=>n+measure(r),0);
  const map=new Map<string,{name:string;prior:number;now:number}>();
  for(const r of previous){const v=map.get(r.id)??{name:r.name,prior:0,now:0};v.prior+=measure(r);map.set(r.id,v);}
  for(const r of current){const v=map.get(r.id)??{name:r.name,prior:0,now:0};v.now+=measure(r);map.set(r.id,v);}
  const all=[...map].map(([id,r])=>({id,name:r.name,delta:r.now-r.prior})).filter(r=>r.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const top=all.slice(0,5),rest=all.slice(5).reduce((n,r)=>n+r.delta,0);
  const deltas=rest!==0?[...top,{id:'others',name:'Outras campanhas',delta:rest}]:top;
  return [{id:'previous',label:'Período anterior',value:sum(previous),kind:'total' as const},...deltas.map(d=>({id:d.id,label:d.name,value:d.delta,kind:'delta' as const})),{id:'current',label:'Período atual',value:sum(current),kind:'total' as const}];
 },[current,previous,metric]);
 const from=steps[0].value,to=steps[steps.length-1].value;
 const reconciled=steps.slice(0,-1).reduce((n,s)=>n+s.value,0);
 const text=(v:number)=>metric==='spend'?money(v,currency):number(v);
 return <section className={PANEL}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-zinc-500">Decomposição matemática</p><h3 className="mt-1 text-base font-semibold text-white">Cascata de contribuições</h3><p className="mt-1 text-xs text-zinc-400">Como cada campanha contribuiu para a diferença entre os dois períodos.</p></div><select aria-label="Métrica da cascata" value={metric} onChange={e=>setMetric(e.target.value as BridgeMetric)} className="!h-9 !min-h-0 !py-0 !text-xs">{bridgeOptions.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
 <div className="mt-3"><ChartFrame bare hideTitle title="Cascata de contribuições por campanha" height={300} empty={available?null:'Sem período comparativo com dados suficientes.'}
  table={{columns:['Etapa','Valor'],rows:steps.map(s=>[s.label,s.kind==='total'?text(s.value):(s.value>0?'+':'')+text(s.value)])}}>
  <WaterfallChart steps={steps} format={format} ariaLabel="Cascata de contribuições por campanha"/>
 </ChartFrame></div>
 {available?<><div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs"><span>Anterior: <strong className="text-white">{text(from)}</strong></span><span className="text-zinc-300">Diferença: {to-from>0?'+':''}{text(to-from)}</span><span>Atual: <strong className="text-white">{text(to)}</strong></span></div><p className="mt-2 text-xs text-zinc-400">Total reconciliado: {text(reconciled)}. {missing?'Existem métricas não reportadas: a comparação é parcial.':'São contribuições aritméticas, não causas comprovadas.'}</p></>:null}</section>;
}
