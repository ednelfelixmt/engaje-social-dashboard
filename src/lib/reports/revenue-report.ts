import type {Row} from '@/types/database.types';
import {calendarDays, comparisonPeriod} from '@/lib/metrics/calendar';
import {sum} from '@/lib/metrics/aggregation';
import {computeDelta} from '@/lib/metrics/delta';

type Fact = Row<'metrics_crm'>;
export type RevenueSource = 'crm' | 'spreadsheet';
export const revenueMetrics = ['revenue', 'purchases', 'leads', 'checkouts'] as const;
export type RevenueMetric = typeof revenueMetrics[number];
type Values = Record<RevenueMetric, number | null>;
export type RevenueScope = {organizationId: string; organizationName: string; organizationSlug: string; timezone: string; currency: string; source: RevenueSource; from: string; to: string; compare: 'none' | 'previous_period' | 'previous_year'};
export type RevenueDay = {date: string; values: Values; sourceIds: string[]; reconciled: boolean; syncedAt: string | null};
export type RevenuePeriod = {from: string; to: string; days: RevenueDay[]; totals: Values; knownDays: Record<RevenueMetric, number>; records: number; otherSourceRecords: number; reconciledDays: number};
export type RevenueReport = {scope: RevenueScope; current: RevenuePeriod; previous: RevenuePeriod | null};
const organizationUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const channels = ['meta_ads', 'google_ads', 'tiktok_ads', 'organic', 'direct', 'unattributed'];
const account = (row: Fact) => row.channel === 'meta_ads' ? row.account_id.replace(/^act_/, '') : row.account_id;
/** Opaque source IDs may contain internal spaces, but never silent edge padding. */
const validOpaqueId = (value: unknown, allowEmpty = false): value is string =>
 typeof value === 'string' && (allowEmpty || value.length > 0) && value.trim() === value;
/** Reject malformed Meta alias prefixes before generating the financial grain key. */
const validRevenueAccount = (row: Fact): boolean => {
 if (!validOpaqueId(row.account_id, true)) return false;
 if (row.channel !== 'meta_ads' || row.account_id === '') return true;
 const normalized = account(row);
 return validOpaqueId(normalized) && !normalized.startsWith('act_');
};
/** Supabase provenance is an instant, never a normalized impossible local time. */
function sourceTimestamp(value: unknown): number | null {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/.test(value)) return null;
 try {calendarDays(value.slice(0, 10), value.slice(0, 10));} catch {return null;}
 const timestamp = Date.parse(value);
 return Number.isFinite(timestamp) ? timestamp : null;
}
function period(rows: readonly Fact[], scope: RevenueScope, range: {from: string; to: string}): RevenuePeriod {
 const dates = calendarDays(range.from, range.to), allowed = new Set(dates), ids = new Set<string>(), grains = new Set<string>();
 const byDate = new Map<string, Fact[]>();
 let selected = 0;
 for (const row of rows) {
  if (row.organization_id !== scope.organizationId || row.currency !== scope.currency || !allowed.has(row.metric_date) || !['crm', 'spreadsheet'].includes(row.source)) throw new Error('Revenue report scope mismatch');
  if (!validOpaqueId(row.id) || !channels.includes(row.channel) || !validRevenueAccount(row) || !validOpaqueId(row.campaign_id, true) || (row.account_id && !account(row)) || (row.campaign_id && (!account(row) || !['meta_ads', 'google_ads', 'tiktok_ads'].includes(row.channel)))) throw new Error('Invalid revenue report grain');
  const grain = JSON.stringify([row.source, row.metric_date, row.channel, account(row), row.campaign_id]);
  if (ids.has(row.id) || grains.has(grain)) throw new Error('Duplicate revenue report grain');
  ids.add(row.id); grains.add(grain);
  if (row.source !== scope.source) continue;
  selected++;
  const group = byDate.get(row.metric_date) ?? []; group.push(row); byDate.set(row.metric_date, group);
 }
 const days = dates.map((date): RevenueDay => {
  const facts = byDate.get(date) ?? [];
  const reconciled = facts.length > 0 && facts.every(row => row.is_complete === true);
  const values = Object.fromEntries(revenueMetrics.map(key => [key, reconciled ? sum(facts, key) : null])) as Values;
  const sync = facts.map(row => sourceTimestamp(row.synced_at));
  const syncedAt = sync.length > 0 && sync.every((value): value is number => value !== null)
   ? new Date(sync.reduce((latest, value) => Math.max(latest, value), -Infinity)).toISOString() : null;
  return {date, values, sourceIds: facts.map(row => row.id).sort(), reconciled, syncedAt};
 });
 return {...range, days, records: selected, otherSourceRecords: rows.length - selected,
  reconciledDays: days.filter(day => day.reconciled).length,
  totals: Object.fromEntries(revenueMetrics.map(key => [key, sum(days.map(day => day.values), key)])) as Values,
  knownDays: Object.fromEntries(revenueMetrics.map(key => [key, days.filter(day => day.values[key] !== null).length])) as RevenuePeriod['knownDays']};
}
/** One source only, with an observation required for every calendar day of each total. */
export function buildRevenueReport(current: readonly Fact[], previous: readonly Fact[], scope: RevenueScope): RevenueReport {
 if (!organizationUuid.test(scope.organizationId) || !scope.organizationSlug || !['crm', 'spreadsheet'].includes(scope.source) || !/^[A-Z]{3}$/.test(scope.currency) || !['none', 'previous_period', 'previous_year'].includes(scope.compare)) throw new Error('Invalid revenue report scope');
 new Intl.DateTimeFormat('pt-BR', {timeZone: scope.timezone});
 if (scope.compare === 'none' && previous.length) throw new Error('Unexpected revenue comparison facts');
 return {scope: {...scope}, current: period(current, scope, {from: scope.from, to: scope.to}), previous: scope.compare === 'none' ? null : period(previous, scope, comparisonPeriod(scope.from, scope.to, scope.compare))};
}
export function revenueDelta(report: RevenueReport, metric: RevenueMetric): number | null {
 return report.previous ? computeDelta(report.current.totals[metric], report.previous.totals[metric], metric)?.change ?? null : null;
}
