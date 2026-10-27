/**
 * A daily chart must not display a partial sum as a complete observation.
 * Count metrics and media costs are nonnegative; revenue may be signed for refunds.
 * All observations must match the authenticated tenant and selected currency.
 */
export type PaidDailyRecord = Readonly<{
  organization_id: string;
  metric_date: string;
  currency: string;
  spend: number | null;
  revenue: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
}>;

export type PaidDashboardDay = Readonly<{
  date: string;
  spend: number | null;
  revenue: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
}>;

function observed(value: number | null, signed = false): number | null {
  return typeof value === 'number' && Number.isFinite(value) && (signed || value >= 0) ? value : null;
}

function combine(total: number | null, next: number | null): number | null {
  if (total === null || next === null) return null;
  const result = total + next;
  return Number.isFinite(result) ? result : null;
}

/** Preserve known zero and missing coverage, reject invalid numbers, mixed tenants and currencies. */
export function dashboardPaidDays(rows: readonly PaidDailyRecord[], authorizedOrganizationId: string, selectedCurrency: string): PaidDashboardDay[] {
  // The SQL query is already tenant/currency scoped. Verify the scope again before
  // aggregating, including on an empty result; never render partial foreign data.
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(authorizedOrganizationId)
    || !/^[A-Z]{3}$/.test(selectedCurrency)
    || rows.some(row => row.organization_id !== authorizedOrganizationId || row.currency !== selectedCurrency)) {
    throw new Error('Dashboard timeline requires authorized organization and currency');
  }
  if (!rows.length) return [];
  const days = new Map<string, PaidDashboardDay>();
  for (const row of rows) {
    const values: PaidDashboardDay = {
      date: row.metric_date,
      spend: observed(row.spend),
      revenue: observed(row.revenue, true),
      impressions: observed(row.impressions),
      clicks: observed(row.clicks),
      leads: observed(row.leads),
    };
    const prior = days.get(row.metric_date);
    days.set(row.metric_date, prior ? {
      date: row.metric_date,
      spend: combine(prior.spend, values.spend),
      revenue: combine(prior.revenue, values.revenue),
      impressions: combine(prior.impressions, values.impressions),
      clicks: combine(prior.clicks, values.clicks),
      leads: combine(prior.leads, values.leads),
    } : values);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
