import type {CSSProperties} from 'react';
import {formatChartValue, type ChartFormat} from '@/lib/charts/format';
import {tone} from './tokens';

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const percentText = (value: number) => new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 0}).format(value) + '%';

/** How far a measure is from its target. `lowerIsBetter` is for costs: being under the target is attainment. */
export function attainment(value: number | null | undefined, target: number | null | undefined, lowerIsBetter = false): {ratio: number; met: boolean} | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || typeof target !== 'number' || !Number.isFinite(target) || target <= 0 || value < 0) return null;
  if (lowerIsBetter) return {ratio: value === 0 ? 1 : target / value, met: value <= target};
  return {ratio: value / target, met: value >= target};
}

/**
 * Semicircle gauge: value against a real target. Without a valid target it must not be rendered (the caller shows an empty state).
 * Text is HTML over the arc so it never scales or gets cut. Green only when the target is met; otherwise the neutral tone.
 */
export function GaugeChart({value, target, format, label, lowerIsBetter = false, ariaLabel}: {value: number | null; target: number | null; format: ChartFormat; label: string; lowerIsBetter?: boolean; ariaLabel: string}) {
  const result = attainment(value, target, lowerIsBetter);
  if (!result) return <div className="chart-empty" role="status">Sem meta válida ou sem valor medido para calcular o atingimento.</div>;
  const progress = clamp(result.ratio);
  const radius = 88, cx = 110, cy = 104;
  const angle = Math.PI * progress;
  const end = {x: cx - radius * Math.cos(angle), y: cy - radius * Math.sin(angle)};
  const arc = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  const track = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const color = result.met ? tone.good : tone.primary;
  return <div className="chart-gauge" role="img" aria-label={ariaLabel + ': ' + percentText(result.ratio * 100) + ' da meta'}>
    <svg viewBox="0 0 220 116" aria-hidden focusable="false">
      <path d={track} fill="none" stroke="var(--chart-grid,#e3e8f2)" strokeWidth={16} strokeLinecap="round" />
      {progress > 0 ? <path d={arc} fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" /> : null}
    </svg>
    <div className="chart-gauge-text">
      <strong>{formatChartValue(format, value, {short: true})}</strong>
      <span>{label}</span>
      <small data-met={result.met || undefined}>{percentText(result.ratio * 100)} da meta de {formatChartValue(format, target, {short: true})}{result.met ? ' · atingida' : ''}</small>
    </div>
  </div>;
}

export type BulletRow = {id: string; label: string; value: number | null; target?: number | null; previous?: number | null};

/**
 * Value bar against a target marker, one row per entity. Rows without a value say so instead of drawing an empty bar.
 * All text is HTML, so long names wrap instead of being clipped.
 */
export function BulletChart({rows, format, lowerIsBetter = false, ariaLabel}: {rows: readonly BulletRow[]; format: ChartFormat; lowerIsBetter?: boolean; ariaLabel: string}) {
  const finite = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const scale = Math.max(0, ...rows.flatMap(row => [row.value, row.target, row.previous].filter(finite))) * 1.1 || 1;
  return <ul className="chart-bullets" aria-label={ariaLabel}>
    {rows.map(row => {
      const result = attainment(row.value, row.target, lowerIsBetter);
      const style = {'--bullet-value': finite(row.value) ? (row.value / scale) * 100 + '%' : '0%', '--bullet-target': finite(row.target) ? (row.target / scale) * 100 + '%' : '0%', '--bullet-prev': finite(row.previous) ? (row.previous / scale) * 100 + '%' : '0%'} as CSSProperties;
      return <li key={row.id} style={style}>
        <span className="chart-bullet-label">{row.label}</span>
        <span className="chart-bullet-track" aria-hidden>
          {finite(row.previous) ? <i className="chart-bullet-prev" /> : null}
          {finite(row.value) ? <i className="chart-bullet-value" data-met={result?.met || undefined} /> : null}
          {finite(row.target) ? <i className="chart-bullet-target" /> : null}
        </span>
        <span className="chart-bullet-figure"><b>{formatChartValue(format, row.value, {short: true})}</b><small>{row.value == null ? 'Sem registro' : result ? percentText(result.ratio * 100) + ' da meta' : 'Sem meta'}</small></span>
      </li>;
    })}
  </ul>;
}
