'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {ArrowUpRight,ChartNoAxesCombined,Target,TrendingUp,Layers3} from 'lucide-react';
import {money,number} from '@/lib/utils';

export type ExecutiveCampaign={id:string;name:string;platform:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null};
export type ExecutiveDay={date:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null};
type Metric='spend'|'leads'|'clicks'|'impressions'|'cpl';
const names:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
const hues:Record<string,string>={meta_ads:'#facc15',google_ads:'#60a5fa',tiktok_ads:'#b794f6'};
const fmt=(v:number|null|undefined,k:Metric,c:string)=>v==null?'—':k==='spend'||k==='cpl'?money(v,c):number(v);
function aggregate(rs:ExecutiveCampaign[]){
 const spend=rs.reduce((v,r)=>v+r.spend,0);
 const metric=(k:'impressions'|'clicks'|'leads')=>rs.length&&rs.some(r=>r[k]!=null)?rs.reduce((v,r)=>v+(r[k]??0),0):null;
 const leads=metric('leads'),clicks=metric('clicks'),impressions=metric('impressions');
 return {spend,leads,clicks,impressions,cpl:leads&&leads>0?spend/leads:null};
}
function level(r:ExecutiveDay|undefined,k:Metric){if(!r)return null;return k==='cpl'?r.leads?r.spend/r.leads:null:r[k];}
function Kpi({label,value,sub,change,kind='neutral'}:{label:string;value:string;sub:string;change:number|null;kind?:'positive'|'cost'|'neutral'}){
 const benefit=change==null?null:kind==='cost'?change<=0:kind==='positive'?change>=0:null;
 return <div className="rounded-2xl border border-white/[.09] bg-gradient-to-br from-white/[.055] to-white/[.012] px-4 py-4">
 <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.13em] text-zinc-400">{label}</span><span className="h-1.5 w-1.5 rounded-full bg-primary/70"/></div>
 <div className="mt-2 text-[clamp(1.3rem,2vw,2rem)] font-semibold leading-tight tracking-tight text-white">{value}</div>
 <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-[11px]"><span className="text-zinc-500">{sub}</span>{change!=null?<span className={benefit===null?'text-zinc-300':benefit?'text-emerald-300':'text-rose-300'}>{change>=0?'+':''}{number(change,1)}%</span>:<span className="text-zinc-600">Sem comparativo</span>}</div>
 </div>;
}
export function ExecutiveOverviewV2({rows,previous,days,previousDays,currency,slug,period}:{rows:ExecutiveCampaign[];previous:ExecutiveCampaign[];days:ExecutiveDay[];previousDays:ExecutiveDay[];currency:string;slug:string;period:string}){
 const [metric,setMetric]=useState<Metric>('leads');
 const current=aggregate(rows),before=aggregate(previous);
 const delta=(key:Metric)=>previous.length&&current[key]!=null&&before[key]!=null&&before[key]>0?(current[key]/before[key]-1)*100:null;
 const channels=['meta_ads','google_ads','tiktok_ads'].map(platform=>({platform,name:names[platform],...aggregate(rows.filter(r=>r.platform===platform)),count:rows.filter(r=>r.platform===platform).length}));
 const chart=useMemo(()=>Array.from({length:Math.max(days.length,previousDays.length)},(_,i)=>({position:i+1,day:days[i]?.date?.slice(5)??'',current:level(days[i],metric),previous:level(previousDays[i],metric)})),[days,previousDays,metric]);
 const maxSpend=Math.max(1,...channels.map(r=>r.spend));
 const leaders=[...rows].filter(r=>r.spend>0).sort((a,b)=>b.spend-a.spend).slice(0,5);
 const maxLead=Math.max(1,...leaders.map(r=>r.leads??0));
 const cplRows=rows.filter(r=>r.spend>0&&r.leads!=null&&r.leads>0);
 const overallCpl=current.cpl;
 const opportunity=cplRows.filter(r=>overallCpl!=null&&r.spend/(r.leads||1)<overallCpl).sort((a,b)=>(a.spend/(a.leads||1))-(b.spend/(b.leads||1)))[0];
 const highest=rows.filter(r=>r.spend>0).sort((a,b)=>b.spend-a.spend)[0];
 return <section className="space-y-3" aria-label="Visão geral executiva v2">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Executive command center</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Panorama de performance</h2></div><p className="text-[11px] text-zinc-500">Dados disponíveis · {period}</p></div>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   <Kpi label="Investimento" value={rows.length?money(current.spend,currency):'—'} sub="Mídia paga" change={delta('spend')}/>
   <Kpi label="Impressões" value={fmt(current.impressions,'impressions',currency)} sub="Eventos de entrega" change={delta('impressions')} kind="positive"/>
   <Kpi label="Leads" value={fmt(current.leads,'leads',currency)} sub="Atribuídos nas plataformas" change={delta('leads')} kind="positive"/>
   <Kpi label="Custo por lead" value={money(current.cpl,currency)} sub="Investimento ÷ leads" change={delta('cpl')} kind="cost"/>
  </div>
  <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
   <div className="min-w-0 rounded-2xl border border-white/[.09] bg-[#111823]/80 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-zinc-500">Performance temporal</p><h3 className="mt-1 text-base font-semibold">Evolução e comparação</h3></div><select aria-label="Métrica de tendência" value={metric} onChange={e=>setMetric(e.target.value as Metric)} className="!h-9 !min-h-0 !rounded-lg !text-xs"><option value="leads">Leads</option><option value="spend">Investimento</option><option value="clicks">Cliques</option><option value="impressions">Impressões</option><option value="cpl">CPL</option></select></div>
    <div className="mt-4 h-[225px]">{chart.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:6,right:8,left:-12,bottom:0}}><defs><linearGradient id="engajeV2Yellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#facc15" stopOpacity=".35"/><stop offset="1" stopColor="#facc15" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(255,255,255,.07)"/><XAxis dataKey="position" tick={{fill:'#8692a6',fontSize:10}} tickLine={false} axisLine={false}/><YAxis tick={{fill:'#8692a6',fontSize:10}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:'#0e1420',border:'1px solid #364050',borderRadius:12}} formatter={(v,name)=>[fmt(typeof v==='number'?v:null,metric,currency),name==='current'?'Atual':'Anterior']}/><Legend formatter={v=>v==='current'?'Período atual':'Anterior'}/><Area dataKey="previous" type="monotone" stroke="#5bb8ff" strokeDasharray="5 5" strokeWidth={2} fill="transparent" dot={false} connectNulls={false}/><Area dataKey="current" type="monotone" stroke="#facc15" strokeWidth={2.5} fill="url(#engajeV2Yellow)" dot={false} connectNulls={false}/></AreaChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-zinc-500">Sem série temporal para o período.</div>}</div>
   </div>
   <div className="min-w-0 rounded-2xl border border-white/[.09] bg-[#111823]/80 p-4"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-zinc-500">Mix de investimento</p><h3 className="mt-1 text-base font-semibold">Comparativo entre canais</h3><div className="mt-5 space-y-5">{channels.map(r=><div key={r.platform}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-zinc-200">{r.name}</span><span className="font-semibold text-white">{r.count?money(r.spend,currency):'Sem dados'}</span></div><div className="h-2.5 rounded-full bg-white/[.07]"><div className="h-2.5 rounded-full" style={{width:(r.spend/maxSpend*100)+'%',background:hues[r.platform]}}/></div><div className="mt-1.5 flex justify-between text-[10px] text-zinc-500"><span>{r.count} campanha(s)</span><span>{r.leads==null?'Leads indisponíveis':number(r.leads)+' leads'}</span></div></div>)}</div></div>
  </div>
  <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
   <div className="min-w-0 rounded-2xl border border-white/[.09] bg-[#111823]/80 p-4"><div className="flex items-center gap-2"><Layers3 size={16} className="text-primary"/><h3 className="text-sm font-semibold">Funil agregado</h3></div><p className="mt-1 text-[11px] text-zinc-500">Relações entre eventos; não representa pessoas únicas.</p><div className="mt-4 space-y-3">{([{label:'Impressões',n:current.impressions,color:'#60a5fa'},{label:'Cliques',n:current.clicks,color:'#facc15'},{label:'Leads',n:current.leads,color:'#47cf98'}]).map((v,i,arr)=><div key={v.label}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-zinc-300">{v.label}</span><strong>{number(v.n)}</strong></div><div className="h-2 rounded-full bg-white/[.08]"><div className="h-2 rounded-full" style={{width:(current.impressions&&v.n!=null?Math.max(1,100*v.n/Number(current.impressions)):0)+'%',background:v.color}}/></div>{i>0?<p className="mt-1 text-[10px] text-zinc-500">{arr[i-1].n&&v.n!=null?number(v.n/Number(arr[i-1].n)*100,2)+'% da etapa anterior':'Conversão indisponível'}</p>:null}</div>)}</div></div>
   <div className="min-w-0 rounded-2xl border border-white/[.09] bg-[#111823]/80 p-4"><div className="flex items-center gap-2"><ChartNoAxesCombined size={16} className="text-primary"/><h3 className="text-sm font-semibold">Campanhas em destaque</h3></div><p className="mt-1 text-[11px] text-zinc-500">Cinco maiores investimentos</p><div className="mt-4 space-y-3">{leaders.length?leaders.map((r,i)=><div key={r.id}><div className="flex justify-between gap-2 text-[11px]"><span className="max-w-[72%] truncate" title={r.name}>{r.name}</span><strong>{money(r.spend,currency)}</strong></div><div className="mt-1 h-1.5 rounded-full bg-white/[.07]"><div className="h-1.5 rounded-full bg-primary" style={{width:(r.spend/Math.max(1,leaders[0].spend)*100)+'%'}}/></div></div>):<p className="text-xs text-zinc-500">Sem campanhas no período.</p>}</div></div>
   <div className="min-w-0 rounded-2xl border border-white/[.09] bg-[#111823]/80 p-4"><div className="flex items-center gap-2"><Target size={16} className="text-primary"/><h3 className="text-sm font-semibold">Leitura estratégica</h3></div><div className="mt-4 space-y-4">{opportunity?<div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Eficiência a investigar</p><p className="mt-1 text-xs leading-5 text-zinc-300">{opportunity.name} apresenta CPL inferior à média consolidada. Avalie a qualidade dos leads antes de ampliar a verba.</p></div>:<p className="text-xs leading-5 text-zinc-400">Não há amostra suficiente para apontar campanhas mais eficientes.</p>}{highest?<div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Concentração</p><p className="mt-1 text-xs leading-5 text-zinc-300">{number(highest.spend/Math.max(1,current.spend)*100,1)}% do investimento concentrado em uma campanha.</p></div>:null}<Link href={`/${slug}/intelligence`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Explorar diagnóstico <ArrowUpRight size={13}/></Link></div></div>
  </div>
  <p className="text-[11px] leading-5 text-zinc-500">Fontes: campanhas de mídia paga do cliente. Leads e conversões são eventos atribuídos e podem se sobrepor entre plataformas. Receita, CAC e ROI exigem conciliação comercial.</p>
 </section>;
}
