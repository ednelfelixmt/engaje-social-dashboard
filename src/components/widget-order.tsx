'use client';

import {useState} from 'react';
import {ArrowDown, ArrowUp, GripVertical} from 'lucide-react';
import {useSortableList} from '@/hooks/use-sortable-list';

const labels:Record<string,string>={
  kpis:'Indicadores principais', platforms:'Visão por plataforma', funnel:'Funil de conversão',
  timeline:'Evolução temporal', campaigns:'Campanhas e rankings', creatives:'Criativos e públicos',
};
const availableItems=['kpis','platforms','funnel','timeline','campaigns','creatives'];

function move<T>(items:T[],from:number,to:number){
  if(from===to||from<0||to<0)return items;
  const next=[...items];const [item]=next.splice(from,1);next.splice(to,0,item);return next;
}

export function WidgetOrder({initial}:{initial:string[]}){
  const [items,setItems]=useState(()=>[...initial.filter((item)=>availableItems.includes(item)),...availableItems.filter((item)=>!initial.includes(item))]);
  const reorder=(active:string,target:string)=>setItems((current)=>move(current,current.indexOf(active),current.indexOf(target)));
  const {dragging,over,selected,start,selectOrMove}=useSortableList<string>({selector:'[data-sortable-widget]',attribute:'data-sortable-widget',onMove:reorder});
  return <div className="space-y-2">
    <p className="muted text-xs">Arraste qualquer área livre do card até a posição desejada. Também é possível clicar em um card e depois no destino. A ordem é salva ao enviar o formulário.</p>
    {items.map((item,index)=><div key={item} data-sortable-widget={item} className={`grid touch-none select-none grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border p-3 transition ${dragging===item||selected===item?'scale-[.99] border-primary/70 bg-primary/[.12] shadow-lg':over===item?'border-emerald-400/70 bg-emerald-400/[.08]':'cursor-grab border-white/10 bg-white/[.025] active:cursor-grabbing'}`} onClick={(event)=>selectOrMove(item,event)} onPointerDown={(event)=>start(item,event)}>
      <input type="hidden" name="widget_order" value={item}/>
      <button type="button" aria-pressed={selected===item} aria-label={`Selecionar ou arrastar ${labels[item]??item}`} title="Arraste ou clique para selecionar" className="cursor-grab touch-none rounded-lg border border-white/10 p-2 text-zinc-400 active:cursor-grabbing active:text-primary" onClick={(event)=>selectOrMove(item,event,true)} onPointerDown={(event)=>{event.stopPropagation();start(item,event,true);}}><GripVertical size={17}/></button>
      <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index+1}</span>
      <span className="font-medium">{labels[item]??item}</span>
      <div className="flex gap-1"><button type="button" aria-label={`Subir ${labels[item]??item}`} disabled={!index} className="rounded-lg border border-white/10 p-2 disabled:opacity-30" onClick={()=>setItems((current)=>move(current,index,index-1))}><ArrowUp size={15}/></button><button type="button" aria-label={`Descer ${labels[item]??item}`} disabled={index===items.length-1} className="rounded-lg border border-white/10 p-2 disabled:opacity-30" onClick={()=>setItems((current)=>move(current,index,index+1))}><ArrowDown size={15}/></button></div>
    </div>)}
  </div>;
}
