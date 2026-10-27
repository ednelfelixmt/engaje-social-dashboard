import {serializeCsv, type CsvCell} from './csv';
import type {RevenueDay, RevenuePeriod, RevenueReport, RevenueScope} from '@/lib/reports/revenue-report';

/**
 * Serialize only an already authorized private revenue report. No new queries,
 * source record IDs, implicit FX conversion or cross-source reconciliation.
 * Period totals and daily details overlap and must not be added together.
 */
export function revenueReportCsv(report: RevenueReport): string {
 const {scope} = report;
 const header: CsvCell[] = [
  'versao', 'cliente', 'fonte', 'moeda', 'fuso_cadastral', 'modo_comparacao',
  'periodo', 'tipo_linha', 'inicio', 'fim', 'dia',
  'registros_fonte_periodo', 'registros_outra_fonte_periodo', 'registros_dia',
  'dias_esperados', 'dias_conciliados', 'dias_receita_valida',
  'dias_compras_validas', 'dias_leads_validos', 'dias_checkouts_validos',
  'situacao_conciliacao', 'ultima_sincronizacao_utc',
  'receita_liquida_informada', 'compras_informadas', 'leads_informados', 'checkouts_informados',
 ];
 const rows: CsvCell[][] = [header];
 const push = (label: 'atual' | 'comparativo', period: RevenuePeriod, day?: RevenueDay) => {
  const values = day?.values ?? period.totals;
  rows.push([
   '1', scope.organizationName, scope.source, scope.currency, scope.timezone,
   scope.compare, label, day ? 'dia' : 'total_periodo', period.from, period.to,
   day?.date ?? null, period.records, period.otherSourceRecords,
   day ? day.sourceIds.length : null,
   day ? null : period.days.length, day ? null : period.reconciledDays,
   day ? null : period.knownDays.revenue, day ? null : period.knownDays.purchases,
   day ? null : period.knownDays.leads, day ? null : period.knownDays.checkouts,
   day ? (day.sourceIds.length === 0 ? 'sem_registro' : day.reconciled ? 'declarada_pela_origem' : 'pendente') : null,
   day?.syncedAt ?? null,
   values.revenue, values.purchases, values.leads, values.checkouts,
  ]);
 };
 const addPeriod = (label: 'atual' | 'comparativo', period: RevenuePeriod) => {
  push(label, period);
  for (const day of period.days) push(label, period, day);
 };
 addPeriod('atual', report.current);
 if (report.previous) addPeriod('comparativo', report.previous);
 return serializeCsv(rows);
}

export function revenueReportFilename(scope: RevenueScope): string {
 const slug = scope.organizationSlug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'cliente';
 return slug + '-receita-' + scope.source + '-' + scope.from + '-' + scope.to + '-' + scope.compare + '.csv';
}
