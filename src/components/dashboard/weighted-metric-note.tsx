import type {WeightedMetricSummary} from '@/lib/metrics/weighted-metrics';

/** Visible methodology and coverage travel with the KPI, including platform cards. */
export function WeightedMetricNote({summary, comparisonIncomplete = false}: {summary?: WeightedMetricSummary; comparisonIncomplete?: boolean}) {
  if (!summary) return null;
  return <div className="mt-2 space-y-1 text-xs leading-5 text-zinc-400">
    <p>{summary.status === 'complete' ? 'Cobertura completa' : summary.status === 'partial' ? 'Cobertura parcial' : 'Métrica indisponível'}: {summary.includedRows} de {summary.rows} registros com valor e peso válidos.</p>
    {summary.missingValues > 0 ? <p>{summary.missingValues} sem valor válido.</p> : null}
    {summary.invalidWeights > 0 ? <p>{summary.invalidWeights} com impressões ausentes, inválidas ou sem peso positivo.</p> : null}
    {summary.overflow ? <p>Cálculo excede o limite numérico; valor indisponível.</p> : null}
    {summary.value != null ? <p>Estimativa ponderada por impressões; pode diferir do consolidado do provedor.</p> : null}
    {comparisonIncomplete ? <p>Comparação indisponível por falta de cobertura completa nos dois períodos.</p> : null}
  </div>;
}
