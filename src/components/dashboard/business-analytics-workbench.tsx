'use client';
import {useMemo,useState} from 'react';
import {Bar,BarChart,CartesianGrid,ComposedChart,Legend,Line,ResponsiveContainer,Scatter,ScatterChart,Tooltip,XAxis,YAxis,ZAxis} from 'recharts';
import {Download,Printer,TrendingDown,TrendingUp} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money,number} from '@/lib/utils';
import {serializeCsv} from '@/lib/export/csv';
import {getWorkbenchSummary, compareWorkbenchPeriods, getWorkbenchDayMetric, selectWorkbenchTimeline, type WorkbenchMetric} from '@/lib/metrics/business-workbench-summary';

export type InsightCampaign={id:string;name:string;platform:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null;revenue:number|null;purchases:number|null};
export type InsightDay={date:string;spend:number|null;impressions:number|null;clicks:number|null;leads:number|null};
type Metric=WorkbenchMetric;
const labels:Record<Metric,string>={spend:'Investimento',impressions:'Impressões',clicks:'Cliques',leads:'Leads',cpl:'CPL',ctr:'CTR'};
const names:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
function amount(v:number|null|undefined,key:Metric,currency:string){return v==null?'—':['spend','cpl'].includes(key)?money(v,currency):key==='ctr'?number(v,2)+'%':number(v);}
function exportCsv(rows:InsightCampaign[],currency:string){
 const header=['Plataforma','Campanha','Investimento ('+currency+')','Impressoes','Cliques','Leads','CPL ('+currency+')','Receita atribuida','Compras atribuidas'];
 const cells=rows.map(r=>[names[r.platform]??r.platform,r.name,getWorkbenchDayMetric(r,'spend'),getWorkbenchDayMetric(r,'impressions'),getWorkbenchDayMetric(r,'clicks'),getWorkbenchDayMetric(r,'leads'),getWorkbenchDayMetric(r,'cpl'),r.revenue,r.purchases]);
 const csv=serializeCsv([header,...cells]);
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='engaje-campanhas.csv';link.click();URL.revokeObjectURL(url);
}
export function BusinessAnalyticsWorkbench({company,period,current,previous,timeline,priorTimeline,timelinesByChannel={},priorTimelinesByChannel={},currency}:{company:string;period:string;current:InsightCampaign[];previous:InsightCampaign[];timeline:InsightDay[];priorTimeline:InsightDay[];timelinesByChannel?:Record<string,InsightDay[]>;priorTimelinesByChannel?:Record<string,InsightDay[]>;currency:string}){
 const [metric,setMetric]=useState<Metric>('leads');
 const [channel,setChannel]=useState('all');
 const filtered=useMemo(()=>channel==='all'?current:current.filter(r=>r.platform===channel),[channel,current]);
 const prevFiltered=useMemo(()=>channel==='all'?previous:previous.filter(r=>r.platform===channel),[channel,previous]);
 // Time series have a distinct source grain from campaign cards: select the
 // matching daily projection for each period before computing chart points.
 const selectedTimeline=selectWorkbenchTimeline(channel,timeline,timelinesByChannel);
 const selectedPriorTimeline=selectWorkbenchTimeline(channel,priorTimeline,priorTimelinesByChannel);
 const now=getWorkbenchSummary(filtered),before=getWorkbenchSummary(prevFiltered);
 const metrics:(Metric|'spend')[]=['spend','impressions','clicks','leads','cpl','ctr'];
 const line=useMemo(()=>{
  const days=Array.from(new Set([...selectedTimeline.map(r=>r.date),...selectedPriorTimeline.map(r=>r.date)])).sort();
  // Comparisons are aligned by ordinal day of each range, not by calendar date.
  return Array.from({length:Math.max(selectedTimeline.length,selectedPriorTimeline.length)},(_,i)=>({
   day:i+1,date:selectedTimeline[i]?.date??selectedPriorTimeline[i]?.date??days[i]??'',current:getWorkbenchDayMetric(selectedTimeline[i],metric),previous:getWorkbenchDayMetric(selectedPriorTimeline[i],metric)
  }));
 },[selectedTimeline,selectedPriorTimeline,metric]);
 const byChannel=useMemo(()=>['meta_ads','google_ads','tiktok_ads'].map(p=>({name:names[p],platform:p,...getWorkbenchSummary(current.filter(r=>r.platform===p))})),[current]);
 const scatter=filtered.flatMap(r=>{
  const spend=getWorkbenchDayMetric(r,'spend');
  const leads=getWorkbenchDayMetric(r,'leads');
  const cpl=getWorkbenchDayMetric(r,'cpl');
  return spend!=null&&spend>0&&leads!=null&&leads>0&&cpl!=null
   ? [{x:spend,y:cpl,z:leads,name:r.name,platform:r.platform}] : [];
 });
 const cplPrior=before.cpl;
 const recommendations:{heading:string,detail:string,type:'risk'|'opportunity'|'neutral'}[]=[];
 if(filtered.length===0)recommendations.push({heading:'Sem campanhas com dados',detail:'Altere o período ou selecione um canal com informações registradas. Nenhuma estimativa foi criada.',type:'neutral'});
 else{
  const cplChange=compareWorkbenchPeriods(now.cpl,cplPrior,true);
  if(cplChange&&cplChange.delta>15)recommendations.push({heading:'CPL acima do período comparado',detail:'O custo por lead aumentou '+number(cplChange.delta,1)+'%. Investigue CPC, conversão e composição das campanhas antes de ajustar orçamento.',type:'risk'});
  if(cplChange&&cplChange.delta< -10)recommendations.push({heading:'Melhora no custo por lead',detail:'A redução de '+number(Math.abs(cplChange.delta),1)+'% deve ser validada com qualidade dos leads e vendas antes de considerar escala.',type:'opportunity'});
  const leading=filtered.filter(r=>getWorkbenchDayMetric(r,'spend')!=null).sort((a,b)=>b.spend-a.spend)[0];
  if(leading&&now.spend!=null&&now.spend>0&&leading.spend/now.spend>.6)recommendations.push({heading:'Concentração de investimento',detail:'A campanha '+leading.name+' representa '+number(leading.spend/now.spend*100,1)+'% da verba do recorte. Avalie dependência e retorno marginal.',type:'risk'});
  if(now.spend!=null&&now.spend>0&&now.leads===0)recommendations.push({heading:'Investimento sem leads atribuídos',detail:'Confirme o objetivo de cada campanha e a mensuração. Campanhas de alcance não precisam gerar leads.',type:'neutral'});
  if(!recommendations.length)recommendations.push({heading:'Análise de eficiência',detail:'Não houve desvio identificado pelas regras básicas. Analise metas e conversões comerciais antes de alterar o orçamento.',type:'neutral'});
 }
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
   <label className="text-xs text-zinc-400">Canal <select className="ml-2 min-w-36" value={channel} onChange={e=>setChannel(e.target.value)}><option value="all">Todas as plataformas</option>{Object.entries(names).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <div className="flex gap-2"><button onClick={()=>exportCsv(filtered,currency)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200"><Download size={14}/>CSV</button><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-black"><Printer size={14}/>Imprimir / PDF</button></div>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(k=>{const currentValue=now[k],previousValue=before[k],delta=previous.length?compareWorkbenchPeriods(currentValue,previousValue,k==='cpl',k==='spend'):null;return <Card key={k} className="!p-4"><p className="text-xs uppercase tracking-wider text-zinc-400">{labels[k]}</p><p className="mt-2 text-2xl font-semibold text-white">{amount(currentValue,k,currency)}</p><p className="mt-2 text-xs">{delta?<span className={delta.positive === null?'text-zinc-400':delta.positive?'text-emerald-300':'text-rose-300'} title={delta.positive === null?'Variação neutra':delta.positive?'Variação favorável':'Variação desfavorável'}>{delta.delta>=0?'+':''}{number(delta.delta,1)}% vs. comparação</span>:<span className="text-zinc-500">Comparação indisponível</span>}</p></Card>;})}</div>
  <div className="grid gap-4 2xl:grid-cols-2">
   <Card className="min-w-0 !p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Tendência e comparação</h2><select aria-label="Métrica da evolução" value={metric} onChange={e=>setMetric(e.target.value as Metric)} className="min-w-36 text-xs">{metrics.map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></div><p className="mt-1 text-xs text-zinc-500">Evolução diária do indicador; comparação alinhada pela posição do dia.</p><div className="mt-4 h-64">{line.length?<ResponsiveContainer width="100%" height="100%"><ComposedChart data={line}><CartesianGrid stroke="#343434" vertical={false}/><XAxis dataKey="day" tick={{fill:'#9ca3af',fontSize:10}}/><YAxis tick={{fill:'#9ca3af',fontSize:10}}/><Tooltip contentStyle={{background:'#181818',border:'1px solid #334155'}} formatter={(v,name)=>[amount(typeof v==='number'?v:null,metric,currency),name==='current'?'Atual':'Anterior']}/><Legend/><Line name="Atual" type="monotone" dataKey="current" stroke="#8ec5ff" strokeWidth={2} dot={false} connectNulls={false}/><Line name="Anterior" type="monotone" dataKey="previous" stroke="#57b6ff" strokeDasharray="5 5" dot={false} connectNulls={false}/></ComposedChart></ResponsiveContainer>:<p className="text-sm text-zinc-500">Sem dados diários para o canal selecionado.</p>}</div></Card>
   <Card className="min-w-0 !p-4"><h2 className="font-semibold">Investimento por canal</h2><p className="mt-1 text-xs text-zinc-500">Comparação de verba entre plataformas com dados disponíveis.</p><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={byChannel}><CartesianGrid stroke="#343434" vertical={false}/><XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:10}}/><YAxis tick={{fill:'#9ca3af',fontSize:10}}/><Tooltip formatter={v=>money(Number(v),currency)} contentStyle={{background:'#181818',border:'1px solid #334155'}}/><Bar dataKey="spend" fill="#8ec5ff" radius={[5,5,0,0]} name="Investimento"/></BarChart></ResponsiveContainer></div></Card>
   <Card className="min-w-0 !p-4"><h2 className="font-semibold">Matriz de escala e eficiência</h2><p className="mt-1 text-xs text-zinc-500">X: investimento · Y: CPL · cada ponto representa uma campanha com leads reportados.</p><div className="mt-4 h-64">{scatter.length?<ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid stroke="#343434"/><XAxis dataKey="x" name="Investimento" type="number" tick={{fill:'#9ca3af',fontSize:10}}/><YAxis dataKey="y" name="CPL" type="number" tick={{fill:'#9ca3af',fontSize:10}}/><ZAxis dataKey="z" range={[80,380]}/><Tooltip cursor={{strokeDasharray:'3 3'}} contentStyle={{background:'#181818',border:'1px solid #334155'}}/><Scatter data={scatter} fill="#64c8f4" name="Campanhas"/></ScatterChart></ResponsiveContainer>:<p className="text-sm text-zinc-500">São necessários campanhas com investimento e leads para esta análise.</p>}</div></Card>
   <Card className="!p-4"><h2 className="font-semibold">Diagnóstico estratégico</h2><p className="mt-1 text-xs text-zinc-500">Sinais derivados de regras matemáticas, não causas comprovadas.</p><div className="mt-4 space-y-3">{recommendations.map(r=><div key={r.heading} className="rounded-xl border border-white/10 p-3"><h3 className="text-sm font-semibold text-white">{r.type==='risk'?<TrendingDown size={15} className="mr-2 inline text-amber-300"/>:<TrendingUp size={15} className="mr-2 inline text-primary"/>}{r.heading}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{r.detail}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-zinc-500">Receita entre canais pode ter atribuição duplicada. Não inferir ROI ou lucro sem conciliação de CRM.</p></Card>
  </div>
  <Card className="!p-4"><div><h2 className="font-semibold">Relatório de campanhas</h2><p className="mt-1 text-xs text-zinc-500">{company} · {period} · {filtered.length} campanha(s) no recorte</p></div><div className="mt-4 max-h-[470px] overflow-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="sticky top-0 bg-[#191919] text-zinc-400"><tr>{['Plataforma','Campanha','Investimento','Impressões','Cliques','Leads','CPL'].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{[...filtered].sort((a,b)=>(getWorkbenchDayMetric(b,'spend')??-1)-(getWorkbenchDayMetric(a,'spend')??-1)).map(r=><tr key={r.id} className="border-t border-white/[.06] text-zinc-200"><td className="p-3">{names[r.platform]??r.platform}</td><td className="max-w-[330px] truncate p-3" title={r.name}>{r.name}</td><td className="p-3">{amount(getWorkbenchDayMetric(r,'spend'),'spend',currency)}</td><td className="p-3">{amount(getWorkbenchDayMetric(r,'impressions'),'impressions',currency)}</td><td className="p-3">{amount(getWorkbenchDayMetric(r,'clicks'),'clicks',currency)}</td><td className="p-3">{amount(getWorkbenchDayMetric(r,'leads'),'leads',currency)}</td><td className="p-3">{amount(getWorkbenchDayMetric(r,'cpl'),'cpl',currency)}</td></tr>)}</tbody></table></div></Card>
  <p className="text-xs leading-5 text-zinc-500">Origem: métricas de anúncios armazenadas no Supabase, restritas ao cliente e intervalo selecionados. A ausência de métricas não é convertida em zero. Comparativos usam datas anteriores equivalentes quando disponíveis.</p>
 </div>;
}
