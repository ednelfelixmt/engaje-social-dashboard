import {ArrowDownRight,ArrowUpRight,Minus} from 'lucide-react';
import {analyticsFormat,analyticsMetricLabels} from '@/components/dashboard/analytics-charts';
import type {PaidMetricKey} from '@/lib/metrics/paid-metrics';
import type {ChangeBreakdown} from '@/lib/reports/agency-insights';

const percentText=(value:number)=>(value>0?'+':'')+new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value)+'%';

/**
 * Diverging bars: how much each client moved between the two periods, biggest movers first.
 * Colour is semantic only where the direction has a business meaning (leads, CPL, CTR, CPC, CPM);
 * budget and volume movements stay neutral. Clients without a valid value on both sides are listed as excluded.
 */
export function AgencyChangeBreakdown({breakdown,names,metric,currency,onSelect}:{breakdown:ChangeBreakdown;names:ReadonlyMap<string,string>;metric:PaidMetricKey;currency:string;onSelect:(id:string)=>void}) {
 const {rows,excluded}=breakdown;
 const visible=rows.slice(0,8);
 const largest=Math.max(0,...visible.map(row=>Math.abs(row.change)));
 const label=analyticsMetricLabels[metric];
 if(!visible.length)return <>
  <p className="agency-bi-empty">Sem clientes com valor válido nos dois períodos para {label}.</p>
  {excluded?<p className="agency-bi-note">{excluded} {excluded===1?'cliente ficou':'clientes ficaram'} de fora por ter dado em apenas um dos períodos{metric==='leads'||metric==='cpl'?' ou atribuição não comparável':''}.</p>:null}
 </>;
 return <>
  <div className="agency-change-axis" aria-hidden><span>Caiu</span><span>Subiu</span></div>
  <ul className="agency-change-list">
   {visible.map(row=>{
    const name=names.get(row.id)??row.id;
    const direction=row.change===0?'flat':row.change>0?'up':'down';
    const tone=row.good===true?'good':row.good===false?'bad':'neutral';
    const width=largest>0?Math.abs(row.change)/largest*50:0;
    const signed=(row.change>0?'+':row.change<0?'−':'')+analyticsFormat(Math.abs(row.change),metric,currency);
    const Icon=direction==='up'?ArrowUpRight:direction==='down'?ArrowDownRight:Minus;
    return <li key={row.id}>
     <button type="button" onClick={()=>onSelect(row.id)} aria-label={name+': '+label+' '+(direction==='flat'?'sem variação':(direction==='up'?'subiu ':'caiu ')+signed.replace(/^[+−]/,''))+(row.percent!==null?' ('+percentText(row.percent)+')':'')+'. Analisar este cliente.'}>
      <span className="agency-change-name">{name}</span>
      <span className="agency-change-track" aria-hidden><i data-direction={direction} data-tone={tone} style={{width:width+'%'}}/></span>
      <span className="agency-change-value" data-tone={tone}><Icon size={13} aria-hidden/>{signed}{row.percent!==null?<small>{percentText(row.percent)}</small>:null}</span>
     </button>
    </li>;
   })}
  </ul>
  <p className="agency-bi-note">Variação entre o período atual e o comparativo, até oito clientes{rows.length>visible.length?` (${rows.length-visible.length} com variação menor ocultos)`:''}.{excluded?` ${excluded} ${excluded===1?'cliente ficou':'clientes ficaram'} de fora por ter dado em apenas um dos períodos${metric==='leads'||metric==='cpl'?' ou atribuição não comparável':''}.`:''} Verde e vermelho só aparecem onde subir ou cair tem significado de resultado.</p>
 </>;
}
