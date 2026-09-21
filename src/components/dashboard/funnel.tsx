import {ArrowDown, CheckCircle2, CircleDollarSign, Route} from 'lucide-react';
import {money, number} from '@/lib/utils';

export type FunnelStep = {
  label: string;
  value: number | null;
  costLabel?: string;
  cost?: number | null;
  detail?: string | null;
  color?: string;
};

const colors = ['#2563EB', '#4F46E5', '#7C3AED', '#D97706', '#10B981', '#16A34A'];
const defaultNames = ['Impressões', 'Cliques', 'Visitas', 'Leads', 'Checkouts', 'Compras'];

function conversion(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous <= 0) return null;
  return current / previous * 100;
}

export function Funnel({values, steps: suppliedSteps, currency = 'BRL'}: {
  values?: (number | null)[];
  steps?: FunnelStep[];
  currency?: string;
}) {
  const steps: FunnelStep[] = suppliedSteps ?? (values ?? []).map((value, index) => ({label: defaultNames[index] ?? `Etapa ${index + 1}`, value}));
  if (!steps.length) return null;

  const firstValue = steps[0]?.value;
  const lastValue = [...steps].reverse().find((step) => step.value != null)?.value ?? null;
  const totalConversion = conversion(lastValue, firstValue);
  const firstPositive = steps.find((step) => step.value != null && step.value > 0)?.value ?? 1;
  let previousWidth = 100;
  const widths = steps.map((step, index) => {
    if (index === 0) return 100;
    const proportional = step.value == null ? 38 : Math.max(38, Math.sqrt(Math.max(step.value, 0) / firstPositive) * 100);
    previousWidth = Math.max(38, Math.min(previousWidth - 7, proportional));
    return previousWidth;
  });

  return <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#111117] shadow-[0_28px_80px_rgba(0,0,0,.28)]">
    <div className="grid border-b border-white/10 sm:grid-cols-3">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:border-b-0 sm:border-r"><Route className="text-blue-400" size={19} /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Entrada do funil</p><strong className="mt-1 block text-lg">{number(firstValue)}</strong></div></div>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:border-b-0 sm:border-r"><CheckCircle2 className="text-emerald-400" size={19} /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Conversão final</p><strong className="mt-1 block text-lg">{totalConversion == null ? '—' : `${number(totalConversion, 2)}%`}</strong></div></div>
      <div className="flex items-center gap-3 px-5 py-4"><CircleDollarSign className="text-primary" size={19} /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Etapas monitoradas</p><strong className="mt-1 block text-lg">{steps.length}</strong></div></div>
    </div>

    <div className="grid xl:grid-cols-[minmax(420px,1.2fr)_minmax(340px,.8fr)]">
      <div className="relative flex min-h-[520px] flex-col justify-center overflow-hidden border-b border-white/10 px-4 py-9 xl:border-b-0 xl:border-r xl:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,214,0,.09),transparent_42%)]" />
        <div className="pointer-events-none absolute left-1/2 top-12 h-[calc(100%-6rem)] w-px bg-gradient-to-b from-blue-500/0 via-white/15 to-emerald-500/0" />
        {steps.map((step, index) => {
          const rate = index ? conversion(step.value, steps[index - 1].value) : null;
          const color = step.color ?? colors[index % colors.length];
          return <div className="group relative mx-auto -mt-px flex h-[72px] items-center justify-center first:mt-0" key={`${step.label}-${index}`} style={{width: `${widths[index]}%`}}>
            <div className="absolute inset-0 border-y border-white/20 shadow-[0_16px_35px_rgba(0,0,0,.24)] transition duration-300 group-hover:brightness-125" style={{background: `linear-gradient(110deg, color-mix(in srgb, ${color} 78%, black), ${color})`, clipPath: 'polygon(3% 0, 97% 0, 90% 100%, 10% 100%)'}} />
            <div className="absolute inset-x-[12%] top-px h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            <div className="relative z-10 flex w-full items-center justify-between gap-3 px-[12%] text-white drop-shadow-md"><span className="truncate text-[10px] font-bold uppercase tracking-[0.15em] sm:text-xs">{step.label}</span><strong className="shrink-0 text-base tabular-nums sm:text-xl">{number(step.value)}</strong></div>
            {index > 0 ? <div className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#101015] px-2.5 py-1 text-[9px] font-semibold text-zinc-300 shadow-lg"><ArrowDown size={10} className="text-primary" />{rate == null ? 'Sem taxa' : `${number(rate, 1)}%`}</div> : null}
          </div>;
        })}
      </div>

      <div className="relative space-y-3 bg-white/[0.018] p-5 sm:p-7">
        <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Detalhamento por etapa</p><p className="mt-2 text-sm text-zinc-400">Volume, eficiência e custo calculados no período.</p></div>
        <div className="absolute bottom-8 left-[38px] top-[94px] w-px bg-gradient-to-b from-blue-500/50 via-violet-500/30 to-emerald-500/50" />
        {steps.map((step, index) => {
          const rate = index ? conversion(step.value, steps[index - 1].value) : null;
          const color = step.color ?? colors[index % colors.length];
          return <div className="group relative grid min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]" key={`${step.label}-detail-${index}`}>
            <span className="relative z-10 grid size-6 place-items-center rounded-full border-4 border-[#17171d] text-[9px] font-bold text-white shadow-lg" style={{backgroundColor: color}}>{index + 1}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-zinc-100">{step.label}</p>{index ? <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-zinc-400">{rate == null ? '—' : `${number(rate, 1)}% da anterior`}</span> : null}</div>{step.detail ? <p className="mt-1 text-[11px] font-medium leading-4 text-primary">{step.detail}</p> : <p className="mt-1 text-[10px] text-zinc-600">Etapa {index + 1} de {steps.length}</p>}</div>
            <div className="min-w-[82px] text-right"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{step.costLabel ?? 'Volume'}</p><strong className="mt-1 block text-sm tabular-nums text-zinc-100">{step.costLabel ? money(step.cost, currency) : number(step.value)}</strong></div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}
