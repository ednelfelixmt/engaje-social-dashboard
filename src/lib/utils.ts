import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Unknown or invalid measurements are unavailable, never formatted as NaN or infinity. */
export function number(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', {maximumFractionDigits: digits}).format(n);
}

/** Preserve observed zero and signed finite amounts, without inventing monetary values. */
export function money(n: number | null | undefined, currency = 'BRL') {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', {style: 'currency', currency}).format(n);
}
