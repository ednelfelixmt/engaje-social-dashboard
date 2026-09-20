'use client';

import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {SlidersHorizontal} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {Filters as FilterType} from '@/lib/metrics/query';

export function Filters({value, organizations, slug}: {value: FilterType; organizations: {name: string; slug: string}[]; slug: string}) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();

  return <div className="rounded-2xl border border-white/10 bg-[#17171E]/80 p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"><SlidersHorizontal size={14} />Filtros do relatório</div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-52">Cliente<select value={slug} onChange={(event) => {const segments = path.split('/'); segments[1] = event.target.value; router.push(segments.join('/') + '?' + search.toString());}}>{organizations.map((organization) => <option value={organization.slug} key={organization.slug}>{organization.name}</option>)}</select></label>
      <form className="flex flex-1 flex-wrap items-end gap-3" onSubmit={(event) => {event.preventDefault(); const form = new FormData(event.currentTarget); router.push(path + '?' + new URLSearchParams(Array.from(form.entries()).map(([key, entry]) => [key, String(entry)])).toString());}}>
        <label>De<input type="date" name="from" defaultValue={value.from} required /></label>
        <label>Até<input type="date" name="to" defaultValue={value.to} required /></label>
        <label className="min-w-44">Comparação<select name="compare" defaultValue={value.compare}><option value="none">Não comparar</option><option value="previous_period">Período anterior</option><option value="previous_year">Ano anterior</option></select></label>
        <label>Moeda<input className="w-20" name="currency" defaultValue={value.currency} pattern="[A-Z]{3}" maxLength={3} /></label>
        <Button type="submit">Aplicar filtros</Button>
      </form>
    </div>
  </div>;
}
