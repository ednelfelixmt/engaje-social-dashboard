import type {CSSProperties} from 'react';
import {ArrowDown, CheckCircle2, CircleDollarSign, Route, Trophy} from 'lucide-react';
import {money, number} from '@/lib/utils';

export type FunnelStep = {
  label: string;
  value: number | null;
  costLabel?: string;
  cost?: number | null;
  detail?: string | null;
  color?: string;
};

const colors = ['#4DD4FF', '#5BA7FF', '#8B7CFF', '#F4D35E', '#5CE1A4', '#35C982'];
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
  const lastValue = steps.at(-1)?.value ?? null;
  const totalConversion = conversion(lastValue, firstValue);
  // The geometry represents the journey order. Actual performance is expressed
  // by the values and conversion labels, avoiding a misleading area comparison.
  const minimumWidth = steps.length > 6 ? 58 : 52;
  const widthStep = steps.length > 1 ? (100 - minimumWidth) / (steps.length - 1) : 0;
  const widths = steps.map((_, index) => 100 - widthStep * index);

  return <div className="mt-6 overflow-hidden rounded-[24px] border border-white/[.08] bg-[#090d15]/80">
    <div className="grid border-b border-white/[.08] sm:grid-cols-3">
      <div className="flex items-center gap-3 border-b border-white/[.08] px-5 py-4 sm:border-b-0 sm:border-r"><Route className="text-cyan-300" size={18} /><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-zinc-500">Entrada</p><strong className="data-value mt-1 block text-lg">{number(firstValue)}</strong></div></div>
      <div className="flex items-center gap-3 border-b border-white/[.08] px-5 py-4 sm:border-b-0 sm:border-r"><CheckCircle2 className="text-emerald-400" size={18} /><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-zinc-500">Conversão final</p><strong className="data-value mt-1 block text-lg">{totalConversion == null ? '—' : `${number(totalConversion, 2)}%`}</strong></div></div>
      <div className="flex items-center gap-3 px-5 py-4"><CircleDollarSign className="text-primary" size={18} /><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-zinc-500">Etapas monitoradas</p><strong className="data-value mt-1 block text-lg">{steps.length}</strong></div></div>
    </div>

    <div className="grid 2xl:grid-cols-[minmax(540px,1.18fr)_minmax(380px,.82fr)]">
      <div className="relative flex flex-col justify-center overflow-hidden border-b border-white/[.08] px-3 py-8 sm:px-7 2xl:border-b-0 2xl:border-r 2xl:px-10" style={{minHeight:`${Math.max(470,steps.length*96+86)}px`}}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(77,212,255,.13),transparent_52%)]" />
        <div className="pointer-events-none absolute inset-x-[10%] top-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative mx-auto w-full max-w-[780px] py-4">
          {steps.map((step, index) => {
            const color = step.color ?? colors[index % colors.length];
            const currentWidth = widths[index];
            return <div className="relative mx-auto pb-5 last:pb-0" key={`${step.label}-${index}`} style={{width: `${currentWidth}%`}}>
              <div className="funnel-stage" style={{'--stage-color': color} as CSSProperties}>
                <div className="relative z-10 flex max-w-[78%] flex-col items-center justify-center text-center drop-shadow-md">
                  <strong className="data-value text-xl leading-none text-white sm:text-2xl">{number(step.value)}</strong>
                  <span className="mt-1.5 max-w-full truncate text-[9px] font-extrabold uppercase tracking-[.15em] text-white/90 sm:text-[11px]">{step.label}</span>
                </div>
              </div>
              {index < steps.length - 1 ? <div className="absolute -bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[#080c13] px-3 py-1 text-[9px] font-bold text-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,.55)]"><ArrowDown size={10} className="text-primary" /><span>{conversion(steps[index + 1].value, step.value) == null ? 'Taxa indisponível' : `${number(conversion(steps[index + 1].value, step.value), 1)}% avançaram`}</span></div> : null}
            </div>;
          })}
          <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-1.5 text-[10px] font-semibold text-emerald-300"><Trophy size={12}/>Conversão final {totalConversion == null ? 'indisponível' : `${number(totalConversion, 2)}%`}</div>
        </div>
      </div>

      <div className="relative space-y-3 bg-white/[.012] p-5 sm:p-7">
        <div className="mb-5"><p className="eyebrow">Leitura por etapa</p><p className="mt-2 text-sm text-zinc-400">Volume, taxa e custo do período selecionado.</p></div>
        <div className="absolute bottom-8 left-[38px] top-[94px] w-px bg-gradient-to-b from-cyan-400/50 via-violet-400/30 to-emerald-400/50" />
        {steps.map((step, index) => {
          const rate = index ? conversion(step.value, steps[index - 1].value) : null;
          const color = step.color ?? colors[index % colors.length];
          return <div className="group relative grid min-h-[76px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[.045]" key={`${step.label}-detail-${index}`}>
            <span className="relative z-10 grid size-6 place-items-center rounded-full border-4 border-[#111722] text-[9px] font-bold text-white shadow-lg" style={{backgroundColor: color}}>{index + 1}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-zinc-100">{step.label}</p>{index ? <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-zinc-400">{rate == null ? '—' : `${number(rate, 1)}% da anterior`}</span> : null}</div>{step.detail ? <p className="mt-1 text-[11px] font-medium leading-4 text-primary">{step.detail}</p> : <p className="mt-1 text-[10px] text-zinc-600">Etapa {index + 1} de {steps.length}</p>}</div>
            <div className="min-w-[82px] text-right"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-zinc-500">{step.costLabel ?? 'Volume'}</p><strong className="data-value mt-1 block text-sm text-zinc-100">{step.costLabel ? money(step.cost, currency) : number(step.value)}</strong></div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}
