'use client';

import {useState} from 'react';
import {BarChart3, Boxes, Brush, Map as MapIcon, MapPin, MonitorSmartphone, Trophy, UsersRound} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';
import type {PerformanceRankingGroups, RankedPerformance, RankingDimension} from '@/lib/metrics/rankings';

type Criterion = 'results' | 'efficiency' | 'spend' | 'ctr';
const definitions: {type:RankingDimension;title:string;description:string;icon:typeof UsersRound}[] = [
  {type:'audience',title:'Melhores públicos',description:'Conjuntos de anúncios e audiências',icon:UsersRound},
  {type:'creative',title:'Melhores criativos',description:'Anúncios e peças com melhor resposta',icon:Brush},
  {type:'gender',title:'Gênero',description:'Distribuição informada pela plataforma',icon:UsersRound},
  {type:'age',title:'Idade',description:'Faixas etárias com melhor resultado',icon:BarChart3},
  {type:'device',title:'Dispositivos',description:'Plataformas e aparelhos de acesso',icon:MonitorSmartphone},
  {type:'state',title:'Estados',description:'Regiões com melhor desempenho',icon:MapIcon},
  {type:'city',title:'Cidades',description:'Municípios quando a origem disponibiliza',icon:MapPin},
];

function ctr(row:RankedPerformance){return row.impressions&&row.clicks!=null?row.clicks/row.impressions*100:null;}
function resultMetric(rows:RankedPerformance[]){if(rows.some((row)=>(row.purchases??0)>0))return {key:'purchases' as const,label:'compras'};if(rows.some((row)=>(row.leads??0)>0))return {key:'leads' as const,label:'leads'};return {key:'clicks' as const,label:'cliques'};}
function ordered(rows:RankedPerformance[],criterion:Criterion){
  const result=resultMetric(rows);
  return [...rows].sort((a,b)=>{
    if(criterion==='spend')return b.spend-a.spend;
    if(criterion==='ctr')return Number(ctr(b)??-1)-Number(ctr(a)??-1);
    if(criterion==='efficiency'){
      const aCount=Number(a[result.key]??0),bCount=Number(b[result.key]??0);
      const aCost=aCount>0?a.spend/aCount:Number.POSITIVE_INFINITY,bCost=bCount>0?b.spend/bCount:Number.POSITIVE_INFINITY;
      return aCost-bCost||bCount-aCount;
    }
    return Number(b[result.key]??0)-Number(a[result.key]??0)||b.spend-a.spend;
  }).slice(0,5);
}

function RankingCard({title,description,icon:Icon,rows,criterion,currency}:{title:string;description:string;icon:typeof UsersRound;rows:RankedPerformance[];criterion:Criterion;currency:string}){
  const result=resultMetric(rows);const ranked=ordered(rows,criterion);
  return <Card className="group relative overflow-hidden !p-0">
    <div className="border-b border-white/[.07] bg-gradient-to-br from-primary/[.07] to-transparent p-5">
      <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-zinc-500">{description}</p></div><span className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary"><Icon size={17}/></span></div>
    </div>
    {ranked.length?<ol className="divide-y divide-white/[.06]">{ranked.map((row,index)=>{const count=Number(row[result.key]??0);const cost=count>0?row.spend/count:null;return <li className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4" key={row.key}>
      <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${index===0?'bg-primary text-black':'bg-white/[.05] text-zinc-400'}`}>{index+1}</span>
      <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200" title={row.label}>{row.label}</p><p className="mt-1 text-[11px] text-zinc-500">{money(row.spend,currency)} investidos · CTR {ctr(row)==null?'—':`${number(ctr(row),2)}%`}</p></div>
      <div className="text-right"><strong className="data-value text-sm text-white">{number(row[result.key])}</strong><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{result.label}{cost==null?'':` · ${money(cost,currency)}`}</p></div>
    </li>;})}</ol>:<div className="px-6 py-10 text-center"><Boxes className="mx-auto text-zinc-700" size={22}/><p className="mt-3 text-sm text-zinc-500">Sem detalhamento nesta origem ou período.</p><p className="mt-1 text-xs text-zinc-600">O sistema não estima dados ausentes.</p></div>}
  </Card>;
}

export function PerformanceRankings({rankings,currency}:{rankings:PerformanceRankingGroups;currency:string}){
  const [criterion,setCriterion]=useState<Criterion>('results');
  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Inteligência de segmentação</p><h2 className="mt-2 flex items-center gap-2 text-xl font-semibold"><Trophy className="text-primary" size={20}/>Rankings de performance</h2><p className="muted mt-2 max-w-2xl text-sm">Compare campanhas, públicos e perfis sem misturar dimensões. Cada lista informa volume, custo e taxa real.</p></div>
      <label className="text-xs text-zinc-500">Critério de ordenação<select className="mt-2 block min-w-56" value={criterion} onChange={(event)=>setCriterion(event.target.value as Criterion)}><option value="results">Mais resultados</option><option value="efficiency">Menor custo por resultado</option><option value="ctr">Maior CTR</option><option value="spend">Maior investimento</option></select></label>
    </div>
    <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
      <RankingCard title="Melhores campanhas" description="Campanhas com veiculação no período" icon={Trophy} rows={rankings.campaign} criterion={criterion} currency={currency}/>
      {definitions.map((definition)=><RankingCard key={definition.type} {...definition} rows={rankings[definition.type]} criterion={criterion} currency={currency}/>)}
    </div>
  </section>;
}
