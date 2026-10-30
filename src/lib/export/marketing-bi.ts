import {analyticsCampaignKey, type AnalyticsWorkspaceModel} from '@/lib/reports/analytics-workspace';
import type {BISelection} from '@/lib/reports/marketing-bi';
import {paidMetric} from '@/lib/metrics/paid-metrics';
import {serializeCsv, type CsvCell} from './csv';

/** Same metric columns as the visible BI campaign table; do not average rates. */
export const marketingBIMetrics = ['spend','impressions','clicks','leads','ctr','cpc','cpm','cpl'] as const;

/** Export only the already-authorized BI selection, without querying or mutating data.
 * A status column prevents raw historical leads/CPL from implying attribution
 * equivalence. Observed values (including zero) are never silently removed.
 */
export function marketingBICsv(model: AnalyticsWorkspaceModel, selection: BISelection, search = ''): string {
  const {scope} = model, comparing = scope.compare !== 'none';
  // Fail closed if a caller accidentally passes another tenant/currency's selection.
  if (selection.current.concat(selection.previous).some(row =>
    row.organizationId !== scope.organizationId || row.currency !== scope.currency)
    || (!comparing && selection.previous.length > 0)) {
    throw new Error('Marketing BI CSV scope mismatch');
  }

  // Pairing must be determined from what the CSV actually contains: a search
  // may exclude the prior campaign or match only a renamed current campaign.
  const term = search.trim().toLocaleLowerCase('pt-BR');
  const matches = (row: BISelection['current'][number]) =>
    row.campaignName.toLocaleLowerCase('pt-BR').includes(term);
  const current = selection.current.filter(matches);
  const previousFacts = selection.previous.filter(matches);
  const campaignKey = (row: BISelection['current'][number]) =>
    analyticsCampaignKey(row.platform, row.accountId, row.campaignId);
  const currentKeys = new Set(current.map(campaignKey));
  const previousKeys = new Set(previousFacts.map(campaignKey));
  // Each exported row needs its own pairing status. A different campaign's
  // historical observation must not mark an unmatched campaign as comparable.
  const attributionFor = (row: BISelection['current'][number]) => {
    const key = campaignKey(row);
    if (!comparing) return 'desativado';
    if (!currentKeys.has(key) || !previousKeys.has(key)) return 'sem_par_observado';
    return selection.compatible ? 'equivalente' : 'nao_equivalente';
  };

  const rows: CsvCell[][] = [[
    'versao','cliente','fonte','moeda','fuso_cadastral','modo_comparacao',
    'comparacao_leads_cpl','periodo','inicio','fim','plataforma','conta',
    'campanha_id','campanha',...marketingBIMetrics,
  ]];
  const periods: {label: 'atual' | 'comparativo'; from: string; to: string; facts: BISelection['current']}[] = [
    {label: 'atual', from: scope.from, to: scope.to, facts: current},
  ];
  if (comparing) {
    const previous = model.commercial.previous;
    if (!previous) throw new Error('Marketing BI CSV comparison range unavailable');
    periods.push({label: 'comparativo', from: previous.from, to: previous.to, facts: previousFacts});
  }
  for (const period of periods) {
    for (const row of period.facts) {
      rows.push([
        '1',scope.organizationName,'metrics_ads',scope.currency,scope.timezone,
        scope.compare,attributionFor(row),period.label,period.from,period.to,
        row.platform,row.accountId,row.campaignId,row.campaignName,
        ...marketingBIMetrics.map(metric => paidMetric(row,metric)),
      ]);
    }
  }
  return serializeCsv(rows);
}
