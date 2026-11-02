'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ChartFrame,ChartModeSwitch} from '@/components/charts/chart-frame';
import {TimeSeriesChart,timeSeriesModes,type TimePoint,type TimeSeriesMode} from '@/components/charts/time-series-chart';
import {RankingBarChart,rankingHeight} from '@/components/charts/ranking-bar-chart';
import {ScatterBubbleChart} from '@/components/charts/relation-charts';
import {FunnelBarsChart} from '@/components/charts/flow-charts';
import {platformColor} from '@/components/charts/tokens';
import {shortDate,type ChartFormat} from '@/lib/charts/format';
import {ArrowUpRight,Download,Filter,Layers3,ChartNoAxesCombined,Target} from 'lucide-react';
import {money,number} from '@/lib/utils';
import {paidMetric,paidTotals,sumKnown,percentChange} from '@/lib/metrics/paid-metrics';
import {campaignCpl} from '@/lib/metrics/efficiency';
import {serializeCsv} from '@/lib/export/csv';
import {Card} from '@/components/ui/card';

export type PlatformRow={id:string;name:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null;reach:number|null;messages:number|null;revenue:number|null;status:string|null};
export type PlatformDay={date:string;spend:number|null;impressions:number|null;clicks:number|null;leads:number|null};
type Metric='spend'|'impressions'|'clicks'|'leads'|'ctr'|'cpc'|'cpm'|'cpl';
const labels:Record<Metric,string>={spend:'Investimento',impressions:'Impressões',clicks:'Cliques',leads:'Leads',ctr:'CTR',cpc:'CPC',cpm:'CPM',cpl:'CPL'};
const formatOf=(k:Metric,currency:string):ChartFormat=>['spend','cpc','cpm','cpl'].includes(k)?{kind:'money',currency}:k==='ctr'?{kind:'percent'}:{kind:'count'};
const isRatio=(k:Metric)=>['ctr','cpc','cpm','cpl'].includes(k);
function total(rows:PlatformRow[]){
 const result=paidTotals(rows);
 const reach=sumKnown(rows,r=>r.reach);
 const messages=sumKnown(rows,r=>r.messages);
 return {...result,reach,messages};
}
function metric(row:{spend:number|null;impressions:number|null;clicks:number|null;leads:number|null},key:Metric){return paidMetric(row,key);}
function fmt(value:number|null|undefined,key:Metric,currency:string){return value==null?'—':(['spend','cpc','cpm','cpl'].includes(key)?money(value,currency):key==='ctr'?number(value,2)+'%':number(value));}
function csv(rows:PlatformRow[],currency:string){
 const matrix=[['Campanha','Investimento '+currency,'Impressões','Cliques','Leads','CTR','CPC','CPL'],...rows.map(r=>[r.name,r.spend,r.impressions,r.clicks,r.leads,metric(r,'ctr'),metric(r,'cpc'),metric(r,'cpl')])];
 const data=serializeCsv(matrix);
 const href=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
 const anchor=document.createElement('a');anchor.href=href;anchor.download='engaje-performance-campanhas.csv';anchor.click();URL.revokeObjectURL(href);
}
export function PlatformAnalyticsV3({rows,previous,days,previousDays,currency,platform,slug}:{rows:PlatformRow[];previous:PlatformRow[];days:PlatformDay[];previousDays:PlatformDay[];currency:string;platform:'meta_ads'|'google_ads'|'tiktok_ads';slug:string}){
 const [metricKey,setMetricKey]=useState<Metric>('leads'),[rankKey,setRankKey]=useState<Metric>('spend'),[search,setSearch]=useState('');
 const [chosenMode,setChosenMode]=useState<TimeSeriesMode|null>(null);
 const current=total(rows),prior=total(previous);
 const comparison=(key:Metric)=>previous.length?percentChange(metric(current,key),metric(prior,key)):null;
 const rank=useMemo(()=>rows.filter(r=>r.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a,b)=>(metric(b,rankKey)??-1)-(metric(a,rankKey)??-1)),[rows,rankKey,search]);
 const points=useMemo<TimePoint[]>(()=>Array.from({length:Math.max(days.length,previousDays.length)},(_,i)=>{const d=days[i],p=previousDays[i];return {label:shortDate(d?.date??p?.date)||'Dia '+(i+1),detail:d?shortDate(d.date,true):'Sem dia correspondente',current:d?metric(d,metricKey):null,previous:p?metric(p,metricKey):null,previousDetail:p?shortDate(p.date,true):undefined};}),[days,previousDays,metricKey]);
 const mode:TimeSeriesMode=chosenMode??(isRatio(metricKey)?'line':'columns');
 const comparing=previousDays.length>0;
 const leaders=rank.filter(r=>metric(r,rankKey)!=null).slice(0,8).map(r=>({id:r.id,label:r.name,value:metric(r,rankKey),color:platformColor(platform)}));
 const rankFormat:ChartFormat=formatOf(rankKey,currency);
 const scatter=rows.flatMap(r=>{const cpl=campaignCpl(r.spend,r.leads);return cpl===null?[]:[{id:r.id,x:r.spend,y:cpl,size:r.leads!,name:r.name}];});
 const stages=[{label:'Impressões',count:current.impressions},{label:'Cliques',count:current.clicks},{label:'Leads',count:current.leads}];
 const name=platform==='meta_ads'?'Meta Ads':platform==='google_ads'?'Google Ads':'TikTok Ads';
 return <div className="space-y-3" aria-label={'Análise profissional '+name}>
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-primary">Performance intelligence</p><h2 className="text-base font-semibold">{name} · Panorama de campanhas</h2></div><Link href={`/${slug}/reports/${platform==='meta_ads'?'meta-audience':'google-audience'}`} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200">Demografia e dispositivos <ArrowUpRight size={14}/></Link></div>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{(['spend','impressions','clicks','leads','cpl','ctr','cpc','cpm'] as Metric[]).map(k=>{const change=comparison(k);const better=change==null?null:['cpl','cpc','cpm'].includes(k)?change<=0:['spend'].includes(k)?null:change>=0;return <Card key={k} className="!p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{labels[k]}</p><strong className="mt-2 block text-xl text-white">{rows.length?fmt(metric(current,k),k,currency):'—'}</strong><p className={`mt-2 text-[11px] ${better===null?'text-zinc-500':better?'text-emerald-300':'text-rose-300'}`}>{change==null?'Sem comparação':(change>0?'+':'')+number(change,1)+'% vs. anterior'}</p></Card>;})}</div>
  <div className="grid gap-3 2xl:grid-cols-[1.25fr_1fr]">
   <Card className="min-w-0 !p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Evolução e comparação</h3><select aria-label="Métrica da série temporal" value={metricKey} onChange={e=>setMetricKey(e.target.value as Metric)} className="!h-9 !min-h-0 !py-0 !text-xs">{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
    <div className="mt-3"><ChartFrame bare hideTitle title={'Evolução de '+labels[metricKey]} height={290} empty={points.length?null:'Sem histórico neste período.'}
      actions={<ChartModeSwitch label="Estilo do gráfico" value={mode} options={timeSeriesModes} onChange={setChosenMode}/>}
      legend={comparing?[{label:'Atual',color:'var(--chart-primary)'},{label:'Anterior',color:mode==='columns'?'var(--chart-compare)':'var(--chart-compare-stroke)',kind:mode==='columns'?'compare':'dash'}]:[{label:'Atual',color:'var(--chart-primary)'}]}
      table={{columns:['Dia','Atual','Anterior'],rows:points.map(point=>[point.detail??point.label,fmt(point.current,metricKey,currency),fmt(point.previous??null,metricKey,currency)])}}>
      <TimeSeriesChart points={points} format={formatOf(metricKey,currency)} mode={mode} name="Atual" compare={comparing} compareName="Anterior" ariaLabel={'Evolução de '+labels[metricKey]+' em '+name}/>
    </ChartFrame></div></Card>
   <Card className="min-w-0 !p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Ranking de campanhas</h3><select aria-label="Métrica do ranking" value={rankKey} onChange={e=>setRankKey(e.target.value as Metric)} className="!h-9 !min-h-0 !py-0 !text-xs">{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
    <div className="mt-3"><ChartFrame bare hideTitle title={'Campanhas por '+labels[rankKey]} height={rankingHeight(leaders.length)} empty={leaders.length?null:'Nenhuma campanha disponível.'}
      table={{columns:['Campanha',labels[rankKey]],rows:leaders.map(r=>[r.label,fmt(r.value,rankKey,currency)])}}>
      <RankingBarChart rows={leaders} format={rankFormat} ariaLabel={'Ranking de campanhas por '+labels[rankKey]}/>
    </ChartFrame></div></Card>
  </div>
  <div className="grid gap-3 xl:grid-cols-2">
   <Card className="!p-4"><div className="flex items-center gap-2"><Layers3 size={16} className="text-primary"/><h3 className="text-sm font-semibold">Funil de conversão</h3></div><div className="mt-5"><FunnelBarsChart stages={stages.map(s=>({id:s.label,label:s.label,value:s.count}))} ariaLabel={'Funil de eventos em '+name}/></div><p className="mt-3 text-xs text-zinc-400">Eventos agregados, não pessoas únicas.</p></Card>
   <Card className="!p-4"><div className="flex items-center gap-2"><Target size={16} className="text-primary"/><h3 className="text-sm font-semibold">Escala × eficiência</h3></div><p className="mt-2 text-xs text-zinc-400">Investimento na horizontal, CPL na vertical, bolha = leads atribuídos. Linhas tracejadas: medianas.</p>
    <div className="mt-2"><ChartFrame bare hideTitle title="Investimento e CPL por campanha" height={300} empty={scatter.length?null:'Sem pares de investimento e leads suficientes.'}
      table={{columns:['Campanha','Investimento','CPL','Leads'],rows:scatter.map(p=>[p.name,money(p.x,currency),money(p.y,currency),number(p.size)])}}>
      <ScatterBubbleChart points={scatter.map(p=>({id:p.id,label:p.name,x:p.x,y:p.y,size:p.size,color:platformColor(platform)}))} xName="Investimento" yName="CPL" sizeName="Leads" xFormat={{kind:'money',currency}} yFormat={{kind:'money',currency}} ariaLabel={'Investimento versus CPL em '+name}/>
    </ChartFrame></div></Card>
  </div>
  <Card className="!p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Relatório detalhado · {rank.length} campanhas</h3><p className="mt-1 text-xs text-zinc-500">As métricas ausentes são representadas por “—”, não por zero.</p></div><div className="flex gap-2"><label className="relative"><Filter size={13} className="absolute left-2 top-2.5 text-zinc-500"/><input aria-label="Buscar campanha" className="!h-9 !min-h-0 !py-0 pl-7 text-xs" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar campanha"/></label><button type="button" onClick={()=>csv(rank,currency)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 text-xs"><Download size={13}/>CSV</button></div></div>
  <div className="mt-3 max-h-[430px] overflow-auto"><table className="w-full min-w-[940px] text-left text-xs"><thead className="sticky top-0 bg-[#151b27] text-zinc-400"><tr>{['Campanha','Investimento','Impressões','Cliques','Leads','CTR','CPC','CPL'].map(k=><th key={k} className="p-3">{k}</th>)}</tr></thead><tbody>{rank.map(r=><tr key={r.id} className="border-t border-white/[.06] text-zinc-200"><td className="max-w-[310px] truncate p-3" title={r.name}>{r.name}</td><td className="p-3">{money(r.spend,currency)}</td><td className="p-3">{number(r.impressions)}</td><td className="p-3">{number(r.clicks)}</td><td className="p-3">{number(r.leads)}</td><td className="p-3">{fmt(metric(r,'ctr'),'ctr',currency)}</td><td className="p-3">{fmt(metric(r,'cpc'),'cpc',currency)}</td><td className="p-3">{fmt(metric(r,'cpl'),'cpl',currency)}</td></tr>)}</tbody></table></div></Card>
  <p className="text-[11px] text-zinc-500">Os valores derivam de dados atribuídos pela plataforma, não de vendas conciliadas. Variações de custo ou volume não demonstram causalidade.</p>
 </div>;
}
