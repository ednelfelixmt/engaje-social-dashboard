import type {CampaignPerformance} from '@/types/domain';
import {finiteRatio} from './aggregation';
import {isRfcOrganizationUuid} from './organization-scope';
import {defaultFunnelIcons, funnelMetricDefinitions, parseFunnelSteps, type FunnelMetricKey} from './funnel-config';

const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Catalog-only campaigns have no measurements; an observed zero is still a fact. */
export function hasFunnelMeasurements(row: CampaignPerformance) {
  return row.currency !== '' || row.spend !== 0 || Object.keys(row.metricValues).length > 0
    || funnelMetricDefinitions.some(definition => 'dataKey' in definition && row[definition.dataKey] != null);
}

function measurement(row: CampaignPerformance, metric: FunnelMetricKey) {
  const definition = funnelMetricDefinitions.find(item => item.key === metric)!;
  // Reconciled purchases and lead counts take precedence over raw platform primitives.
  return 'dataKey' in definition ? row[definition.dataKey] : row.metricValues[metric];
}

export function summarizeFunnelMetric(rows: readonly CampaignPerformance[], metric: FunnelMetricKey, organizationId: string, currency: string) {
  const observed = rows.filter(hasFunnelMeasurements);
  // Reject a missing or malformed tenant identity even when there are no facts.
  // Counts, not only costs, must respect the selected-currency boundary.
  const scopeValid = isRfcOrganizationUuid(organizationId)
    && rows.every(row => row.organizationId === organizationId);
  const currencyValid = /^[A-Z]{3}$/.test(currency) && observed.every(row => row.currency === currency);
  const known = observed.filter(row => validCount(measurement(row, metric)));
  // Unique people are not additive between campaigns without provider-level deduplication.
  // Campaign-level reach is available only when its own daily source grain was validated.
  const reachNeedsDeduplication = metric === 'reach' && observed.length > 1;
  let value: number | null = scopeValid && currencyValid && !reachNeedsDeduplication && observed.length > 0 && known.length === observed.length
    ? known.reduce((total, row) => total + (measurement(row, metric) as number), 0) : null;
  if (value != null && !Number.isFinite(value)) value = null;
  const spend = observed.reduce((total, row) => validCount(row.spend) ? total + row.spend : Number.NaN, 0);
  const definition = funnelMetricDefinitions.find(item => item.key === metric)!;
  const multiplier = 'costMultiplier' in definition ? definition.costMultiplier : 1;
  const cost = scopeValid && currencyValid && Number.isFinite(spend) ? finiteRatio(spend, value, multiplier) : null;
  const detail = !scopeValid ? 'Indicador indisponível: escopo de organização incompatível.'
    : !currencyValid ? 'Indicador indisponível: moeda diferente da exibida ou seleção inválida.'
    : !observed.length ? 'Sem campanhas com medições no período.'
    : reachNeedsDeduplication ? 'Alcance indisponível: pessoas únicas entre campanhas exigem deduplicação comprovada na origem.'
    : value == null ? 'Total indisponível: ' + known.length + ' de ' + observed.length + ' campanhas com valor válido; ' + (known.length < observed.length ? 'cobertura incompleta.' : 'limite numérico excedido.')
    : 'Cobertura: ' + known.length + ' de ' + observed.length + ' campanhas com medições.';
  const costDetail = !Number.isFinite(spend) && scopeValid && currencyValid ? ' Custo indisponível: investimento inválido ou limite numérico.' : '';
  return {value, cost, detail: detail + costDetail, observed: observed.length, known: known.length};
}

/** Presentation contract shared by the configured funnel and period comparison. */
export function configuredFunnel(rows: readonly CampaignPerformance[], rawSteps: unknown, scope: {organizationId: string; currency: string}, previousRows?: readonly CampaignPerformance[]) {
  return parseFunnelSteps(rawSteps).map(step => {
    const definition = funnelMetricDefinitions.find(item => item.key === step.metric)!;
    const current = summarizeFunnelMetric(rows, step.metric, scope.organizationId, scope.currency);
    const previous = summarizeFunnelMetric(previousRows ?? [], step.metric, scope.organizationId, scope.currency);
    const comparisonNote = previousRows !== undefined && previous.value == null ? ' Comparação indisponível: período anterior sem total válido.' : '';
    return {label: step.label, value: current.value, costLabel: definition.costLabel, cost: current.cost,
      detail: current.detail + comparisonNote, color: step.color, icon: step.icon ?? defaultFunnelIcons[step.metric],
      target: step.target ?? null, previousValue: previous.value};
  });
}
