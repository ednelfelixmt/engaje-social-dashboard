'use client';

import {useState} from 'react';
import {Boxes, Brush, MapPin, MonitorSmartphone, Trophy, UsersRound} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';
import type {PerformanceRankingGroups, RankedPerformance, RankingDimension} from '@/lib/metrics/rankings';
import {rankingCtr as ctr, rankingResultMetric as resultMetric, rankingUnitCost, rankingBarWidth, rankingObservedMaximum, rankPerformanceRows as ordered, type RankingCriterion as Criterion} from '@/lib/metrics/ranking-display';

type AudienceDimension = 'demographic'|Extract<RankingDimension,'device'|'state'|'city'>;
const rankingDefinitions: {type:RankingDimension;title:string;description:string;icon:typeof UsersRound}[] = [
  {type:'audience',title:'Melhores públicos',description:'Audiências com maior resposta',icon:UsersRound},
  {type:'creative',title:'Melhores criativos',description:'Anúncios com melhor desempenho',icon:Brush},
];
const audienceDefinitions: {type:AudienceDimension;label:string;icon:typeof UsersRound}[] = [
  {type:'demographic',label:'Idade + gênero',icon:UsersRound},{type:'device',label:'Dispositivos',icon:MonitorSmartphone},{type:'state',label:'Estados',icon:MapPin},{type:'city',label:'Cidades',icon:MapPin},
];

const labelTranslations:Partial<Record<RankingDimension,Record<string,string>>>={
  gender:{male:'Homens',female:'Mulheres',unknown:'Não informado',undetermined:'Não informado'},
  age:{unknown:'Não informado'},
  device:{mobile_app:'Aplicativo móvel',mobile_web:'Navegador no celular',desktop:'Computador',tablet:'Tablet',unknown:'Não informado'},
  state:{unknown:'Não informado','são paulo (state)':'São Paulo'},
  city:{unknown:'Não informado'},
};

function translatedLabel(type:RankingDimension,label:string){return labelTranslations[type]?.[label.trim().toLocaleLowerCase('pt-BR')]??label;}

function EmptyState({message='Sem detalhamento nesta origem ou período.'}:{message?:string}){return <div className="px-6 py-10 text-center"><Boxes className="mx-auto text-zinc-700" size={22}/><p className="mt-3 text-sm text-zinc-500">{message}</p><p className="mt-1 text-xs text-zinc-600">O sistema não estima dados ausentes.</p></div>;}

function RankingCard({title,description,icon:Icon,rows,criterion,currency}:{title:string;description:string;icon:typeof UsersRound;rows:RankedPerformance[];criterion:Criterion;currency:string}){
  const result=resultMetric(rows),ranked=ordered(rows,criterion);
  return <Card className="group relative overflow-hidden !p-0"><div className="border-b border-white/[.07] bg-gradient-to-br from-primary/[.07] to-transparent p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-zinc-500">{description}</p></div><span className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary"><Icon size={17}/></span></div></div>{ranked.length?<ol className="divide-y divide-white/[.06]">{ranked.map((row,index)=>{const cost=rankingUnitCost(row.spend,row[result.key]);return <li className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4" key={row.key}><span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${index===0?'bg-primary text-black':'bg-white/[.05] text-zinc-400'}`}>{index+1}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200" title={row.label}>{row.label}</p><p className="mt-1 text-[11px] text-zinc-500">{money(row.spend,currency)} · CTR {ctr(row)==null?'—':`${number(ctr(row),2)}%`}</p></div><div className="text-right"><strong className="data-value text-sm text-white">{number(row[result.key])}</strong><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{result.label}{cost==null?'':` · ${money(cost,currency)}`}</p></div></li>;})}</ol>:<EmptyState message={criterion==='efficiency'?'Sem resultados observados para calcular custo por resultado.':undefined}/>}</Card>;
}

function AudienceRows({type,rows,metric,currency}:{type:RankingDimension;rows:RankedPerformance[];metric:'results'|'spend'|'ctr';currency:string}){
  const result=resultMetric(rows),ranked=ordered(rows,metric);
  const maximum=rankingObservedMaximum(ranked.map((row)=>metric==='spend'?row.spend:metric==='ctr'?ctr(row):row[result.key]));
  if(!ranked.length)return <EmptyState message={type==='city'?'A plataforma conectada não enviou cidades neste período.':'A plataforma não enviou este detalhamento no período.'}/>;
  return <div className="grid gap-4">{ranked.map((row,index)=>{const value=metric==='spend'?row.spend:metric==='ctr'?Number(ctr(row)??0):Number(row[result.key]??0);const label=translatedLabel(type,row.label);return <div className="grid grid-cols-[minmax(110px,1fr)_minmax(90px,2fr)_auto] items-center gap-3" key={row.key}><div className="flex min-w-0 items-center gap-2"><span className="text-[10px] font-bold text-zinc-600">{String(index+1).padStart(2,'0')}</span><strong className="truncate text-sm text-zinc-200" title={label}>{label}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-gradient-to-r from-primary via-amber-300 to-cyan-300 transition-all" style={{width:`${rankingBarWidth(value,maximum)}%`}}/></div><strong className="data-value min-w-20 text-right text-sm">{metric==='spend'?money(value,currency):metric==='ctr'?`${number(value,2)}%`:number(value)}</strong></div>;})}</div>;
}

export function AudienceControl({rankings,currency}:{rankings:PerformanceRankingGroups;currency:string}){
  const [selected,setSelected]=useState<AudienceDimension>('demographic');
  const active=selected;
  const [metric,setMetric]=useState<'results'|'spend'|'ctr'>('results');
  const source=active==='demographic'?[...rankings.gender,...rankings.age]:rankings[active];
  return <Card className="h-full min-h-[620px] min-w-0 overflow-hidden !p-0"><div className="border-b border-white/[.07] bg-gradient-to-r from-primary/[.08] via-transparent to-cyan-400/[.05] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Controle de audiência</p><h3 className="mt-2 text-lg font-semibold">Demografia, localização e dispositivos</h3><p className="muted mt-2 text-xs">Dados enviados pelas plataformas, sem estimativas.</p></div><label className="text-xs">Métrica<select className="mt-2 min-w-44" value={metric} onChange={(event)=>setMetric(event.target.value as typeof metric)}><option value="results">Resultados</option><option value="ctr">CTR</option><option value="spend">Investimento</option></select></label></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{audienceDefinitions.map(({type,label,icon:Icon})=><button type="button" onClick={()=>setSelected(type)} className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border px-3 text-xs font-semibold transition ${active===type?'border-primary/40 bg-primary/15 text-primary':'border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/20 hover:text-white'}`} key={type}><Icon size={15}/>{label}</button>)}</div></div><div className="p-5 sm:p-6">{active==='demographic'?<div className="grid items-stretch gap-4 lg:grid-cols-2"><section className="min-h-[310px] rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><h4 className="mb-5 text-sm font-semibold text-white">Gênero</h4><AudienceRows type="gender" rows={rankings.gender} metric={metric} currency={currency}/></section><section className="min-h-[310px] rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><h4 className="mb-5 text-sm font-semibold text-white">Faixa etária</h4><AudienceRows type="age" rows={rankings.age} metric={metric} currency={currency}/></section></div>:<AudienceRows type={active} rows={source} metric={metric} currency={currency}/>}</div></Card>;
}

export function PerformanceRankings({rankings,currency}:{rankings:PerformanceRankingGroups;currency:string}){
  const [criterion,setCriterion]=useState<Criterion>('results');
  return <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Relatório analítico</p><h2 className="mt-2 flex items-center gap-2 text-xl font-semibold"><Trophy className="text-primary" size={20}/>Performance e segmentação</h2><p className="muted mt-2 max-w-2xl text-sm">Identifique rapidamente o que escalar, revisar ou interromper.</p></div><label className="text-xs text-zinc-500">Critério dos rankings<select className="mt-2 block min-w-56" value={criterion} onChange={(event)=>setCriterion(event.target.value as Criterion)}><option value="results">Mais resultados</option><option value="efficiency">Menor custo por resultado</option><option value="ctr">Maior CTR</option><option value="spend">Maior investimento</option></select></label></div><div className="grid gap-5 xl:grid-cols-3"><RankingCard title="Melhor desempenho" description="Resultados no período selecionado" icon={Trophy} rows={rankings.campaign} criterion={criterion} currency={currency}/>{rankingDefinitions.map((definition)=><RankingCard key={definition.type} {...definition} rows={rankings[definition.type]} criterion={criterion} currency={currency}/>)}</div><AudienceControl rankings={rankings} currency={currency}/></section>;
}
