/** Pure helpers shared by every chart model: formatting, label measuring and series preparation. */

export type ChartKind = 'money' | 'count' | 'percent';
export type ChartFormat = {kind: ChartKind; currency?: string};

const integer = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 0});
const compact = new Intl.NumberFormat('pt-BR', {notation: 'compact', maximumFractionDigits: 1});
const compactSmall = new Intl.NumberFormat('pt-BR', {notation: 'compact', maximumFractionDigits: 2});
const money = (currency: string) => new Intl.NumberFormat('pt-BR', {style: 'currency', currency});
const percent = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

/**
 * Missing is never zero: `null`, `undefined` and non-finite values render as an em dash.
 * `short` drops cents from money of 100 or more (labels on bars); tooltips and tables keep the exact value.
 */
export function formatChartValue(format: ChartFormat, value: number | null | undefined, {short = false}: {short?: boolean} = {}): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (format.kind === 'money') {
    const formatter = short && Math.abs(value) >= 100 ? new Intl.NumberFormat('pt-BR', {style: 'currency', currency: format.currency ?? 'BRL', maximumFractionDigits: 0}) : money(format.currency ?? 'BRL');
    return formatter.format(value);
  }
  if (format.kind === 'percent') return percent.format(value) + '%';
  return integer.format(value);
}

/**
 * Compact axis label. Small magnitudes keep decimals (a CPL axis must not read "8, 8, 9"), large ones use mil/mi.
 * `scale` is the largest absolute value of the axis and decides how many decimals are needed.
 */
export function formatAxisValue(format: ChartFormat, value: number, scale: number): string {
  if (!Number.isFinite(value)) return '';
  const small = scale < 10;
  const medium = scale < 100;
  if (format.kind === 'percent') return (small ? percent : new Intl.NumberFormat('pt-BR', {maximumFractionDigits: medium ? 1 : 0})).format(value) + '%';
  const body = Math.abs(value) >= 1000 ? compact.format(value) : small ? compactSmall.format(value) : new Intl.NumberFormat('pt-BR', {maximumFractionDigits: medium ? 1 : 0}).format(value);
  return format.kind === 'money' ? currencySymbol(format.currency ?? 'BRL') + ' ' + body : body;
}

/** Symbol Intl uses for the currency in pt-BR; an unknown code stays explicit. */
function currencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', {style: 'currency', currency}).formatToParts(0).find(part => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Rough text width in px (digits and latin letters average ~0.58em). Good enough to reserve axis space without measuring the DOM. */
export function estimateTextWidth(text: string, fontSize = 12): number {
  let width = 0;
  for (const char of text) width += /[A-Z0-9%$]/.test(char) ? 0.66 : /[iljt.,:;'|! ]/.test(char) ? 0.32 : /[mwMW@]/.test(char) ? 0.9 : 0.57;
  return Math.ceil(width * fontSize);
}

/** Width reserved for a numeric Y axis, derived from the formatted extremes so no tick label is ever cut. */
export function numericAxisWidth(format: ChartFormat, max: number, fontSize = 12): number {
  const scale = Math.max(Math.abs(max), 1);
  const widest = Math.max(estimateTextWidth(formatAxisValue(format, scale, scale), fontSize), estimateTextWidth(formatAxisValue(format, scale * 0.5, scale), fontSize));
  // Recharts wraps a tick that does not fit the axis width onto two lines, so leave real slack.
  return Math.min(110, Math.max(40, widest + 22));
}

/** Width reserved for category labels (horizontal bars): the longest label up to a cap, never more than `share` of the chart. */
export function categoryAxisWidth(labels: readonly string[], containerWidth: number, {fontSize = 12, share = 0.42, min = 84, max = 240}: {fontSize?: number; share?: number; min?: number; max?: number} = {}): number {
  const widest = labels.reduce((largest, label) => Math.max(largest, estimateTextWidth(label, fontSize)), 0);
  const cap = Math.max(min, Math.min(max, Math.floor(containerWidth * share)));
  // +20: the label is right-aligned 8px before the bars and Recharts keeps a small gutter on the axis.
  return Math.min(cap, Math.max(min, widest + 20));
}

/**
 * Greedy word wrap into at most `lines` lines that fit `width` px; the last line ends with an ellipsis only when text was dropped.
 * Words longer than a line are split. The caller exposes the full text as a native tooltip when `truncated`.
 */
export function wrapLabel(text: string, width: number, {fontSize = 12, lines = 2}: {fontSize?: number; lines?: number} = {}): {lines: string[]; truncated: boolean; broken: boolean} {
  const perLine = Math.max(4, Math.floor((width - 4) / (fontSize * 0.58)));
  const all: string[] = [];
  let broken = false;
  let line = '';
  // Campaign names are often tag chains ("[ZF][Vendas][Conversão]"): give them break points between tags.
  for (const word of text.replace(/\]\[/g, '] [').split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > perLine) {
      broken = true;
      if (line) { all.push(line); line = ''; }
      all.push(rest.slice(0, perLine));
      rest = rest.slice(perLine);
    }
    if (!line) line = rest;
    else if (line.length + 1 + rest.length <= perLine) line += ' ' + rest;
    else { all.push(line); line = rest; }
  }
  if (line) all.push(line);
  if (all.length <= lines) return {lines: all.length ? all : [''], truncated: false, broken};
  const kept = all.slice(0, lines);
  const last = kept[lines - 1];
  kept[lines - 1] = (last.length >= perLine ? last.slice(0, perLine - 1) : last) + '…';
  return {lines: kept, truncated: true, broken};
}

/** `2026-10-05` → `05/10`. Same-year ranges stay short; `withYear` keeps the year for multi-year ranges. */
export function shortDate(iso: string | null | undefined, withYear = false): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

/** Label for a histogram range ("R$ 7,50–9,10": the unit is not repeated); a single-value bin shows just that value. */
export function histogramRangeLabel(format: ChartFormat, from: number, to: number, single = false): string {
  const text = (value: number) => formatChartValue(format, value, {short: true});
  if (single) return text(from);
  const upper = format.kind === 'money' ? text(to).replace(/^R\$\s?/, '').replace(/^[A-Z]{3}\s?/, '') : text(to);
  return `${text(from)}–${upper}`;
}
