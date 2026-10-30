import type {Row} from '@/types/database.types';
import {z} from 'zod';
import {calendarDays, comparisonPeriod} from '@/lib/metrics/calendar';
import {paidTotals, type PaidMetricKey, type PaidTotals} from '@/lib/metrics/paid-metrics';
import {computeDelta} from '@/lib/metrics/delta';

type Fact = Row<'metrics_ads'>;
export const performanceMetrics = ['spend', 'impressions', 'clicks', 'leads', 'ctr', 'cpc', 'cpm', 'cpl'] as const;
const baseMetrics = ['spend', 'impressions', 'clicks', 'leads'] as const;
export type PerformanceScope = {
 organizationId: string; organizationName: string; organizationSlug: string; timezone: string;
 currency: string; from: string; to: string; compare: 'none' | 'previous_period' | 'previous_year'; generatedAt: string;
};
export type PerformancePeriod = {
 from: string; to: string; totals: PaidTotals; sourceIds: string[];
 coverage: Record<typeof baseMetrics[number], number>;
 attribution: {platform: string; account: string; windows: string[]}[];
};
export type PerformanceGroup = {key: string; label: string; platform: string; account?: string; campaignId?: string; current: PerformancePeriod; previous: PerformancePeriod | null};
export type PerformanceReport = {scope: PerformanceScope; current: PerformancePeriod; previous: PerformancePeriod | null; platforms: PerformanceGroup[]; campaigns: PerformanceGroup[]};
const platforms = ['meta_ads', 'google_ads', 'tiktok_ads'];
const organizationUuid = z.string().uuid();
const accountOf = (row: Fact) => row.platform === 'meta_ads' ? row.account_id.replace(/^act_/, '') : row.account_id;
const observed = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** External IDs are opaque: never trim them into a different source identity. */
function validSourceIdentity(value: unknown): value is string {
 return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function validate(rows: readonly Fact[], scope: PerformanceScope, range: {from: string; to: string}) {
 const days = new Set(calendarDays(range.from, range.to)), ids = new Set<string>(), grains = new Set<string>();
 for (const row of rows) {
  if (row.organization_id !== scope.organizationId || row.currency !== scope.currency || !days.has(row.metric_date) || !platforms.includes(row.platform)) throw new Error('Performance report scope mismatch');
  // Verify the raw identifiers as well as the Meta account alias; a malformed
  // value must not become an apparently valid ad/day grain after normalization.
  if (!validSourceIdentity(row.id) || !validSourceIdentity(row.account_id)
   || !validSourceIdentity(row.campaign_id) || !validSourceIdentity(row.ad_id)
   || !validSourceIdentity(accountOf(row))
   // A second Meta act_ marker is not an account alias. It would make the
   // report aggregate a different account than the authenticated dashboards.
   || (row.platform === 'meta_ads' && accountOf(row).startsWith('act_'))) throw new Error('Invalid performance report grain');
  const grain = JSON.stringify([row.platform, accountOf(row), row.campaign_id, row.ad_id, row.metric_date, row.currency]);
  if (ids.has(row.id) || grains.has(grain)) throw new Error('Duplicate performance report grain');
  ids.add(row.id); grains.add(grain);
 }
}

function period(rows: readonly Fact[], range: {from: string; to: string}): PerformancePeriod {
 const windows = new Map<string, {platform: string; account: string; windows: Set<string>}>();
 for (const row of rows) {
  const key = JSON.stringify([row.platform, accountOf(row)]);
  const entry = windows.get(key) ?? {platform: row.platform, account: accountOf(row), windows: new Set<string>()};
  entry.windows.add(row.attribution_window.trim()); windows.set(key, entry);
 }
 return {...range, totals: paidTotals(rows), sourceIds: rows.map(row => row.id).sort(),
  coverage: Object.fromEntries(baseMetrics.map(metric => [metric, rows.filter(row => observed(row[metric])).length])) as PerformancePeriod['coverage'],
  attribution: [...windows.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, entry]) => ({...entry, windows: [...entry.windows].sort()}))};
}

/** A reported window must be unambiguous and identical for the same provider/accounts. */
export function comparableAttribution(current: Pick<PerformancePeriod, 'attribution'>, previous: Pick<PerformancePeriod, 'attribution'>): boolean {
 const known = (p: Pick<PerformancePeriod, 'attribution'>) => p.attribution.length > 0 && p.attribution.every(entry => entry.windows.length === 1 && !!entry.windows[0] && !/(unknown|default|unspecified|not[ _-]?set|n[aã]o[ _-]?informad|unavailable)/i.test(entry.windows[0]));
 return known(current) && known(previous) && JSON.stringify(current.attribution) === JSON.stringify(previous.attribution);
}

export function performanceDelta(current: PerformancePeriod, previous: PerformancePeriod | null, metric: PaidMetricKey): number | null {
 if (!previous || ((metric === 'leads' || metric === 'cpl') && !comparableAttribution(current, previous))) return null;
 return computeDelta(current.totals[metric], previous.totals[metric], metric)?.change ?? null;
}

/** Consolidates only validated ad/day facts. It never deduplicates people across providers. */
export function buildPerformanceReport(currentRows: readonly Fact[], previousRows: readonly Fact[], scope: PerformanceScope): PerformanceReport {
 if (!organizationUuid.safeParse(scope.organizationId).success || !scope.organizationSlug || !/^[A-Z]{3}$/.test(scope.currency) || !['none', 'previous_period', 'previous_year'].includes(scope.compare) || !Number.isFinite(Date.parse(scope.generatedAt))) throw new Error('Invalid performance report scope');
 if (new Date(scope.generatedAt).toISOString() !== scope.generatedAt) throw new Error('Report timestamp must be canonical UTC');
 new Intl.DateTimeFormat('pt-BR', {timeZone: scope.timezone});
 const range = {from: scope.from, to: scope.to};
 const priorRange = comparisonPeriod(scope.from, scope.to, scope.compare);
 validate(currentRows, scope, range);
 if (scope.compare === 'none' && previousRows.length) throw new Error('Unexpected comparison facts');
 validate(previousRows, scope, priorRange);
 const current = period(currentRows, range), previous = scope.compare === 'none' ? null : period(previousRows, priorRange);
 const groups = (campaign: boolean): PerformanceGroup[] => {
  const keyOf = (row: Fact) => JSON.stringify(campaign ? [row.platform, accountOf(row), row.campaign_id] : [row.platform]);
  const grouped = new Map<string, {current: Fact[]; previous: Fact[]}>();
  for (const [name, rows] of [['current', currentRows], ['previous', previousRows]] as const) {
   for (const row of rows) {
    const key = keyOf(row), entry = grouped.get(key) ?? {current: [], previous: []};
    entry[name].push(row); grouped.set(key, entry);
   }
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => {
   const a = entry.current, b = entry.previous;
   const latest = [...a, ...b].sort((x, y) => y.metric_date.localeCompare(x.metric_date) || x.id.localeCompare(y.id))[0];
   return {key, platform: latest.platform, label: campaign ? latest.campaign_name || latest.campaign_id : latest.platform,
    ...(campaign ? {account: accountOf(latest), campaignId: latest.campaign_id} : {}),
    current: period(a, range), previous: previous ? period(b, priorRange) : null};
  });
 };
 return {scope: {...scope}, current, previous, platforms: groups(false), campaigns: groups(true)};
}
