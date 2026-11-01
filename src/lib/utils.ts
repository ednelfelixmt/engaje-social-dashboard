import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {formatReportObservation} from './reports/format-observation';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Missing, non-finite or invalidly configured measurements are unavailable. */
export function number(n: number | null | undefined, digits = 0) {
  // Reuse the report boundary: Intl throws RangeError for malformed precision.
  // Explicit zero digits retain the shared KPI formatter's integer default.
  return formatReportObservation(n, {maximumFractionDigits: digits});
}

/** Preserve observed zero and signed finite amounts without trusting currency identifiers. */
export function money(n: number | null | undefined, currency = 'BRL') {
  // Unknown currency options must not take down the dashboard render tree.
  return formatReportObservation(n, {currency});
}
