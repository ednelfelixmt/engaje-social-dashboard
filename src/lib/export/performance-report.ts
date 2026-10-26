import {serializeCsv, type CsvCell} from './csv';
import type {PerformanceGroup, PerformancePeriod, PerformanceReport, PerformanceScope} from '@/lib/reports/performance-report';

/**
 * Export only the values already authorized and rendered by the private executive report.
 * Source record IDs are deliberately omitted; missing measurements remain empty CSV cells.
 * Each comparison and each platform/campaign is a separate, labeled period row.
 */
export function performanceReportCsv(report: PerformanceReport): string {
 const {scope, current, previous} = report;
 const header: CsvCell[] = [
  'versao', 'gerado_em_utc', 'cliente', 'fonte', 'moeda', 'fuso_cadastral', 'modo_comparacao',
  'tipo_linha', 'plataforma', 'conta', 'campanha_id', 'campanha', 'periodo',
  'inicio', 'fim', 'registros_recebidos', 'registros_com_investimento',
  'registros_com_impressoes', 'registros_com_cliques', 'registros_com_leads',
  'janelas_atribuicao', 'investimento', 'impressoes', 'cliques', 'leads_atribuidos',
  'ctr_pct', 'cpc', 'cpm', 'cpl_atribuido',
 ];
 const records: CsvCell[][] = [header];
 const push = (kind: 'resumo' | 'plataforma' | 'campanha', name: 'atual' | 'comparativo', period: PerformancePeriod, group?: PerformanceGroup) => {
  records.push([
   '1', scope.generatedAt, scope.organizationName, 'metrics_ads', scope.currency,
   scope.timezone, scope.compare, kind, group?.platform ?? null, group?.account ?? null,
   group?.campaignId ?? null, kind === 'campanha' ? group?.label ?? null : null,
   name, period.from, period.to, period.sourceIds.length, period.coverage.spend,
   period.coverage.impressions, period.coverage.clicks, period.coverage.leads,
   period.attribution.length ? JSON.stringify(period.attribution) : null,
   period.totals.spend, period.totals.impressions, period.totals.clicks,
   period.totals.leads, period.totals.ctr, period.totals.cpc,
   period.totals.cpm, period.totals.cpl,
  ]);
 };
 push('resumo', 'atual', current);
 if (previous) push('resumo', 'comparativo', previous);
 for (const [kind, groups] of [['plataforma', report.platforms], ['campanha', report.campaigns]] as const) {
  for (const group of groups) {
   push(kind, 'atual', group.current, group);
   if (group.previous) push(kind, 'comparativo', group.previous, group);
  }
 }
 return serializeCsv(records);
}

export function performanceReportFilename(scope: PerformanceScope): string {
 const slug = scope.organizationSlug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0,80) || 'cliente';
 return slug + '-relatorio-executivo-' + scope.from + '-' + scope.to + '-' + scope.compare + '.csv';
}
