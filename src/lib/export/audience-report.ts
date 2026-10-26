import {serializeCsv} from './csv';
import {audienceDimensions, breakdownMetricValue, type AudienceReport} from '@/lib/reports/audience-report';

/** Each dimension is a separate cut; deliberately no cross-dimension grand total. */
export function audienceReportCsv(report: AudienceReport): string {
 const scope = report.scope;
 return serializeCsv([
  ['versao', 'gerado_em_utc', 'cliente', 'organizacao_id', 'plataforma', 'fonte', 'inicio', 'fim', 'fuso_organizacao', 'base_datas', 'moeda', 'janela_atribuicao', 'dimensao', 'valor', 'rotulo', 'registros_fonte', 'ids_registros_fonte', 'registros_com_investimento', 'registros_com_impressoes', 'registros_com_cliques', 'registros_com_leads', 'investimento', 'impressoes', 'cliques', 'leads', 'ctr_pct', 'cpc', 'cpm', 'cpl'],
  ...audienceDimensions.flatMap(dimension => report.groups[dimension].map(row => [
   '1', scope.generatedAt, scope.organizationName, scope.organizationId, scope.platform, 'metrics_ads_breakdowns', scope.from, scope.to, scope.timezone, 'metric_date da fonte; sem conversão neste relatório', scope.currency,
   report.attributionWindow ?? 'Não informada', dimension, row.value, row.label, row.sourceIds.length, JSON.stringify(row.sourceIds),
   row.coverage.spend, row.coverage.impressions, row.coverage.clicks, row.coverage.leads,
   row.spend, row.impressions, row.clicks, row.leads,
   breakdownMetricValue(row, 'ctr'), breakdownMetricValue(row, 'cpc'), breakdownMetricValue(row, 'cpm'), breakdownMetricValue(row, 'cpl'),
  ])),
 ]);
}
export function audienceReportFilename(report: AudienceReport) {
 const slug = report.scope.organizationSlug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0,80) || 'cliente';
 return slug + '-' + report.scope.platform + '-publico-' + report.scope.from + '-' + report.scope.to + '.csv';
}
