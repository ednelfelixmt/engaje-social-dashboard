import Link from 'next/link';
import {AlertTriangle, ArrowRight, CheckCircle2, CircleGauge, DatabaseZap, Lightbulb, Settings2, ShieldCheck, Target, TrendingUp} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';
import {paidSummary} from '@/lib/metrics/paid-summary';
import type {CampaignPerformance} from '@/types/domain';

type Targets={
  spend:number|null;leads:number|null;cpl:number|null;ctr:number|null;frequency:number|null;
};
type Signal={level:'critical'|'warning'|'positive'|'info';title:string;detail:string;action:string};

const tone={
  critical:'border-rose-400/25 bg-rose-400/[.07] text-rose-200',
  warning:'border-amber-400/25 bg-amber-400/[.07] text-amber-100',
  positive:'border-emerald-400/25 bg-emerald-400/[.07] text-emerald-100',
  info:'border-cyan-400/20 bg-cyan-400/[.06] text-cyan-100',
};

function dayProgress(from:string,to:string){
  const start=new Date(`${from}T00:00:00Z`).getTime(),end=new Date(`${to}T00:00:00Z`).getTime();
  const today=new Date();const current=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
  const days=Math.max(1,Math.round((end-start)/86400000)+1);
  const elapsed=Math.max(0,Math.min(days,Math.round((current-start)/86400000)+1));
  return {ratio:elapsed/days,elapsed,days,isOpen:current<=end};
}

function pct(value:number|null,target:number|null,inverse=false){
  if(value==null||target==null||target===0)return null;
  return inverse?target/value*100:value/target*100;
}

function bestAndWorst(rows:CampaignPerformance[]){
  const eligible=rows.filter((row)=>Number(row.leads??0)>0&&row.spend>0).map((row)=>({...row,unit:row.spend/Number(row.leads)})).sort((a,b)=>a.unit-b.unit);
  return {best:eligible[0]??null,worst:eligible.length>1?eligible.at(-1)??null:null};
}

function Progress({value,label}:{value:number|null;label:string}){
  const safe=value==null?0:Math.max(0,Math.min(100,value));
  return <div><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-zinc-500">{label}</span><strong className="text-zinc-200">{value==null?'Sem meta':`${number(value,0)}%`}</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className={`h-full rounded-full ${safe>=100?'bg-emerald-400':safe>=75?'bg-primary':'bg-amber-400'}`} style={{width:`${safe}%`}}/></div></div>;
}

export function ExecutiveIntelligence({rows,previousRows,currency,from,to,slug,targets}:{rows:CampaignPerformance[];previousRows:CampaignPerformance[];currency:string;from:string;to:string;slug:string;targets:Targets}){
  const current=paidSummary(rows),previous=paidSummary(previousRows);const timing=dayProgress(from,to);
  const spend=Number(current.spend??0),leads=Number(current.leads??0),cpl=current.cpl,ctr=current.ctr,frequency=current.frequency;
  const projectedSpend=timing.isOpen&&timing.ratio>0?spend/timing.ratio:spend;
  const projectedLeads=timing.isOpen&&timing.ratio>0?leads/timing.ratio:leads;
  const expectedSpend=targets.spend==null?null:targets.spend*timing.ratio;
  const pacing=expectedSpend&&expectedSpend>0?(spend/expectedSpend-1)*100:null;
  const required=['spend','impressions','reach','clicks','leads'];
  const available=required.filter((key)=>current[key]!=null).length;
  const health=Math.round(available/required.length*100);
  const signals:Signal[]=[];
  const configured=Object.values(targets).filter((value)=>value!=null).length;
  if(!rows.length)signals.push({level:'critical',title:'Sem dados no período',detail:'Nenhuma entrega, investimento ou resultado foi encontrado.',action:'Verifique o intervalo e a sincronização das integrações.'});
  if(configured===0)signals.push({level:'info',title:'Metas ainda não configuradas',detail:'O painel pode medir os resultados, mas ainda não consegue classificar o desempenho contra objetivos do negócio.',action:'Defina investimento, leads, CPL, CTR e frequência em Configurar metas.'});
  if(spend>0&&leads===0)signals.push({level:'critical',title:'Investimento sem leads',detail:`Há ${money(spend,currency)} investidos sem geração de lead registrada.`,action:'Revise rastreamento, objetivo, formulário e destino antes de ampliar orçamento.'});
  if(targets.cpl!=null&&cpl!=null&&cpl>targets.cpl)signals.push({level:'warning',title:'CPL acima da meta',detail:`CPL atual ${money(cpl,currency)}, ${number((cpl/targets.cpl-1)*100,0)}% acima do limite.`,action:'Priorize campanhas e públicos com menor custo por lead.'});
  if(targets.ctr!=null&&ctr!=null&&ctr<targets.ctr)signals.push({level:'warning',title:'CTR abaixo da meta',detail:`CTR atual ${number(ctr,2)}% versus meta de ${number(targets.ctr,2)}%.`,action:'Renove criativos, proposta de valor e alinhamento entre anúncio e público.'});
  if(targets.frequency!=null&&frequency!=null&&frequency>targets.frequency)signals.push({level:'warning',title:'Sinal de saturação',detail:`Frequência ${number(frequency,2)}x acima do teto de ${number(targets.frequency,2)}x.`,action:'Amplie ou renove audiência e substitua peças repetidas.'});
  if(pacing!=null&&Math.abs(pacing)>10)signals.push({level:'warning',title:pacing>0?'Investimento acelerado':'Investimento abaixo do ritmo',detail:`O gasto está ${number(Math.abs(pacing),0)}% ${pacing>0?'acima':'abaixo'} do ritmo planejado.`,action:pacing>0?'Controle orçamento diário para evitar antecipar a verba.':'Revise limitações de entrega, lances e orçamento diário.'});
  if(previous.cpl!=null&&cpl!=null&&cpl>previous.cpl*1.2)signals.push({level:'warning',title:'Eficiência em queda',detail:`O CPL aumentou ${number((cpl/previous.cpl-1)*100,0)}% frente ao período anterior.`,action:'Compare campanhas, públicos e criativos que perderam eficiência.'});
  const {best,worst}=bestAndWorst(rows);
  if(best&&worst&&best.campaignId!==worst.campaignId)signals.push({level:'info',title:'Oportunidade de redistribuição',detail:`${best.campaignName} tem CPL de ${money(best.unit,currency)}, contra ${money(worst.unit,currency)} em ${worst.campaignName}.`,action:'Considere transferir verba gradualmente, mantendo teste controlado e volume mínimo.'});
  if(!signals.length&&rows.length&&configured>0)signals.push({level:'positive',title:'Operação dentro dos parâmetros',detail:'Nenhum desvio relevante foi detectado nas metas configuradas.',action:'Mantenha o acompanhamento e valide qualidade dos leads no CRM.'});

  return <section data-tv-panel className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Centro de decisão</p><h2 className="mt-2 text-xl font-semibold">Controle executivo</h2><p className="muted mt-2 max-w-3xl text-sm">Metas, projeção, alertas e prioridades calculados com os dados disponíveis.</p></div><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-sm font-semibold text-zinc-200 hover:border-primary/30 hover:text-primary" href={`/${slug}/settings/dashboard`}><Settings2 size={16}/>Configurar metas</Link></div>
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <Card className="relative overflow-hidden"><Target className="text-primary" size={20}/><p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-500">Investimento</p><strong className="data-value mt-2 block text-2xl">{money(spend,currency)}</strong><p className="mt-2 text-xs text-zinc-500">{targets.spend==null?'Defina a meta do período':`de ${money(targets.spend,currency)} planejados`}</p><div className="mt-5"><Progress value={pct(spend,targets.spend)} label="Execução da meta"/></div></Card>
      <Card><TrendingUp className="text-cyan-300" size={20}/><p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-500">Projeção do período</p><strong className="data-value mt-2 block text-2xl">{money(projectedSpend,currency)}</strong><p className="mt-2 text-xs text-zinc-500">{timing.isOpen?`Com ${timing.elapsed} de ${timing.days} dias transcorridos`:'Período encerrado · valor realizado'}</p><div className="mt-5"><Progress value={timing.ratio*100} label="Tempo transcorrido"/></div></Card>
      <Card><CircleGauge className="text-emerald-300" size={20}/><p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-500">Geração de demanda</p><strong className="data-value mt-2 block text-2xl">{number(leads)} leads</strong><p className="mt-2 text-xs text-zinc-500">Projeção: {number(projectedLeads)} · CPL {cpl==null?'—':money(cpl,currency)}</p><div className="mt-5"><Progress value={pct(leads,targets.leads)} label="Execução da meta"/></div></Card>
      <Card><DatabaseZap className={health>=80?'text-emerald-300':health>=60?'text-amber-300':'text-rose-300'} size={20}/><p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-500">Cobertura dos indicadores</p><strong className="data-value mt-2 block text-2xl">{health}%</strong><p className="mt-2 text-xs text-zinc-500">{available}/{required.length} indicadores essenciais disponíveis</p><div className="mt-5"><Progress value={health} label="Base disponível para análise"/></div></Card>
    </div>
    <div className="grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">
      <Card className="!p-0"><div className="flex items-center justify-between border-b border-white/[.07] p-5 sm:p-6"><div><p className="eyebrow">Prioridades</p><h3 className="mt-2 text-lg font-semibold">Alertas e ações recomendadas</h3></div><AlertTriangle className="text-primary" size={20}/></div><div className="divide-y divide-white/[.06]">{signals.slice(0,5).map((signal,index)=><div className="grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={`${signal.title}-${index}`}><span className={`grid size-9 place-items-center rounded-xl border ${tone[signal.level]}`}>{signal.level==='positive'?<CheckCircle2 size={17}/>:signal.level==='info'?<Lightbulb size={17}/>:<AlertTriangle size={17}/>}</span><div><strong className="text-sm text-white">{signal.title}</strong><p className="mt-1 text-xs leading-5 text-zinc-500">{signal.detail}</p><p className="mt-1 text-xs leading-5 text-zinc-300">{signal.action}</p></div><ArrowRight className="hidden text-zinc-700 sm:block" size={17}/></div>)}</div></Card>
      <Card><div className="flex items-start justify-between"><div><p className="eyebrow">Governança</p><h3 className="mt-2 text-lg font-semibold">Base para decisão</h3></div><ShieldCheck className="text-primary" size={20}/></div><div className="mt-6 space-y-4">{[
        ['Metas configuradas',`${configured}/5`,configured===5],
        ['Métricas essenciais',`${available}/5`,available===5],
        ['Receita e margem','Aguardando fonte real',false],
      ].map(([label,value,ok])=><div className="flex items-center justify-between gap-4 border-b border-white/[.06] pb-4 last:border-0" key={String(label)}><span className="text-sm text-zinc-400">{label as string}</span><strong className={`text-right text-xs ${ok?'text-emerald-300':'text-amber-200'}`}>{value as string}</strong></div>)}</div><p className="mt-5 rounded-xl border border-white/[.07] bg-black/20 p-4 text-xs leading-5 text-zinc-500">Receita, ROAS, CAC, margem e lucro permanecem indisponíveis até a conexão de CRM, checkout ou planilha conciliada.</p></Card>
    </div>
  </section>;
}
