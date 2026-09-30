'use client';

import {useEffect, useId, type ReactNode} from 'react';
import {Eye, EyeOff, GripVertical} from 'lucide-react';
import {useSortableList} from '@/hooks/use-sortable-list';
import {useDashboardLayout} from '@/components/layout/dashboard-layout';
import {cn} from '@/lib/utils';

type SortableCardItem={id:string;content:ReactNode};

/**
 * Grade de cards. Fora do modo "Personalizar" é uma grade comum; no modo de edição os cards
 * podem ser arrastados e ocultados, e a escolha é salva na conta do usuário (não no navegador).
 * `storageKey` é a chave antiga do navegador, importada uma única vez para a conta.
 */
export function SortableCardGrid({items,gridId,storageKey,className}:{items:SortableCardItem[];gridId:string;storageKey:string;className:string}){
  const layout=useDashboardLayout();
  const scope=useId();
  const known=items.map((item)=>item.id);
  const editing=layout?.editing??false;
  const {order,hidden}=layout?layout.gridState(gridId,known):{order:known,hidden:new Set<string>()};

  useEffect(()=>{
    if(!layout||layout.hasGrid(gridId))return;
    const legacyKey=`engaje:card-order:v1:${storageKey}`;
    try{
      const stored:unknown=JSON.parse(localStorage.getItem(legacyKey)||'[]');
      const valid=Array.isArray(stored)?stored.filter((id):id is string=>typeof id==='string'&&known.includes(id)):[];
      if(valid.length)layout.importGrid(gridId,[...new Set(valid)]);
      localStorage.removeItem(legacyKey);
    }catch{/* sem armazenamento local: nada a migrar */}
    // Migração única, na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const reorder=(active:string,target:string)=>layout?.moveInGrid(gridId,known,active,target);
  const selector=`[data-sortable-scope="${scope}"][data-sortable-card]`;
  const {dragging,over,selected,start,selectOrMove}=useSortableList<string>({selector,attribute:'data-sortable-card',onMove:reorder});
  const byId=new Map(items.map((item)=>[item.id,item.content]));
  const visible=order.filter((id)=>byId.has(id)&&(editing||!hidden.has(id)));

  return <div className={className}>
    {visible.map((id)=>{
      const isHidden=hidden.has(id);
      return <div
        key={id}
        data-sortable-scope={scope}
        data-sortable-card={id}
        onClick={editing?(event)=>selectOrMove(id,event):undefined}
        onPointerDown={editing?(event)=>start(id,event):undefined}
        className={cn('group/sortable relative h-full transition [&>*]:h-full',editing&&'touch-none select-none',isHidden&&'opacity-40 saturate-0',
          editing&&(dragging===id||selected===id?'z-20 scale-[.985] rounded-[22px] ring-2 ring-primary/70 shadow-2xl':over===id?'rounded-[22px] ring-2 ring-emerald-400/70':'cursor-grab rounded-[22px] ring-1 ring-dashed ring-white/15 active:cursor-grabbing'))}
      >
        {editing?<div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
          <button type="button" aria-label={isHidden?'Mostrar card':'Ocultar card'} aria-pressed={isHidden} title={isHidden?'Mostrar este card':'Ocultar este card'} className="rounded-lg border border-white/10 bg-black/70 p-1.5 text-zinc-300 backdrop-blur transition hover:text-primary" onClick={(event)=>{event.stopPropagation();layout?.toggleInGrid(gridId,known,id);}} onPointerDown={(event)=>event.stopPropagation()}>{isHidden?<EyeOff size={15}/>:<Eye size={15}/>}</button>
          <button type="button" aria-label="Mover card" title="Arraste para reorganizar" aria-pressed={selected===id} className="cursor-grab rounded-lg border border-white/10 bg-black/70 p-1.5 text-zinc-300 backdrop-blur transition hover:text-primary active:cursor-grabbing" onClick={(event)=>selectOrMove(id,event,true)} onPointerDown={(event)=>{event.stopPropagation();start(id,event,true);}}><GripVertical size={15}/></button>
        </div>:null}
        {byId.get(id)}
      </div>;
    })}
  </div>;
}
