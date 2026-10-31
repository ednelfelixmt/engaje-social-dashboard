/** Projection for spend-only treemaps. Do not produce ratios from partial or non-finite totals. */
export function projectBudgetTreemap<T extends {spend: number}>(rows: readonly T[]) {
  const positive: T[] = [];
  let invalidCount = 0;
  for (const row of rows) {
    const spend = row.spend;
    if (typeof spend !== 'number' || !Number.isFinite(spend) || spend < 0) {
      invalidCount += 1;
    } else if (spend > 0) {
      positive.push(row);
    }
  }

  // A partial denominator would make every campaign's share appear too large.
  if (invalidCount > 0) {
    return {status: 'invalid' as const, items: [] as T[], total: null, invalidCount};
  }

  const items = positive.sort((a, b) => b.spend - a.spend);
  let total = 0;
  for (const item of items) {
    total += item.spend;
    if (!Number.isFinite(total)) {
      return {status: 'overflow' as const, items: [] as T[], total: null, invalidCount: 0};
    }
  }

  return {status: items.length > 0 ? 'ready' as const : 'empty' as const, items, total, invalidCount: 0};
}
