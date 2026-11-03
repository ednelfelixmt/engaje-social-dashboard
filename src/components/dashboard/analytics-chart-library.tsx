'use client';
import {useMemo,useState} from 'react';
import {ResponsiveContainer,Tooltip,Treemap} from 'recharts';
import {money,number} from '@/lib/utils';
export type AnalysisCampaign={id:string;name:string;platform:string;spend:number;leads:number|null;clicks:number|null;impressions:number|null};
const COLORS=['#eab308','#38bdf8','#a78bfa','#34d399','#fb923c','#f472b6'];
const PANEL='min-w-0 rounded-2xl border border-white/10 bg-[#161616] p-4';
function TreemapTile({data,selected,x=0,y=0,width=0,height=0,index=0}:{data:{id:string;name:string;color:string}[];selected:string|null;x?:number;y?:number;width?:number;height?:number;index?:number}){const item=data[index];if(!item||!width||!height)return <g/>;return <g><rect x={x} y={y} width={width} height={height} rx={5} fill={item.color} opacity={selected===item.id?1:.88} stroke="#161616" strokeWidth={3}/>{width>105&&height>38?<text x={x+8} y={y+17} fill="#101010" fontSize={11} fontWeight={700}>{item.name.slice(0,Math.max(9,Math.floor(width/9)))}</text>:null}</g>;}
export function BudgetTreemap({rows,currency}:{rows:AnalysisCampaign[];currency:string}){
 const data=useMemo(()=>rows.filter(x=>x.spend>0).map((x,i)=>({...x,size:x.spend,color:COLORS[i%COLORS.length]})).sort((a,b)=>b.size-a.size),[rows]);
 const [selection,setSelection]=useState<string|null>(null);
 const selected=data.find(x=>x.id===selection)??data[0];
 const total=data.reduce((s,x)=>s+x.spend,0);
 const top=data.slice(0,12);
 return <section className={PANEL}><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[.15em] text-zinc-500">Concentração de orçamento</p><h3 className="mt-1 text-sm font-semibold text-white">Treemap de campanhas</h3></div><span className="text-xs text-zinc-400">{data.length} campanhas</span></div>
 {top.length?<><div className="mt-3 h-[210px] w-full"><ResponsiveContainer width="100%" height="100%"><Treemap data={top} dataKey="size" nameKey="name" aspectRatio={4/3} stroke="#161616" fill="#eab308" content={<TreemapTile data={top} selected={selection}/>}><Tooltip contentStyle={{background:'#181818',border:'1px solid #334155'}} formatter={v=>money(Number(v),currency)}/></Treemap></ResponsiveContainer></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{top.slice(0,6).map((r,i)=><button key={r.id} type="button" onClick={()=>setSelection(r.id)} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs ${selected?.id===r.id?'border-yellow-400/50 bg-yellow-400/5':'border-white/[.07]'}`}><span className="flex min-w-0 items-center gap-2"><i className="size-2 shrink-0 rounded-sm" style={{background:r.color}}/><span className="truncate" title={r.name}>{r.name}</span></span><strong className="whitespace-nowrap">{number(r.spend/total*100,1)}%</strong></button>)}</div><p className="mt-3 text-[11px] leading-5 text-zinc-400">Maior concentração: {selected.name} — {money(selected.spend,currency)} ({number(selected.spend/total*100,1)}% da verba). O tamanho representa exclusivamente investimento.</p></>:<div className="mt-4 grid h-48 place-items-center text-sm text-zinc-500">Sem investimento para construir o treemap.</div>}</section>;
}
export function PeriodBridge({current,previous,currency}:{current:AnalysisCampaign[];previous:AnalysisCampaign[];currency:string}){
 const [metric,setMetric]=useState<'spend'|'leads'|'clicks'>('spend');
 const measure=(r:AnalysisCampaign)=>metric==='spend'?r.spend:(r[metric]??0);
 const available=previous.length>0&&(metric==='spend'||[...current,...previous].some(r=>r[metric]!=null));
 const sum=(rs:AnalysisCampaign[])=>rs.reduce((n,r)=>n+measure(r),0);
 const from=sum(previous),to=sum(current);
 const map=new Map<string,{name:string;prior:number;now:number}>();
 for(const r of previous){const v=map.get(r.id)??{name:r.name,prior:0,now:0};v.prior+=measure(r);map.set(r.id,v);}
 for(const r of current){const v=map.get(r.id)??{name:r.name,prior:0,now:0};v.now+=measure(r);map.set(r.id,v);}
 const all=[...map].map(([id,r])=>({id,name:r.name,delta:r.now-r.prior})).filter(r=>r.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 const top=all.slice(0,5);const rest=all.slice(5).reduce((n,r)=>n+r.delta,0);
 const steps=rest!==0?[...top,{id:'others',name:'Outras',delta:rest}]:top;
 const sumSteps=steps.reduce((n,r)=>n+r.delta,from);
 const min=Math.min(0,from,to,...steps.map((_,i)=>from+steps.slice(0,i+1).reduce((s,r)=>s+r.delta,0)));
 const max=Math.max(1,from,to,...steps.map((_,i)=>from+steps.slice(0,i+1).reduce((s,r)=>s+r.delta,0)));
 const sx=(i:number,count:number)=>38+(i+.5)*(600/count);
 const sy=(v:number)=>213-180*(v-min)/(max-min);
 const bars=[{name:'Anterior',begin:0,end:from,value:from,total:true},...steps.map((step,i)=>({name:step.name,begin:from+steps.slice(0,i).reduce((n,r)=>n+r.delta,0),end:from+steps.slice(0,i+1).reduce((n,r)=>n+r.delta,0),value:step.delta,total:false})),{name:'Atual',begin:0,end:to,value:to,total:true}];
 const format=(v:number)=>metric==='spend'?money(v,currency):number(v);
 const missing=metric!=='spend'&&[...current,...previous].some(r=>r[metric]==null);
 return <section className={PANEL}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-zinc-500">Decomposição matemática</p><h3 className="mt-1 text-base font-semibold text-white">Cascata de contribuições</h3><p className="mt-1 text-xs text-zinc-400">Como cada campanha contribuiu para a diferença entre os períodos.</p></div><select aria-label="Métrica da cascata" value={metric} onChange={e=>setMetric(e.target.value as typeof metric)} className="!h-8 !min-h-0 !text-xs"><option value="spend">Investimento</option><option value="leads">Leads</option><option value="clicks">Cliques</option></select></div>
 {!available?<div className="mt-4 grid h-[260px] place-items-center text-sm text-zinc-500">Sem período comparativo com dados suficientes.</div>:<>
 <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs"><span>Anterior: <strong className="text-white">{format(from)}</strong></span><span className={to>=from?'text-emerald-300':'text-rose-300'}>Diferença: {to-from>0?'+':''}{format(to-from)}</span><span>Atual: <strong className="text-white">{format(to)}</strong></span></div>
 <svg role="img" aria-label="Cascata de contribuições por campanha com início, variações positivas, negativas e total" viewBox="0 0 680 260" className="mt-3 w-full">
 {[0,.25,.5,.75,1].map(t=>{const val=min+t*(max-min),y=sy(val);return <g key={t}><line x1="35" x2="665" y1={y} y2={y} stroke="#2b3546" strokeDasharray="3 6"/><text x="29" y={y+3} fill="#8292a6" textAnchor="end" fontSize="9">{number(val,0)}</text></g>})}
 {bars.map((r,i)=>{const x=sx(i,bars.length),top=Math.min(sy(r.begin),sy(r.end)),bottom=Math.max(sy(r.begin),sy(r.end));const color=r.total?'#60a5fa':r.value>=0?'#34d399':'#fb7185';return <g key={i}><rect x={x-20} y={top} width="40" height={Math.max(3,bottom-top)} rx="3" fill={color}/><title>{r.name}: {format(r.value)}</title><text x={x} y={Math.max(10,top-7)} fontSize="9" fontWeight="600" fill="#e2e8f0" textAnchor="middle">{r.value>0&&!r.total?'+':''}{number(r.value,0)}</text><text x={x} y="235" fontSize="9" fill="#a3afbd" textAnchor="middle">{r.name.length>12?r.name.slice(0,11)+'…':r.name}</text>{i<bars.length-1?<line x1={x+20} x2={sx(i+1,bars.length)-20} y1={sy(r.end)} y2={sy(r.end)} stroke="#64748b" strokeDasharray="2 3" opacity=".65"/>:null}</g>})}
 </svg>
 <p className="text-[11px] text-zinc-500">Total reconciliado: {format(sumSteps)}. {missing?'Existem métricas não reportadas: a comparação é parcial.':'São contribuições aritméticas, não causas comprovadas.'}</p></>}
 </section>;
}
