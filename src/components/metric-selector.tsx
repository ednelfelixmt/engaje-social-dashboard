'use client';

import {useMemo, useState} from 'react';
import {CheckCheck, Search, X} from 'lucide-react';
import {dashboardMetricGroups, dashboardMetricKeys, type DashboardMetricScope} from '@/lib/metrics/catalog';

type Scope='all'|DashboardMetricScope;
const tabs:{id:Scope;label:string}[]=[{id:'all',label:'Todas'},{id:'paid',label:'Mídia paga'},{id:'organic',label:'Orgânico'},{id:'sales',label:'CRM e vendas'}];
const presets=[
  {label:'Essenciais',keys:['spend','impressions','clicks','ctr','cpc','leads','cpl','purchases','revenue','roas']},
  {label:'Geração de leads',keys:['spend','impressions','clicks','ctr','cpc','page_views','leads','registration_leads','message_leads','cpl','cost_per_registration','cost_per_message']},
  {label:'E-commerce',keys:['spend','impressions','clicks','ctr','cpc','content_views','add_to_cart','checkouts','purchases','cpa','revenue','roas']},
  {label:'Conteúdo orgânico',keys:['impressions','reach','interactions','engagement_rate','likes','comments','shares','saves','video_views','followers','follower_growth','profile_views']},
] as const;

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

export function MetricSelector({initial}:{initial:string[]}){
  const [selected,setSelected]=useState(()=>new Set(initial));
  const [scope,setScope]=useState<Scope>('all');
  const [query,setQuery]=useState('');
  const normalizedQuery=normalize(query.trim());
  const visibleGroups=useMemo(()=>dashboardMetricGroups.map((group)=>({...group,metrics:group.metrics.filter((metric)=>{
    const matchesScope=scope==='all'||metric.scopes.includes(scope as never);
    const haystack=normalize([metric.label,metric.description,...metric.platforms,group.title].join(' '));
    return matchesScope&&(!normalizedQuery||haystack.includes(normalizedQuery));
  })})).filter((group)=>group.metrics.length),[scope,normalizedQuery]);
  const visibleKeys=visibleGroups.flatMap((group)=>group.metrics.map((metric)=>metric.key));
  const toggle=(key:string)=>setSelected((current)=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});
  const selectVisible=()=>setSelected((current)=>new Set([...current,...visibleKeys]));
  const clearVisible=()=>setSelected((current)=>{const next=new Set(current);visibleKeys.forEach((key)=>next.delete(key));return next;});
  const applyPreset=(keys:readonly string[])=>setSelected(new Set(keys.filter((key)=>dashboardMetricKeys.includes(key as never))));

  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Métricas visíveis</h2><p className="muted mt-2 text-sm">Pesquise, filtre por canal e selecione apenas o que ajuda na leitura do projeto.</p></div><div className="rounded-full border border-primary/20 bg-primary/[.07] px-4 py-2 text-xs font-semibold text-primary">{selected.size} selecionadas de {dashboardMetricKeys.length}</div></div>

    <div className="sticky top-3 z-20 space-y-3 rounded-2xl border border-white/10 bg-[#10141d]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1"><span className="sr-only">Buscar métricas</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={17}/><input className="w-full pl-10" type="search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar por métrica, objetivo ou plataforma..."/></label>
        <div className="flex flex-wrap gap-2">{tabs.map((tab)=><button type="button" key={tab.id} onClick={()=>setScope(tab.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${scope===tab.id?'bg-primary text-black':'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>{tab.label}</button>)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Modelos:</span>{presets.map((preset)=><button type="button" key={preset.label} onClick={()=>applyPreset(preset.keys)} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400 transition hover:border-primary/30 hover:text-primary">{preset.label}</button>)}<span className="hidden flex-1 lg:block"/><button type="button" onClick={selectVisible} className="flex items-center gap-1.5 rounded-lg border border-emerald-400/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300"><CheckCheck size={14}/>Selecionar exibidas</button><button type="button" onClick={clearVisible} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-400"><X size={14}/>Limpar exibidas</button></div>
    </div>

    {visibleGroups.map((group)=><details open key={group.id} className="group rounded-2xl border border-white/10 bg-black/10">
      <summary className="cursor-pointer list-none px-5 py-4"><div className="flex items-center justify-between gap-4"><div><strong>{group.title}</strong><p className="muted mt-1 text-xs">{group.description}</p></div><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-zinc-500">{group.metrics.filter((metric)=>selected.has(metric.key)).length}/{group.metrics.length}</span></div></summary>
      <div className="grid gap-3 border-t border-white/[.07] p-4 md:grid-cols-2 xl:grid-cols-3">{group.metrics.map((metric)=>{const checked=selected.has(metric.key);return <label className={`!flex-row cursor-pointer items-start rounded-xl border p-4 transition ${checked?'border-primary/35 bg-primary/[.07]':'border-white/[.08] bg-white/[.025] hover:border-white/20'}`} key={metric.key}>
        <input className="mt-1" type="checkbox" name="enabled_metrics" value={metric.key} checked={checked} onChange={()=>toggle(metric.key)}/>
        <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm">{metric.label}</strong><small className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${metric.availability==='current'?'bg-emerald-400/10 text-emerald-300':'bg-amber-400/10 text-amber-300'}`}>{metric.availability==='current'?'Dados atuais':'Depende da origem'}</small></span><small className="mt-1.5 block leading-5 text-zinc-500">{metric.description}</small><small className="mt-2 block truncate text-[10px] text-zinc-600">{metric.platforms.join(' · ')}</small></span>
      </label>;})}</div>
    </details>)}
    {!visibleGroups.length?<div className="rounded-2xl border border-dashed border-white/10 py-14 text-center"><p className="text-sm text-zinc-400">Nenhuma métrica encontrada.</p><button type="button" className="mt-3 text-xs text-primary" onClick={()=>{setQuery('');setScope('all');}}>Limpar busca e filtros</button></div>:null}
    <p className="text-xs text-zinc-600"><strong className="text-emerald-300">Dados atuais</strong> já são recebidos pelo projeto. <strong className="text-amber-300">Depende da origem</strong> será exibido como “—” até a integração correspondente enviar o indicador.</p>
  </section>;
}
