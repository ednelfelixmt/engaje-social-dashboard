'use client';

import type {ReactNode} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {SlidersHorizontal,ArrowRight} from 'lucide-react';
import type {Filters as FilterType} from '@/lib/metrics/query';

export function Filters({value,organizations,slug,actions}:{value:FilterType;organizations:{name:string;slug:string}[];slug:string;actions?:ReactNode}){
 const router=useRouter(),path=usePathname(),search=useSearchParams();
 const field='!h-9 !min-h-0 !rounded-lg !border-white/10 !bg-[#111723] !px-2.5 !py-1 !text-xs text-zinc-200';
 const label='flex min-w-0 flex-col gap-1 text-[10px] font-medium leading-4 text-zinc-500';
 function changeClient(next:string){const segments=path.split('/');segments[1]=next;router.push(segments.join('/')+'?'+search.toString());}
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);
   const query=new URLSearchParams([...search.entries()]);
   for(const [key,entry] of form.entries())query.set(key,String(entry));
   router.push(path+'?'+query.toString());
 }
 return <section aria-label="Filtros do relatório" className="rounded-xl border border-white/[.08] bg-white/[.018] px-3 py-2.5 sm:px-4">
  <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
   <div className="hidden h-9 shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 2xl:flex"><SlidersHorizontal size={14} className="text-primary"/>Filtros</div>
   <label className={label+' w-full sm:w-auto sm:min-w-40 sm:max-w-52'}>Cliente
    <select aria-label="Cliente" className={field+' w-full'} value={slug} onChange={e=>changeClient(e.target.value)}>{organizations.map(o=><option value={o.slug} key={o.slug}>{o.name}</option>)}</select>
   </label>
   <form onSubmit={submit} className="flex min-w-0 flex-1 flex-wrap items-end gap-x-2 gap-y-2">
    <label className={label}>De<input aria-label="Data inicial" className={field+' w-[132px]'} type="date" name="from" defaultValue={value.from} required/></label>
    <label className={label}>Até<input aria-label="Data final" className={field+' w-[132px]'} type="date" name="to" defaultValue={value.to} required/></label>
    <label className={label}>Comparar
     <select aria-label="Comparação" className={field+' w-[147px]'} name="compare" defaultValue={value.compare}><option value="previous_period">Período anterior</option><option value="previous_year">Ano anterior</option><option value="none">Sem comparação</option></select>
    </label>
    <label className={label+' hidden xl:flex'}>Moeda<input aria-label="Moeda" className={field+' w-[68px]'} name="currency" defaultValue={value.currency} pattern="[A-Z]{3}" maxLength={3} required/></label>
    <button type="submit" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary/90 px-3 text-xs font-semibold text-black transition hover:bg-primary">Aplicar <ArrowRight size={13}/></button>
   </form>
   {actions?<div className="flex min-h-9 min-w-0 items-center lg:ml-auto [&_[data-personalize-bar]]:gap-1 [&_[data-personalize-bar]_button]:!min-h-9">{actions}</div>:null}
  </div>
 </section>;
}
