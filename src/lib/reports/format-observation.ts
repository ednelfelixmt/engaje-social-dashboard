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
  // A malformed currency identifier must not crash a report or silently
  // convert a monetary observation into an unlabeled numeric value.
  // ISO currency codes are three ASCII uppercase letters at this boundary.
  if (options.currency !== undefined && !/^[A-Z]{3}$/.test(options.currency)) return '—';
  // Invalid precision or inverted digit ranges can throw RangeError in
  // Intl.NumberFormat and prevent the entire report from rendering.
  // Only accept the ECMA-402 fraction digit range; no guessed fallback.
  const validFractionDigits = (digits: number | undefined) =>
    digits === undefined || (Number.isInteger(digits) && digits >= 0 && digits <= 100);
  if (!validFractionDigits(options.minimumFractionDigits) ||
      !validFractionDigits(options.maximumFractionDigits) ||
      (options.minimumFractionDigits !== undefined &&
       options.maximumFractionDigits !== undefined &&
       options.minimumFractionDigits > options.maximumFractionDigits)) return '—';
  const notation = options.scientificTiny && value !== 0 && Math.abs(value) < 0.000001 ? 'scientific' : 'standard';
  const intl: Intl.NumberFormatOptions = options.currency
    ? {style: 'currency', currency: options.currency, notation}
    // When only a minimum is supplied, the implicit non-currency maximum must
    // accommodate it; otherwise Intl.NumberFormat throws RangeError.
    : {maximumFractionDigits: options.maximumFractionDigits ?? Math.max(2, options.minimumFractionDigits ?? 0), notation};
  if (options.maximumFractionDigits !== undefined) intl.maximumFractionDigits = options.maximumFractionDigits;
  if (options.minimumFractionDigits !== undefined) intl.minimumFractionDigits = options.minimumFractionDigits;
  // IEEE-754 negative zero is still an observed zero, not negative spend.
  // Normalize only -0 at the display boundary; never round negative nonzero measurements away.
  const displayValue = Object.is(value, -0) ? 0 : value;
  return new Intl.NumberFormat('pt-BR', intl).format(displayValue) + (options.suffix ?? '');
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
