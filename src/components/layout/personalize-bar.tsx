'use client';

import {ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, RotateCcw, SlidersHorizontal, Users} from 'lucide-react';
import {useDashboardLayout} from '@/components/layout/dashboard-layout';

export function PersonalizeBar() {
  const layout = useDashboardLayout();
  if (!layout) return null;
  const {editing, setEditing, personalized, canPromote, status, message, blocks} = layout;
  const {order, hidden} = layout.blockState();
  const labelOf = (id: string) => blocks.find((block) => block.id === id)?.label ?? id;
  const statusText = status === 'saving' ? 'Salvando…' : status === 'saved' ? 'Alterações salvas' : status === 'error' ? (message ?? 'Erro ao salvar') : message;

  if (!editing) {
    return <div className="flex flex-wrap items-center justify-end gap-3" data-personalize-bar>
      {personalized ? <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Visão personalizada</span> : null}
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-primary/40 hover:text-white"><SlidersHorizontal size={14} />Personalizar</button>
    </div>;
  }

  return <section className="rounded-2xl border border-primary/30 bg-primary/[.05] p-4 sm:p-5" data-personalize-bar aria-label="Personalizar esta tela">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">Modo de personalização</p>
        <h2 className="mt-1.5 text-base font-semibold">Monte esta tela do seu jeito</h2>
        <p className="muted mt-1.5 text-xs leading-5">Arraste os cards para reorganizar e use o olho para ocultar ou mostrar. Tudo é salvo na sua conta e vale em qualquer computador. As métricas ativas continuam definidas pela agência.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {statusText ? <span role="status" className={`inline-flex items-center gap-1.5 text-[11px] ${status === 'error' ? 'text-rose-300' : 'text-zinc-400'}`}>{status === 'saving' ? <Loader2 className="animate-spin" size={12} /> : status === 'saved' ? <Check className="text-emerald-400" size={12} /> : null}{statusText}</span> : null}
        <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-black"><Check size={14} />Concluir</button>
      </div>
    </div>

    {blocks.length > 1 ? <div className="mt-4 rounded-xl border border-white/[.08] bg-black/20 p-3 sm:p-4">
      <p className="text-xs font-semibold text-zinc-200">Blocos da tela</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {order.map((id, index) => <li key={id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${hidden.has(id) ? 'border-white/[.05] text-zinc-500' : 'border-white/10 text-zinc-200'}`}>
          <span className="grid size-5 place-items-center rounded-full bg-white/[.06] text-[10px] font-bold">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate">{labelOf(id)}</span>
          <button type="button" aria-label={`Subir ${labelOf(id)}`} disabled={!index} onClick={() => layout.moveBlock(id, order[index - 1])} className="rounded-md border border-white/10 p-1.5 disabled:opacity-30"><ArrowUp size={12} /></button>
          <button type="button" aria-label={`Descer ${labelOf(id)}`} disabled={index === order.length - 1} onClick={() => layout.moveBlock(id, order[index + 1])} className="rounded-md border border-white/10 p-1.5 disabled:opacity-30"><ArrowDown size={12} /></button>
          <button type="button" aria-label={hidden.has(id) ? `Mostrar ${labelOf(id)}` : `Ocultar ${labelOf(id)}`} aria-pressed={hidden.has(id)} onClick={() => layout.toggleBlock(id)} className="rounded-md border border-white/10 p-1.5">{hidden.has(id) ? <EyeOff size={12} /> : <Eye size={12} />}</button>
        </li>)}
      </ul>
    </div> : null}

    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" disabled={!personalized} onClick={() => layout.reset()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:text-white disabled:opacity-40"><RotateCcw size={13} />Restaurar padrão</button>
      {canPromote ? <button type="button" disabled={!personalized} onClick={() => layout.promote()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:text-white disabled:opacity-40"><Users size={13} />Salvar como padrão do cliente</button> : null}
    </div>
  </section>;
}
