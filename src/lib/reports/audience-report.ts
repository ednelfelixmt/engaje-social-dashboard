import type {Row} from '@/types/database.types';
import {calendarDays} from '@/lib/metrics/calendar';
import {finiteRatio, sum} from '@/lib/metrics/aggregation';

export const audienceDimensions = ['gender', 'age', 'state', 'city', 'device'] as const;
export type AudienceDimension = typeof audienceDimensions[number];
export type BreakdownPoint = {label: string; spend: number | null; impressions: number | null; clicks: number | null; leads: number | null};
export type BreakdownMetric = keyof Omit<BreakdownPoint, 'label'> | 'ctr' | 'cpc' | 'cpm' | 'cpl';
const metrics = ['spend', 'impressions', 'clicks', 'leads'] as const;
export const validObservation = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function breakdownMetricValue(row: BreakdownPoint, metric: BreakdownMetric): number | null {
 const known = (key: typeof metrics[number]) => validObservation(row[key]) ? row[key] : null;
 if (metric === 'ctr') return finiteRatio(known('clicks'), known('impressions'), 100);
 if (metric === 'cpc') return finiteRatio(known('spend'), known('clicks'));
 if (metric === 'cpm') return finiteRatio(known('spend'), known('impressions'), 1000);
 if (metric === 'cpl') return finiteRatio(known('spend'), known('leads'));
 return known(metric);
}
export type AudienceReportScope = {organizationId: string; organizationName: string; organizationSlug: string; timezone: string; platform: 'meta_ads' | 'google_ads'; currency: string; from: string; to: string; generatedAt: string};
export type AudienceReportRow = BreakdownPoint & {value: string; sourceIds: string[]; coverage: Record<typeof metrics[number], number>};
export type AudienceReport = {scope: AudienceReportScope; groups: Record<AudienceDimension, AudienceReportRow[]>; sourceRecords: number; omittedRecords: number; attributionWindow: string | null};
const labels: Record<string, string> = {male: 'Masculino', female: 'Feminino', unknown: 'Não informado', desktop: 'Desktop', mobile_app: 'Mobile — aplicativo', mobile_web: 'Mobile — navegador', mobile: 'Mobile', tablet: 'Tablet'};

/** Only one authenticated scope and one reported attribution window may be consolidated. */
export function buildAudienceReport(rows: readonly Row<'metrics_ads_breakdowns'>[], scope: AudienceReportScope): AudienceReport {
 const days = new Set(calendarDays(scope.from, scope.to));
 if (!scope.organizationId || !scope.organizationSlug || !['meta_ads', 'google_ads'].includes(scope.platform) || !/^[A-Z]{3}$/.test(scope.currency) || !Number.isFinite(Date.parse(scope.generatedAt))) throw new Error('Invalid audience report scope');
 if (new Date(scope.generatedAt).toISOString() !== scope.generatedAt) throw new Error('Report timestamp must be canonical UTC');
 new Intl.DateTimeFormat('pt-BR', {timeZone: scope.timezone});
 const seenIds = new Set<string>(), seenGrains = new Set<string>();
 const relevant: Row<'metrics_ads_breakdowns'>[] = [];
 for (const row of rows) {
  if (row.organization_id !== scope.organizationId || row.platform !== scope.platform || row.currency !== scope.currency || !days.has(row.metric_date)) throw new Error('Audience report scope mismatch');
  if (!audienceDimensions.includes(row.dimension_type as AudienceDimension)) continue;
  const account = row.platform === 'meta_ads' ? row.account_id.replace(/^act_/, '') : row.account_id;
  if (!row.id || !account || !row.campaign_id) throw new Error('Invalid audience report grain');
  const grain = JSON.stringify([account, row.campaign_id, row.dimension_type, row.dimension_value, row.metric_date]);
  if (seenIds.has(row.id) || seenGrains.has(grain)) throw new Error('Duplicate audience report grain');
  seenIds.add(row.id); seenGrains.add(grain); relevant.push(row);
 }
 const windows = new Set(relevant.map(row => row.attribution_window.trim()));
 if (windows.size > 1) throw new Error('Conflicting audience report attribution windows');
 const groups = Object.fromEntries(audienceDimensions.map(dimension => {
  const grouped = new Map<string, Row<'metrics_ads_breakdowns'>[]>();
  for (const row of relevant) {
   if (row.dimension_type !== dimension) continue;
   const group = grouped.get(row.dimension_value) ?? []; group.push(row); grouped.set(row.dimension_value, group);
  }
  const values = [...grouped.entries()].map(([value, facts]): AudienceReportRow => {
   const sorted = [...facts].sort((a, b) => a.id.localeCompare(b.id));
   return {value, label: labels[value.toLowerCase()] ?? (sorted[0].dimension_label || value || 'Não informado'),
    sourceIds: sorted.map(row => row.id),
    spend: sum(facts, 'spend'), impressions: sum(facts, 'impressions'), clicks: sum(facts, 'clicks'), leads: sum(facts, 'leads'),
    coverage: Object.fromEntries(metrics.map(metric => [metric, facts.filter(row => validObservation(row[metric])).length])) as AudienceReportRow['coverage']};
  }).sort((a, b) => a.value.localeCompare(b.value));
  return [dimension, values];
 })) as AudienceReport['groups'];
 return {scope: {...scope}, groups, sourceRecords: relevant.length, omittedRecords: rows.length - relevant.length, attributionWindow: [...windows][0] || null};
}
