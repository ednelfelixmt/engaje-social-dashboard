import {serializeCsv, type CsvCell} from './csv';
import type {TargetReferenceReport} from '@/lib/reports/target-references';

/**
 * Each reference is a separate comparison, never a sum of overlapping metrics.
 * Export only the already-authorized, scoped report (no source facts or IDs).
 */
export function targetReferencesCsv(report: TargetReferenceReport): string {
 const {scope} = report;
 const header: CsvCell[] = [
  'versao', 'gerado_em_utc', 'cliente', 'fonte', 'inicio', 'fim', 'fuso_cadastral',
  'moeda_observada', 'moeda_referencia', 'registros_fonte', 'dias_recebidos',
  'dias_esperados', 'referencias_cadastradas', 'campo', 'indicador', 'unidade',
  'dias_com_componentes', 'valor_observado', 'valor_referencia', 'diferenca',
  'situacao', 'justificativa',
 ];
 return serializeCsv([
  header,
  ...report.rows.map((row): CsvCell[] => [
   '1', scope.generatedAt, scope.organizationName, 'metrics_ads', scope.from,
   scope.to, scope.timezone, scope.currency, scope.referenceCurrency,
   report.sourceRecords, report.receivedDays, report.expectedDays, report.configured,
   row.field, row.label, row.unit, row.knownDays, row.actual, row.target,
   row.difference, row.status, row.reason,
  ]),
 ]);
}

/** Filename cannot escape the local download directory or inject path separators. */
export function targetReferencesFilename(report: TargetReferenceReport): string {
 const slug = report.scope.organizationSlug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'cliente';
 const from = report.scope.from.replace(/[^0-9-]/g, '');
 const to = report.scope.to.replace(/[^0-9-]/g, '');
 return slug + '-referencias-' + from + '-' + to + '.csv';
}
