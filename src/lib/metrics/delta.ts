export type Delta = {change: number; good: boolean | null};

/** Métricas em que um valor menor é melhor (custos). Frequência é neutra. */
export function lowerIsBetter(metric: string) {
  return ['cpa', 'cpm', 'cpc', 'cpl'].includes(metric) || metric.startsWith('cost_per_');
}

/**
 * Variação percentual entre o período atual e o anterior. Devolve null quando não há base de comparação
 * (período anterior sem dado ou com valor zero), nunca inventa 0%.
 */
export function computeDelta(current: number | null | undefined, previous: number | null | undefined, metric = ''): Delta | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  // Subtracting opposite-sign values near MAX_VALUE can overflow even when
  // the true percentage is finite. Fall back to an equivalent scaled ratio.
  const difference = current - previous;
  const change = (Number.isFinite(difference)
    ? difference / Math.abs(previous)
    : current / Math.abs(previous) - Math.sign(previous)) * 100;
  if (!Number.isFinite(change)) return null;
  if (change === 0 || metric === 'frequency') return {change, good: null};
  return {change, good: lowerIsBetter(metric) ? change < 0 : change > 0};
}
