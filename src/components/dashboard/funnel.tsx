import {money, number} from '@/lib/utils';

export type FunnelStep = {
  label: string;
  value: number | null;
  costLabel?: string;
  cost?: number | null;
  detail?: string | null;
  color?: string;
};

const colors = ['#1769ff', '#3464ed', '#635bdf', '#8b5cf6', '#f59e0b', '#34d399', '#22c55e', '#16a34a'];
const defaultNames = ['Impressões', 'Cliques', 'Visitas', 'Leads', 'Checkouts', 'Compras'];

export function Funnel({values, steps: suppliedSteps, currency = 'BRL'}: {
  values?: (number | null)[];
  steps?: FunnelStep[];
  currency?: string;
}) {
  const steps: FunnelStep[] = suppliedSteps ?? (values ?? []).map((value, index) => ({label: defaultNames[index] ?? `Etapa ${index + 1}`, value}));
  const firstPositive = steps.find((step) => step.value != null && step.value > 0)?.value ?? 1;
  let previousWidth = 100;
  const widths = steps.map((step, index) => {
    if (index === 0) return 100;
    const proportional = step.value == null ? 34 : Math.max(34, Math.sqrt(Math.max(step.value, 0) / firstPositive) * 100);
    previousWidth = Math.max(34, Math.min(previousWidth - 6, proportional));
    return previousWidth;
  });

  if (!steps.length) return null;

  return <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(320px,1fr)_minmax(260px,0.62fr)]">
    <div className="flex min-h-[420px] flex-col justify-center rounded-2xl border border-white/10 bg-black/20 px-3 py-5 sm:px-8">
      {steps.map((step, index) => {
        const prior = index ? steps[index - 1].value : null;
        const rate = prior && step.value != null ? step.value / prior * 100 : null;
        return <div className="group relative mx-auto -mt-px flex h-[68px] items-center justify-center transition first:mt-0" key={step.label} style={{width: `${widths[index]}%`}}>
          <div className="absolute inset-0 border-y border-white/20 shadow-[0_12px_30px_rgba(0,0,0,.18)] transition group-hover:brightness-110" style={{background: step.color ?? colors[index % colors.length], clipPath: 'polygon(4% 0, 96% 0, 90% 100%, 10% 100%)'}} />
          <div className="relative z-10 flex items-baseline gap-2 px-5 text-center text-white drop-shadow"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs">{step.label}</span><strong className="text-base sm:text-lg">{number(step.value)}</strong></div>
          {index > 0 ? <span className="absolute -top-2 right-1 z-20 rounded-full border border-white/10 bg-[#111116] px-2 py-0.5 text-[9px] text-zinc-300">{rate == null ? '—' : `${number(rate, 1)}%`}</span> : null}
        </div>;
      })}
    </div>
    <div className="flex flex-col justify-center gap-2.5">
      {steps.map((step, index) => <div className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3" key={step.label}>
        <div><p className="text-xs font-medium text-zinc-200">{step.label}</p>{step.detail ? <p className="mt-1 text-[11px] font-medium text-primary">{step.detail}</p> : <p className="mt-1 text-[10px] text-zinc-600">Etapa {index + 1}</p>}</div>
        <div className="text-right"><p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{step.costLabel ?? 'Volume'}</p><strong className="mt-0.5 block text-sm">{step.costLabel ? money(step.cost, currency) : number(step.value)}</strong></div>
      </div>)}
    </div>
  </div>;
}
