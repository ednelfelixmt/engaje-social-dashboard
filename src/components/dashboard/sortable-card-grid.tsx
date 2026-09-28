'use client';

import {useEffect, useId, useState, type ReactNode} from 'react';
import {GripVertical} from 'lucide-react';
import {useSortableList} from '@/hooks/use-sortable-list';
import {cn} from '@/lib/utils';

type SortableCardItem={id:string;content:ReactNode};

function move<T>(items:T[],from:number,to:number){
  if(from===to||from<0||to<0)return items;
  const next=[...items];const [item]=next.splice(from,1);next.splice(to,0,item);return next;
}

export function SortableCardGrid({items,storageKey,className}:{items:SortableCardItem[];storageKey:string;className:string}){
  const scope=useId();
  const ids=items.map((item)=>item.id);
  const [order,setOrder]=useState(ids);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let stored:unknown=[];
    try{stored=JSON.parse(localStorage.getItem(`engaje:card-order:v1:${storageKey}`)||'[]');}catch{stored=[];}
    const saved=Array.isArray(stored)?stored.filter((id):id is string=>typeof id==='string'&&ids.includes(id)):[];
    setOrder([...saved,...ids.filter((id)=>!saved.includes(id))]);
    setReady(true);
    // The item set is stable for the rendered dashboard/filter combination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[storageKey]);

  useEffect(()=>{
    if(ready)localStorage.setItem(`engaje:card-order:v1:${storageKey}`,JSON.stringify(order));
  },[order,ready,storageKey]);

  const reorder=(active:string,target:string)=>setOrder((current)=>move(current,current.indexOf(active),current.indexOf(target)));
  const selector=`[data-sortable-scope="${scope}"][data-sortable-card]`;
  const {dragging,over,selected,start,selectOrMove}=useSortableList<string>({selector,attribute:'data-sortable-card',onMove:reorder});
  const byId=new Map(items.map((item)=>[item.id,item.content]));
  const visible=[...order.filter((id)=>byId.has(id)),...ids.filter((id)=>!order.includes(id))];

  return <div className={className}>
    {visible.map((id)=><div
      key={id}
      data-sortable-scope={scope}
      data-sortable-card={id}
      onClick={(event)=>selectOrMove(id,event)}
      onPointerDown={(event)=>start(id,event)}
      className={cn('group/sortable relative h-full touch-none select-none transition [&>*]:h-full',dragging===id||selected===id?'z-20 scale-[.985] rounded-[22px] ring-2 ring-primary/70 shadow-2xl':over===id?'rounded-[22px] ring-2 ring-emerald-400/70':'cursor-grab active:cursor-grabbing')}
    >
      <button type="button" aria-label="Mover card" title="Arraste para reorganizar" aria-pressed={selected===id} className="absolute right-3 top-3 z-20 cursor-grab rounded-lg border border-white/10 bg-black/70 p-1.5 text-zinc-500 opacity-0 backdrop-blur transition hover:text-primary group-hover/sortable:opacity-100 focus:opacity-100 active:cursor-grabbing" onClick={(event)=>selectOrMove(id,event,true)} onPointerDown={(event)=>{event.stopPropagation();start(id,event,true);}}><GripVertical size={15}/></button>
      {byId.get(id)}
    </div>)}
  </div>;
}
