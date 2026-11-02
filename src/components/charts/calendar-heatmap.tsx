import type {CSSProperties} from 'react';
import {formatChartValue, shortDate, type ChartFormat} from '@/lib/charts/format';
import {heatmapGrid, rampStepFor, rampThresholds} from '@/lib/charts/models';
import {rampColor} from './tokens';

const weekdayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * One square per day, weeks in columns, Monday first. Colour steps are quantiles of the observed values (so one outlier
 * does not wash out the rest); a day without a record is hatched, which is different from a recorded zero (lowest step).
 */
export function CalendarHeatmap({from, to, days, format, name, ariaLabel}: {
  from: string;
  to: string;
  days: readonly {date: string; value: number | null}[];
  format: ChartFormat;
  name: string;
  ariaLabel: string;
}) {
  const byDate = new Map(days.map(day => [day.date, day.value]));
  const valueOf = (date: string) => { const value = byDate.get(date); return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; };
  const {cells, weeks} = heatmapGrid(from, to, valueOf);
  if (!cells.length) return <div className="chart-empty" role="status">Período inválido para o calendário.</div>;
  const cuts = rampThresholds(cells.map(cell => cell.value));
  const observed = cells.filter(cell => cell.value !== null).length;
  // Name a month on the column where its first day appears.
  const monthStarts = new Map<number, string>();
  let lastMonth = '';
  for (const cell of cells) { const month = cell.date.slice(0, 7); if (month !== lastMonth) { monthStarts.set(cell.week, monthNames[Number(cell.date.slice(5, 7)) - 1]); lastMonth = month; } }
  const style = {'--weeks': weeks} as CSSProperties;
  return <div className="chart-heatmap" style={style} role="img" aria-label={`${ariaLabel}. ${observed} de ${cells.length} dias com registro.`}>
    <div className="chart-heatmap-grid">
      <span className="chart-heatmap-corner" aria-hidden />
      {Array.from({length: weeks}, (_, week) => <span key={'m' + week} className="chart-heatmap-month" style={{gridColumn: week + 2, gridRow: 1}} aria-hidden>{monthStarts.get(week) ?? ''}</span>)}
      {weekdayNames.map((label, index) => <span key={label} className="chart-heatmap-weekday" style={{gridColumn: 1, gridRow: index + 2}} aria-hidden>{index % 2 === 0 ? label : ''}</span>)}
      {cells.map(cell => {
        const step = cell.value === null ? null : rampStepFor(cell.value, cuts);
        const title = `${shortDate(cell.date, true)} · ${name}: ${cell.value === null ? 'sem registro' : formatChartValue(format, cell.value)}`;
        return <span key={cell.date} className="chart-heatmap-cell" data-missing={cell.value === null || undefined} style={{gridColumn: cell.week + 2, gridRow: cell.weekday + 2, background: step === null ? undefined : rampColor(step)}} title={title} />;
      })}
    </div>
    <div className="chart-heatmap-legend" aria-hidden>
      <span>Menos</span>{[0, 1, 2, 3, 4].map(step => <i key={step} style={{background: rampColor(step)}} />)}<span>Mais</span>
      <span className="chart-heatmap-sep" /><i className="chart-heatmap-missing" /><span>Sem registro</span>
    </div>
  </div>;
}
