'use client';

import {useId, useState} from 'react';
import {ArrowRight, Layers3} from 'lucide-react';
import {money, number} from '@/lib/utils';

export type FunnelExplorerStage = {
  metric:string; label:string; value:number|null; previousValue:number|null;
  cost:number|null; costLabel:string; detail:string; target:number|null;
};
const colors = ['#6556e8','#387fe5','#099caf','#15966c','#b65eaa','#d78429'];
const observed = (value:number|null):value is number => value !== null && Number.isFinite(value) && value >= 0;
export function FunnelExplorer({stages,currency,comparing}: {stages:FunnelExplorerStage[];currency:string;comparing:boolean}) {
  const [selected,setSelected] = useState(stages[0]?.metric ?? '');
  const [scale,setScale] = useState<'linear'|'log'>('log');
  const id = useId().replace(/:/g,'');
  const active = stages.find(stage => stage.metric === selected) ?? stages[0];
  const maximum = Math.max(0,...stages.flatMap(stage => [stage.value,comparing ? stage.previousValue : null]).filter(observed));
  const width = (value:number|null) => !observed(value) || maximum === 0 ? 0 : (scale === 'log' ? Math.log1p(value)/Math.log1p(maximum) : value/maximum)*580;
  return <div className="studio-funnel-explorer">
    <div className="studio-funnel-intro"><div><span className="studio-kicker"><Layers3 size={15} aria-hidden/>Jornada de marketing</span><h3>Da mídia ao resultado</h3><p>Explore cada etapa e seus custos. Os indicadores são independentes.</p></div><label>Escala visual<select aria-label="Escala visual do funil" value={scale} onChange={event => setScale(event.target.value as 'linear'|'log')}><option value="log">Logarítmica</option><option value="linear">Linear</option></select></label></div>
    <div className="studio-funnel-layout"><ol className="studio-funnel-steps">{stages.map((stage,index) => {
      const w = width(stage.value), prior = width(stage.previousValue), color = colors[index % colors.length];
      return <li key={stage.metric}><button type="button" aria-pressed={active?.metric === stage.metric} onClick={() => setSelected(stage.metric)} className="studio-funnel-step" style={{'--stage-color':color} as React.CSSProperties}>
        <span className="studio-funnel-label"><span>{String(index+1).padStart(2,'0')}</span><strong>{stage.label}</strong><span>{stage.value === null ? 'Indisponível' : number(stage.value)}</span><ArrowRight size={15} aria-hidden/></span>
        <svg viewBox="0 0 600 65" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id={id+'-'+index}><stop stopColor={color} stopOpacity=".92"/><stop offset="100%" stopColor={color}/></linearGradient></defs>{observed(stage.value) && stage.value > 0 ? <polygon points={(300-w/2)+',2 '+(300+w/2)+',2 '+(300+w*.46)+',52 '+(300-w*.46)+',52'} fill={'url(#'+id+'-'+index+')'}/> : <line x1="280" x2="320" y1="25" y2="25" stroke={color} strokeWidth="3" strokeDasharray={stage.value === null ? '4 4' : undefined}/>}{comparing && observed(stage.previousValue) ? <line x1={300-prior/2} x2={300+prior/2} y1="60" y2="60" stroke="var(--studio-comparison, #8a99af)" strokeWidth="3" strokeDasharray="6 4"/> : null}</svg>
        {comparing ? <small>Comparativo: {stage.previousValue === null ? '—' : number(stage.previousValue)}</small> : null}
      </button></li>;
    })}</ol>
    {active ? <aside className="studio-stage-detail" aria-label="Detalhe da etapa selecionada" aria-live="polite"><span className="studio-kicker">Etapa em foco</span><h3>{active.label}</h3><strong className="studio-stage-total">{active.value === null ? '—' : number(active.value)}</strong><p>Resultado observado no período</p><div className="studio-stage-cost"><span>{active.costLabel}</span><strong>{money(active.cost,currency)}</strong></div>{comparing ? <div className="studio-stage-cost"><span>Período comparativo</span><strong>{active.previousValue === null ? '—' : number(active.previousValue)}</strong></div> : null}<p className="studio-stage-coverage">{active.detail}</p>{active.target !== null ? <p className="studio-stage-reference">Referência cadastrada: {number(active.target)} · Vigência não confirmada.</p> : null}<p className="studio-stage-disclaimer">Eventos atribuídos podem se sobrepor. Não são pessoas únicas, taxa de passagem ou vendas financeiras.</p></aside> : <p className="analytics-empty">Sem etapas configuradas.</p>}
    </div><p className="studio-scale-note">Escala {scale === 'log' ? 'logarítmica (log1p)' : 'linear'}, relativa ao maior valor dos períodos. Linha tracejada: comparativo. Zero e ausência permanecem distintos; não há cálculo de conversão entre etapas nem comprovação de janelas de atribuição equivalentes.</p>
  </div>;
}
