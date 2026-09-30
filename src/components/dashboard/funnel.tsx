import {useId, type ReactNode} from 'react';
import {ArrowDownRight, ArrowUpRight, CalendarCheck, CreditCard, Download, Eye, FileText, Globe, GraduationCap, Handshake, Heart, House, MapPin, MessageCircle, MousePointerClick, Navigation, Phone, Play, Receipt, Repeat, ShoppingBag, ShoppingCart, Stethoscope, Star, Target, UserPlus, Users, Utensils, TrendingDown, Route, CheckCircle2} from 'lucide-react';
import {money, number} from '@/lib/utils';
import {funnelDefaultColors, type FunnelIconKey} from '@/lib/metrics/funnel-config';

export type FunnelStep = {
  label: string;
  value: number | null;
  costLabel?: string;
  cost?: number | null;
  detail?: string | null;
  color?: string;
  icon?: FunnelIconKey;
  target?: number | null;
  previousValue?: number | null;
};

const iconMap: Record<FunnelIconKey, (props: {size?: number; className?: string}) => ReactNode> = {
  eye: (p) => <Eye {...p} />, users: (p) => <Users {...p} />, click: (p) => <MousePointerClick {...p} />, globe: (p) => <Globe {...p} />,
  form: (p) => <FileText {...p} />, 'user-plus': (p) => <UserPlus {...p} />, message: (p) => <MessageCircle {...p} />, phone: (p) => <Phone {...p} />,
  cart: (p) => <ShoppingCart {...p} />, card: (p) => <CreditCard {...p} />, bag: (p) => <ShoppingBag {...p} />, calendar: (p) => <CalendarCheck {...p} />,
  pin: (p) => <MapPin {...p} />, download: (p) => <Download {...p} />, star: (p) => <Star {...p} />, target: (p) => <Target {...p} />,
  handshake: (p) => <Handshake {...p} />, receipt: (p) => <Receipt {...p} />, play: (p) => <Play {...p} />, heart: (p) => <Heart {...p} />,
  repeat: (p) => <Repeat {...p} />, home: (p) => <House {...p} />, health: (p) => <Stethoscope {...p} />, school: (p) => <GraduationCap {...p} />,
  food: (p) => <Utensils {...p} />, navigation: (p) => <Navigation {...p} />,
};

export function StepIcon({name, size = 14, className}: {name?: FunnelIconKey; size?: number; className?: string}) {
  return <>{(iconMap[name ?? 'target'] ?? iconMap.target)({size, className})}</>;
}

function conversion(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous <= 0) return null;
  return current / previous * 100;
}

function mix(hex: string, target: number, amount: number) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount) + target * amount);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

// Geometria em unidades do viewBox (largura 400, altura = altura da linha).
const HALF = 190;
const MIN_RATIO = 0.24;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Largura de cada camada em escala logarítmica: os volumes de um funil variam em
 * várias ordens de grandeza (120 mil impressões contra 10 vendas) e, numa escala
 * linear, quase todas as camadas ficariam no piso mínimo. Os valores exatos e as
 * taxas de avanço aparecem sempre ao lado de cada camada.
 */
export function coneRatios(values: (number | null)[]) {
  const positives = values.filter((value): value is number => value != null && value > 0);
  const max = Math.max(...positives, 1);
  const min = Math.min(...positives, max);
  const span = Math.log(max / min);
  let last = 1;
  return values.map((value) => {
    if (value == null || value <= 0) return last = Math.max(MIN_RATIO, last * 0.86);
    const ratio = span === 0 ? 1 : MIN_RATIO + (1 - MIN_RATIO) * (Math.log(value / min) / span);
    return last = clamp(ratio, MIN_RATIO, 1);
  });
}

function rowHeight(count: number) {
  return count <= 6 ? 76 : count <= 8 ? 64 : count <= 10 ? 52 : 44;
}

type FunnelRow = {step: FunnelStep; index: number; color: string; missing: boolean; topRatio: number; bottomRatio: number; rate: number | null; isLeak: boolean};

function StepDetails({row, compact, currency, comparing}: {row: FunnelRow; compact: boolean; currency: string; comparing: boolean}) {
  const {step, index, color, rate, isLeak} = row;
  const change = comparing && step.value != null && step.previousValue != null && step.previousValue > 0 ? (step.value - step.previousValue) / step.previousValue * 100 : null;
  const progress = step.target && step.target > 0 && step.value != null ? step.value / step.target * 100 : null;
  return <>
    <div className="flex items-center gap-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-lg" style={{backgroundColor: `${color}33`, color}}><StepIcon name={step.icon} size={compact ? 12 : 14} /></span>
      <p className="truncate text-xs font-semibold text-zinc-100 sm:text-sm">{step.label}</p>
      {isLeak ? <span className="shrink-0 rounded-full bg-rose-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-300">Maior perda</span> : null}
      <strong className="data-value ml-auto shrink-0 text-xs text-zinc-100 sm:text-sm">{number(step.value)}</strong>
    </div>
    <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-400 ${compact ? 'hidden lg:flex' : ''}`}>
      {index ? <span>{rate == null ? 'Taxa indisponível' : <><b className="font-semibold text-zinc-200">{number(rate, rate < 10 ? 1 : 0)}%</b> da etapa anterior</>}</span> : <span>Topo do funil</span>}
      {step.costLabel ? <span>{step.costLabel} <b className="font-semibold text-zinc-200">{step.cost == null ? '—' : money(step.cost, currency)}</b></span> : null}
      {change != null ? <span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{number(Math.abs(change), 1)}% vs. anterior</span> : null}
    </div>
    {progress != null && !compact ? <div className="mt-1.5 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(progress))} aria-label={`Meta de ${step.label}`}><div className="h-full rounded-full" style={{width: `${Math.min(100, progress)}%`, backgroundColor: progress >= 100 ? '#34d399' : color}} /></div><span className="shrink-0 text-[10px] text-zinc-400">Meta {number(step.target)} · <b className={progress >= 100 ? 'text-emerald-400' : 'text-zinc-200'}>{number(progress, 0)}%</b></span></div> : null}
  </>;
}

export function Funnel({steps: suppliedSteps, values, currency = 'BRL', comparing = false, preview = false}: {
  steps?: FunnelStep[];
  values?: (number | null)[];
  currency?: string;
  comparing?: boolean;
  preview?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const steps: FunnelStep[] = suppliedSteps ?? (values ?? []).map((value, index) => ({label: `Etapa ${index + 1}`, value}));
  if (!steps.length) return null;

  const height = rowHeight(steps.length);
  const compact = height < 56;
  const ratios = coneRatios(steps.map((step) => step.value));
  const rates = steps.map((step, index) => index ? conversion(step.value, steps[index - 1].value) : null);
  let leak = -1;
  rates.forEach((rate, index) => { if (rate != null && (leak < 0 || rate < (rates[leak] as number))) leak = index; });
  const firstValue = steps[0].value;
  const lastValue = steps.at(-1)?.value ?? null;
  const totalConversion = conversion(lastValue, firstValue);

  const rows: FunnelRow[] = steps.map((step, index) => ({
    step, index,
    color: step.color ?? funnelDefaultColors[index % funnelDefaultColors.length],
    missing: step.value == null,
    topRatio: ratios[index],
    bottomRatio: index < steps.length - 1 ? ratios[index + 1] : ratios[index] * 0.78,
    rate: rates[index],
    isLeak: index === leak && index > 0,
  }));

  return <div className="mt-6 overflow-hidden rounded-[24px] border border-white/[.08] bg-[#090d15]/80" data-funnel-cone>
    <div className="grid border-b border-white/[.08] sm:grid-cols-3">
      <div className="flex items-center gap-3 border-b border-white/[.08] px-5 py-4 sm:border-b-0 sm:border-r"><Route className="shrink-0 text-cyan-300" size={18} /><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-zinc-500">Entrada · {steps[0].label}</p><strong className="data-value mt-1 block text-lg">{number(firstValue)}</strong></div></div>
      <div className="flex items-center gap-3 border-b border-white/[.08] px-5 py-4 sm:border-b-0 sm:border-r"><CheckCircle2 className="shrink-0 text-emerald-400" size={18} /><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-zinc-500">Conversão final · {steps.at(-1)?.label}</p><strong className="data-value mt-1 block text-lg">{totalConversion == null ? '—' : `${number(totalConversion, totalConversion < 1 ? 2 : 1)}%`}</strong></div></div>
      <div className="flex items-center gap-3 px-5 py-4"><TrendingDown className="shrink-0 text-rose-400" size={18} /><div className="min-w-0"><p className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-zinc-500">Maior perda{leak > 0 ? ` · ${steps[leak - 1].label} → ${steps[leak].label}` : ''}</p><strong className="data-value mt-1 block text-lg">{leak > 0 && rates[leak] != null ? `${number(100 - (rates[leak] as number), 1)}% não avançam` : '—'}</strong></div></div>
    </div>

    <ol className="list-none px-3 pb-2 pt-9 sm:px-6" aria-label="Etapas do funil">
      {rows.map((row) => {
        const {step, index, color, missing, topRatio, bottomRatio, isLeak} = row;
        const wt = topRatio * HALF, wb = bottomRatio * HALF;
        const ryt = clamp(wt * 0.11, 3, 13), ryb = clamp(wb * 0.11, 3, 13);
        const cx = 200;
        const body = `M ${cx - wt} 0 A ${wt} ${ryt} 0 0 0 ${cx + wt} 0 L ${cx + wb} ${height} A ${wb} ${ryb} 0 0 1 ${cx - wb} ${height} Z`;
        const topArc = `M ${cx - wt} 0 A ${wt} ${ryt} 0 0 0 ${cx + wt} 0`;
        const gid = `${uid}g${index}`;
        const sliceWidthPct = (wt + wb) / 400 * 100;
        const labelFits = !compact && sliceWidthPct >= 40;
        return <li className="grid grid-cols-1 items-center sm:grid-cols-[minmax(0,44%)_minmax(0,1fr)] sm:gap-x-6" style={{height}} key={`${step.label}-${index}`} data-funnel-step-row>
          <div className="relative h-full" aria-hidden>
            <svg className="cone-slice absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 400 ${height}`} preserveAspectRatio="none" style={{animationDelay: `${index * 55}ms`, filter: missing ? undefined : 'drop-shadow(0 8px 10px rgba(0,0,0,.35))'}}>
              <defs>
                <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor={mix(color, 0, .55)} />
                  <stop offset=".22" stopColor={mix(color, 255, .28)} />
                  <stop offset=".55" stopColor={color} />
                  <stop offset="1" stopColor={mix(color, 0, .6)} />
                </linearGradient>
              </defs>
              {index === 0 ? <ellipse cx={cx} cy="0" rx={wt} ry={ryt} fill="#05070b" stroke={mix(color, 255, .35)} strokeWidth="1.5" /> : null}
              <path d={body} fill={missing ? 'rgba(255,255,255,.035)' : `url(#${gid})`} stroke={missing ? 'rgba(255,255,255,.22)' : 'none'} strokeDasharray={missing ? '4 4' : undefined} />
              {!missing ? <path d={topArc} fill="none" stroke={isLeak ? '#fb7185' : 'rgba(255,255,255,.38)'} strokeWidth={isLeak ? 2.4 : 1.2} /> : null}
            </svg>
            <div className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center justify-center text-center ${missing ? 'text-zinc-500' : 'text-white'}`} style={{top: 0, height: `${height}px`, paddingTop: ryt, width: `${Math.max(sliceWidthPct * 0.82, 22)}%`}}>
              <strong className={`data-value leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,.65)] ${compact ? 'text-sm' : 'text-lg sm:text-xl'}`}>{number(step.value)}</strong>
              {labelFits ? <span className="mt-1 max-w-full truncate text-[9px] font-extrabold uppercase tracking-[.14em] text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,.7)] sm:text-[10px]">{step.label}</span> : null}
            </div>
          </div>
          <div className={`hidden min-w-0 sm:block ${isLeak ? 'rounded-xl border-l-2 border-rose-400/70 bg-rose-400/[.05] pl-3' : 'pl-1'}`}>
            <StepDetails row={row} compact={compact} currency={currency} comparing={comparing} />
          </div>
        </li>;
      })}
    </ol>

    <ul className="list-none space-y-2 border-t border-white/[.06] p-3 sm:hidden" aria-label="Detalhes por etapa">
      {rows.map((row) => <li key={`m-${row.step.label}-${row.index}`} className={`rounded-xl border p-3 ${row.isLeak ? 'border-rose-400/40 bg-rose-400/[.05]' : 'border-white/[.07] bg-white/[.025]'}`}>
        <StepDetails row={row} compact={false} currency={currency} comparing={comparing} />
      </li>)}
    </ul>
    <p className="border-t border-white/[.06] px-5 py-3 text-[10px] leading-4 text-zinc-500">{preview ? 'Pré-visualização com valores de exemplo, apenas para mostrar o formato. ' : ''}A largura de cada camada usa escala logarítmica (indica a ordem de grandeza); os valores exatos e as taxas estão ao lado. As taxas relacionam eventos agregados do período, não uma coorte individual.</p>
  </div>;
}
