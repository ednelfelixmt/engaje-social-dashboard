import Link from 'next/link';
import {ArrowDownRight, ArrowUpRight, BadgeAlert, CircleHelp, Layers3, Target, TrendingUp} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money, number} from '@/lib/utils';
import {paidSummary} from '@/lib/metrics/paid-summary';
import {strategicPeriodComparison} from '@/lib/metrics/strategic-comparison';
import type {CampaignPerformance} from '@/types/domain';

type BriefItem={title:string;detail:string;next:string;severity:'risk'|'watch'|'opportunity'};
const style={risk:'border-rose-400/25 bg-rose-400/[.06]',watch:'border-amber-400/25 bg-amber-400/[.06]',opportunity:'border-emerald-400/25 bg-emerald-400/[.06]'};
const label={risk:'Atenção',watch:'Investigar',opportunity:'Oportunidade'};
function metric(value:number|null,format:'money'|'percent'|'integer',currency:string){
  if(value==null)return 'Indisponível';
  if(format==='money')return money(value,currency);
  return format==='percent'?number(value,2)+'%':number(value);
}
function Trend({value,lowerBetter=false}:{value:number|null;lowerBetter?:boolean}){
  if(value==null)return <span className="text-xs text-zinc-500">Comparação indisponível</span>;
  const good=lowerBetter?value<=0:value>=0;
  const Icon=value>=0?ArrowUpRight:ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${good?'text-emerald-300':'text-rose-300'}`}><Icon size={14}/>{value>=0?'+':''}{number(value,1)}% vs. período comparado</span>;
}
export function StrategicDecisionBrief({rows,previousRows,currency,slug,comparing}:{rows:CampaignPerformance[];previousRows:CampaignPerformance[];currency:string;slug:string;comparing:boolean}){
  const current=paidSummary(rows),previous=paidSummary(previousRows);
  const spend=current.spend,leads=current.leads,cpl=current.cpl;
  const {spendChange,leadChange,cplChange,hasComparableMetric,demandGrowthOutpacesSpend}=strategicPeriodComparison({
    currentRows:rows,previousRows,requestedCurrency:currency,comparing,
    current:{spend,leads,cpl},previous:{spend:previous.spend,leads:previous.leads,cpl:previous.cpl},
  });
  const leading=[...rows].filter(row=>row.spend>0).sort((a,b)=>b.spend-a.spend)[0];
  const concentration=leading&&spend!=null&&spend>0?leading.spend/spend*100:null;
  const notes:BriefItem[]=[];
  if(!rows.length){
    notes.push({severity:'risk',title:'Sem base para decisões',detail:'Não há campanhas com atividade no período selecionado.',next:'Verifique os filtros e a última sincronização antes de interpretar o desempenho.'});
  }else{
    if(spend!=null&&spend>0&&leads===0)notes.push({severity:'risk',title:'Investimento sem leads registrados',detail:`${money(spend,currency)} em mídia e nenhum lead contabilizado neste recorte.`,next:'Verifique o objetivo das campanhas e a mensuração; campanhas de alcance podem não buscar leads.'});
    if(cplChange!=null&&cplChange>15)notes.push({severity:'risk',title:'Custo por lead em deterioração',detail:`CPL aumentou ${number(cplChange,1)}% contra o período selecionado para comparação.`,next:'Investigue alterações em CPC, taxa de conversão e mix de campanhas antes de realocar orçamento.'});
    if(concentration!=null&&concentration>=60)notes.push({severity:'watch',title:'Investimento concentrado',detail:`${number(concentration,1)}% da verba está em ${leading?.campaignName??'uma campanha'}.`,next:'Avalie dependência operacional, incrementalidade e alternativas de escala antes de diversificar.'});
    if(demandGrowthOutpacesSpend&&leadChange!=null&&spendChange!=null)notes.push({severity:'opportunity',title:'Demanda crescendo acima da verba',detail:`Leads ${leadChange>=0?'+':''}${number(leadChange,1)}%; investimento ${spendChange>=0?'+':''}${number(spendChange,1)}%.`,next:'Verifique qualidade dos leads, capacidade comercial e estabilidade da conversão antes de ampliar investimento.'});
    if(!notes.length)notes.push({severity:'watch',title:'Monitorar eficiência e qualidade',detail:'Os critérios automáticos não identificaram um desvio prioritário com os dados disponíveis.',next:'Compare resultado com metas e valide leads qualificados e vendas no CRM.'});
  }
  const tiles=[
    {name:'Investimento',value:metric(spend,'money',currency),trend:spendChange,lowerBetter:false,neutral:true},
    {name:'Leads reportados',value:metric(leads,'integer',currency),trend:leadChange,lowerBetter:false,neutral:false},
    {name:'Custo por lead',value:metric(cpl,'money',currency),trend:cplChange,lowerBetter:true,neutral:false},
    {name:'Concentração da verba',value:concentration==null?'Indisponível':number(concentration,1)+'%',trend:null,lowerBetter:false,neutral:true},
  ];
  return <section data-tv-panel className="space-y-4" aria-label="Resumo estratégico de negócios">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">Inteligência para decisões</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Resumo estratégico</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Leitura executiva baseada nos resultados disponíveis. Alertas são hipóteses para investigação, não provas de causalidade.</p></div>
      <Link href={`/${slug}/funnel`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-primary/40 hover:text-primary"><Layers3 size={16}/>Investigar funil</Link>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{tiles.map(tile=><Card key={tile.name} className="relative min-w-0 overflow-hidden border-white/[.09] bg-gradient-to-br from-white/[.045] to-transparent">
      <p className="text-xs font-semibold uppercase tracking-[.11em] text-zinc-400">{tile.name}</p><strong className="data-value mt-3 block break-words text-2xl text-white">{tile.value}</strong>
      <div className="mt-3 min-h-5">{tile.neutral&&tile.trend!=null?<span className="text-xs text-zinc-400">{tile.trend>=0?'+':''}{number(tile.trend,1)}% vs. período comparado</span>:<Trend value={tile.trend} lowerBetter={tile.lowerBetter}/>}</div>
    </Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
      <Card className="!p-0"><div className="flex items-center justify-between border-b border-white/[.07] p-5"><div><p className="eyebrow">Plano de atenção</p><h3 className="mt-2 text-lg font-semibold text-white">Prioridades identificadas</h3></div><Target className="text-primary" size={20}/></div>
        <div className="space-y-3 p-4 sm:p-5">{notes.slice(0,3).map(note=><div key={note.title} className={`rounded-xl border p-4 ${style[note.severity]}`}><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">{label[note.severity]}</span><h4 className="text-sm font-semibold text-white">{note.title}</h4></div><p className="mt-2 text-sm leading-6 text-zinc-300">{note.detail}</p><p className="mt-2 text-xs leading-5 text-zinc-400"><strong className="text-zinc-200">Próxima decisão:</strong> {note.next}</p></div>)}</div>
      </Card>
      <Card><div className="flex items-center gap-2"><BadgeAlert className="text-primary" size={18}/><h3 className="font-semibold text-white">Confiabilidade da análise</h3></div>
        <div className="mt-5 space-y-4 text-sm text-zinc-300">
          <div className="flex items-center justify-between gap-3"><span>Atividade no período</span><strong className={rows.length?'text-emerald-300':'text-amber-300'}>{rows.length?'Disponível':'Ausente'}</strong></div>
          <div className="flex items-center justify-between gap-3"><span>Comparação histórica</span><strong className={hasComparableMetric?'text-emerald-300':'text-amber-300'}>{hasComparableMetric?'Disponível':'Sem base'}</strong></div>
          <div className="flex items-center justify-between gap-3"><span>Leads mensurados</span><strong className={leads!=null?'text-emerald-300':'text-amber-300'}>{leads!=null?'Disponível':'Indisponível'}</strong></div>
        </div>
        <div className="mt-5 rounded-xl border border-white/[.08] bg-black/20 p-4 text-xs leading-5 text-zinc-400"><CircleHelp size={15} className="mb-2 text-primary"/>Leads são eventos atribuídos pelas fontes conectadas. Sem conciliação de CRM, este painel não confirma vendas, CAC real, lucro nem rentabilidade incremental.</div>
      </Card>
    </div>
  </section>;
}
