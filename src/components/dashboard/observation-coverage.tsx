'use client';

export type ObservationInterval = {
  index: number;
  label: string;
  received: boolean;
  detail: string;
};

/** Presence of source records is not a guarantee of complete collection. */
export function ObservationCoverage({intervals,selected,onSelect}: {
  intervals: ObservationInterval[];
  selected: number|null;
  onSelect: (index:number)=>void;
}) {
  if (!intervals.length) return null;
  return <div className="observation-coverage">
    <div className="observation-heading"><strong>Registros por intervalo</strong><span><i/>Com registros <i data-missing/>Sem registros</span></div>
    <div className="observation-calendar" style={{gridTemplateColumns:`repeat(${Math.min(intervals.length,60)},minmax(0,1fr))`}}>
      {intervals.map(interval=><button
        type="button"
        key={interval.index}
        data-received={interval.received}
        aria-label={`Consultar ${interval.label}: ${interval.detail}`}
        aria-pressed={selected===interval.index}
        title={`${interval.label} · ${interval.detail}`}
        onClick={()=>onSelect(interval.index)}
      />)}
    </div>
    <div className="observation-dates"><span>{intervals[0].label}</span><span>Selecione para consultar os valores</span><span>{intervals.at(-1)!.label}</span></div>
    <select className="observation-select" aria-label="Consultar intervalo do gráfico" value={selected??''} onChange={event=>{if(event.target.value!=='')onSelect(Number(event.target.value));}}><option value="">Consultar um intervalo…</option>{intervals.map(interval=><option key={interval.index} value={interval.index}>{interval.label} · {interval.received?'com registros':'sem registros'}</option>)}</select>
  </div>;
}
