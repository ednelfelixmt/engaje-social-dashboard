'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowUp, GripVertical} from 'lucide-react';

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
  const [dragging,setDragging]=useState<string|null>(null);
  const dragged=useRef<string|null>(null);
  const reorder=(target:string)=>setItems((current)=>move(current,current.indexOf(dragged.current??''),current.indexOf(target)));
  const start=(item:string,event:React.PointerEvent<HTMLElement>)=>{dragged.current=item;setDragging(item);event.currentTarget.setPointerCapture(event.pointerId);};
  const finish=()=>{dragged.current=null;setDragging(null);};
  useEffect(()=>{
    const track=(event:PointerEvent|MouseEvent)=>{if(!dragged.current)return;event.preventDefault();const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-sortable-id]')?.dataset.sortableId;if(target&&target!==dragged.current){reorder(target);dragged.current=target;setDragging(target);}};
    window.addEventListener('pointermove',track,{passive:false});window.addEventListener('mousemove',track,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('mouseup',finish);window.addEventListener('pointercancel',finish);
    return()=>{window.removeEventListener('pointermove',track);window.removeEventListener('mousemove',track);window.removeEventListener('pointerup',finish);window.removeEventListener('mouseup',finish);window.removeEventListener('pointercancel',finish);};
  },[]);
  return <div className="space-y-2">
    <p className="muted text-xs">Arraste pelo ícone para definir a ordem exibida no dashboard. A ordem é salva ao enviar o formulário.</p>
    {items.map((item,index)=><div key={item} draggable data-sortable-id={item} className={`grid select-none grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border p-3 transition ${dragging===item?'border-primary/60 bg-primary/[.09] shadow-lg':'border-white/10 bg-white/[.025]'}`} onPointerDown={(event)=>{if(!(event.target as HTMLElement).closest('button,input,select,textarea,a'))start(item,event);}} onDragStart={(event)=>{dragged.current=item;setDragging(item);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',item);}} onDragEnter={(event)=>{event.preventDefault();if(dragged.current&&dragged.current!==item){reorder(item);dragged.current=item;setDragging(item);}}} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault();finish();}} onDragEnd={finish}>
      <input type="hidden" name="widget_order" value={item}/>
      <button type="button" aria-label={`Arrastar ${labels[item]??item}`} title="Pressione e arraste para reordenar" className="cursor-grab touch-none rounded-lg border border-white/10 p-2 text-zinc-400 active:cursor-grabbing active:text-primary" onPointerDown={(event)=>start(item,event)}><GripVertical size={17}/></button>
      <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index+1}</span>
      <span className="font-medium">{labels[item]??item}</span>
      <div className="flex gap-1"><button type="button" aria-label={`Subir ${labels[item]??item}`} disabled={!index} className="rounded-lg border border-white/10 p-2 disabled:opacity-30" onClick={()=>setItems((current)=>move(current,index,index-1))}><ArrowUp size={15}/></button><button type="button" aria-label={`Descer ${labels[item]??item}`} disabled={index===items.length-1} className="rounded-lg border border-white/10 p-2 disabled:opacity-30" onClick={()=>setItems((current)=>move(current,index,index+1))}><ArrowDown size={15}/></button></div>
    </div>)}
  </div>;
}
