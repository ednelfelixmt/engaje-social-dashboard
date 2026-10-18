'use client';

import dynamic from 'next/dynamic';

type TimelineRow={date:string;spend:number|null;revenue:number|null};

const TimelineChart=dynamic(
  ()=>import('@/components/dashboard/charts').then((module)=>module.Timeline),
  {ssr:false,loading:()=> <div className="timeline-chart mt-6 grid place-items-center text-sm text-zinc-600">Carregando gráfico…</div>},
);

export function TimelineLazy({rows,currency}:{rows:TimelineRow[];currency:string}){
  return <TimelineChart rows={rows} currency={currency}/>;
}
