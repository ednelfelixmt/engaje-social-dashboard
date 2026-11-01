import type {Row} from '@/types/database.types';
import {z} from 'zod';
import {calendarDays} from '@/lib/metrics/calendar';
import {finiteRatio, sum} from '@/lib/metrics/aggregation';

export const audienceDimensions = ['gender', 'age', 'state', 'city', 'device'] as const;
export type AudienceDimension = typeof audienceDimensions[number];
export type BreakdownPoint = {label: string; spend: number | null; impressions: number | null; clicks: number | null; leads: number | null};
export type BreakdownMetric = keyof Omit<BreakdownPoint, 'label'> | 'ctr' | 'cpc' | 'cpm' | 'cpl';
const metrics = ['spend', 'impressions', 'clicks', 'leads'] as const;
export const validObservation = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Percentual visual relativo ao maior valor observado, inclusive para métricas abaixo de 1. */
export function breakdownBarWidth(value: number | null, maximum: number): number {
 if (!validObservation(value) || !validObservation(maximum) || maximum === 0) return 0;
 return Math.min(100, (value / maximum) * 100);
}
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
const organizationUuid = z.string().uuid();

/** Source identifiers are opaque: never trim a malformed ID into a different grain. */
function intactAudienceIdentifier(value: unknown): value is string {
 return typeof value === 'string' && value.trim().length > 0 && value === value.trim()
  && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}

/** An empty breakdown value is an existing unclassified bucket, not a padded ID. */
function intactAudienceValue(value: unknown): value is string {
 return value === '' || intactAudienceIdentifier(value);
}
const labelsByDimension: Partial<Record<AudienceDimension, Record<string, string>>> = {
 gender: {male: 'Masculino', female: 'Feminino', unknown: 'Não informado'},
 device: {desktop: 'Desktop', mobile_app: 'Mobile — aplicativo', mobile_web: 'Mobile — navegador', mobile: 'Mobile', tablet: 'Tablet'},
};

/** A source label is trustworthy only when all nonblank observations agree. */
function audienceLabel(dimension: AudienceDimension, value: string, facts: readonly Row<'metrics_ads_breakdowns'>[]): string {
 const canonical = labelsByDimension[dimension]?.[value.toLowerCase()];
 if (canonical) return canonical;
 const observed = new Set(facts.map(row => typeof row.dimension_label === 'string' ? row.dimension_label.trim() : '').filter(Boolean));
 return observed.size === 1 ? [...observed][0] : value || 'Não informado';
}

/** Only one authenticated scope and one reported attribution window may be consolidated. */
export function buildAudienceReport(rows: readonly Row<'metrics_ads_breakdowns'>[], scope: AudienceReportScope): AudienceReport {
 const days = new Set(calendarDays(scope.from, scope.to));
 if (!organizationUuid.safeParse(scope.organizationId).success || !scope.organizationSlug || !['meta_ads', 'google_ads'].includes(scope.platform) || !/^[A-Z]{3}$/.test(scope.currency) || !Number.isFinite(Date.parse(scope.generatedAt))) throw new Error('Invalid audience report scope');
 if (new Date(scope.generatedAt).toISOString() !== scope.generatedAt) throw new Error('Report timestamp must be canonical UTC');
 // Intl accepts undefined as a fallback to the server timezone; report provenance must be explicit.
 if (typeof scope.timezone !== 'string') throw new RangeError('Audience report timezone must be explicit');
 new Intl.DateTimeFormat('pt-BR', {timeZone: scope.timezone});
 const seenIds = new Set<string>(), seenGrains = new Set<string>();
 const relevant: Row<'metrics_ads_breakdowns'>[] = [];
 for (const row of rows) {
  if (row.organization_id !== scope.organizationId || row.platform !== scope.platform || row.currency !== scope.currency || !days.has(row.metric_date)) throw new Error('Audience report scope mismatch');
  const account = typeof row.account_id === 'string'
   ? (row.platform === 'meta_ads' ? row.account_id.replace(/^act_/, '') : row.account_id) : '';
  if (!intactAudienceIdentifier(row.id) || !intactAudienceIdentifier(row.account_id)
   || !intactAudienceIdentifier(account) || (row.platform === 'meta_ads' && account.startsWith('act_'))
   || !intactAudienceIdentifier(row.campaign_id)
   || !intactAudienceIdentifier(row.dimension_type) || !intactAudienceValue(row.dimension_value)) {
    throw new Error('Invalid audience report grain');
  }
  // Unknown dimensions can be omitted, but their malformed or duplicate source IDs cannot.
  if (seenIds.has(row.id)) throw new Error('Duplicate audience report grain');
  seenIds.add(row.id);
  if (!audienceDimensions.includes(row.dimension_type as AudienceDimension)) continue;
  const grain = JSON.stringify([account, row.campaign_id, row.dimension_type, row.dimension_value, row.metric_date]);
  if (seenGrains.has(grain)) throw new Error('Duplicate audience report grain');
  seenGrains.add(grain); relevant.push(row);
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
   return {value, label: audienceLabel(dimension, value, facts),
    sourceIds: sorted.map(row => row.id),
    spend: sum(facts, 'spend'), impressions: sum(facts, 'impressions'), clicks: sum(facts, 'clicks'), leads: sum(facts, 'leads'),
    coverage: Object.fromEntries(metrics.map(metric => [metric, facts.filter(row => validObservation(row[metric])).length])) as AudienceReportRow['coverage']};
  }).sort((a, b) => a.value.localeCompare(b.value));
  return [dimension, values];
 })) as AudienceReport['groups'];
 return {scope: {...scope}, groups, sourceRecords: relevant.length, omittedRecords: rows.length - relevant.length, attributionWindow: [...windows][0] || null};
}
