/** Formatting of observed report values is a presentation concern, never a data correction. */
export type ReportObservationFormat = Readonly<{
  currency?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  scientificTiny?: boolean;
  suffix?: string;
}>;

/** A missing or non-finite source value is unavailable; observed zero is not missing. */
export function formatReportObservation(value: number | null | undefined, options: ReportObservationFormat = {}): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const notation = options.scientificTiny && value !== 0 && Math.abs(value) < 0.000001 ? 'scientific' : 'standard';
  const intl: Intl.NumberFormatOptions = options.currency
    ? {style: 'currency', currency: options.currency, notation}
    : {maximumFractionDigits: options.maximumFractionDigits ?? 2, notation};
  if (options.maximumFractionDigits !== undefined) intl.maximumFractionDigits = options.maximumFractionDigits;
  if (options.minimumFractionDigits !== undefined) intl.minimumFractionDigits = options.minimumFractionDigits;
  return new Intl.NumberFormat('pt-BR', intl).format(value) + (options.suffix ?? '');
}

/** Percent changes require a finite comparable baseline; never render an infinite variation. */
export function formatReportChange(change: number | null | undefined): string {
  if (change == null || !Number.isFinite(change)) return 'Variação indisponível';
  // Changes smaller than half a hundredth of a percentage point would round to
  // 0,00%, misrepresenting a real, nonzero observation as no change. Preserve
  // its sign and magnitude in scientific notation without altering the data.
  const normalized = Object.is(change, -0) ? 0 : change;
  const tiny = normalized !== 0 && Math.abs(normalized) < 0.005;
  const formatted = tiny
    ? new Intl.NumberFormat('pt-BR', {notation: 'scientific', maximumFractionDigits: 2}).format(normalized) + '%'
    : formatReportObservation(normalized, {maximumFractionDigits: 2, suffix: '%'});
  return (normalized > 0 ? '+' : '') + formatted;
}
