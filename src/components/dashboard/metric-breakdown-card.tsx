'use client';
import {useState} from 'react';
import {Card} from '@/components/ui/card';
import {money,number} from '@/lib/utils';
export type BreakdownPoint={label:string;spend:number;impressions:number|null;clicks:number|null;leads:number|null};
type Metric='impressions'|'clicks'|'leads'|'spend'|'ctr'|'cpc'|'cpm'|'cpl';
const definitions:Record<Metric,string>={impressions:'Impressões',clicks:'Cliques',leads:'Leads',spend:'Investimento',ctr:'CTR',cpc:'CPC',cpm:'CPM',cpl:'CPL'};
function value(row:BreakdownPoint,metric:Metric){
 if(metric==='ctr')return row.impressions&&row.clicks!=null?row.clicks/row.impressions*100:null;
 if(metric==='cpc')return row.clicks?row.spend/row.clicks:null;
 if(metric==='cpm')return row.impressions?row.spend/row.impressions*1000:null;
 if(metric==='cpl')return row.leads?row.spend/row.leads:null;
 return row[metric];
}
function format(val:number|null,metric:Metric,currency:string){if(val==null)return '—';if(['spend','cpc','cpm','cpl'].includes(metric))return money(val,currency);if(metric==='ctr')return number(val,2)+'%';return number(val);}
function barColor(title:string,label:string,index:number){
 const l=label.toLocaleLowerCase('pt-BR');
 if(title.toLowerCase().includes('gênero'))return l.includes('femin')?'#b487f4':l.includes('mascul')?'#4eafff':'#87909f';
 const colors=['#ffd524','#50c6ec','#a68bff','#58d6a1','#f0a565','#fa7c9a','#81a8fc','#abb3c0'];return colors[index%colors.length];
}
export function MetricBreakdownCard({title,rows,currency,note}:{title:string;rows:BreakdownPoint[];currency:string;note?:string}){
 const [metric,setMetric]=useState<Metric>('impressions');
 const relevant=rows.map(row=>({...row,metricValue:value(row,metric)})).filter(row=>row.metricValue!=null).sort((a,b)=>(b.metricValue??0)-(a.metricValue??0));
 const max=Math.max(1,...relevant.map(row=>row.metricValue??0));
 return <Card className="min-w-0 !p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-white">{title}</h2><label className="text-xs text-zinc-400"><span className="sr-only">Métrica de {title}</span><select aria-label={`Métrica de ${title}`} className="min-w-36" value={metric} onChange={e=>setMetric(e.target.value as Metric)}>{Object.entries(definitions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
 {note?<p className="mt-2 text-xs text-zinc-500">{note}</p>:null}
 {relevant.length?<div className="mt-4 space-y-3">{relevant.slice(0,12).map((row,i)=><div key={row.label+i}><div className="mb-1 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-xs text-zinc-200">{row.label}</span><strong className="whitespace-nowrap text-xs text-zinc-300">{format(row.metricValue,metric,currency)}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{width:`${(row.metricValue??0)/max*100}%`,background:barColor(title,row.label,i)}}/></div></div>)}</div>:<p className="mt-4 rounded-lg border border-dashed border-white/10 p-4 text-xs text-zinc-400">Sem dados disponíveis para esta métrica. Valores ausentes não são tratados como zero.</p>}
 </Card>;
}
export function AgeGenderStatus({hasJointData}:{hasJointData:boolean}){return <Card className="!p-4"><h2 className="text-sm font-semibold text-white">Idade × gênero</h2><p className="mt-3 text-xs leading-6 text-zinc-400">{hasJointData?'Detalhamento conjunto disponível na origem.':'A base atual traz idade e gênero em relatórios separados. Sem o breakdown conjunto age,gender não é possível afirmar qual faixa etária corresponde a cada gênero. Coletar essa dimensão na API Meta antes de preencher a matriz.'}</p></Card>}
