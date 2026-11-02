'use client';

import {useId} from 'react';
import {Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {formatAxisValue, formatChartValue, numericAxisWidth, type ChartFormat} from '@/lib/charts/format';
import {ChartTooltip} from './chart-tooltip';
import {tone} from './tokens';

export type TimePoint = {
  /** Short axis label, e.g. "05/10". */
  label: string;
  /** Full description for the tooltip, e.g. "05/10/2026". */
  detail?: string;
  /** `null` means "no record": it is drawn as a gap, never as zero. */
  current: number | null;
  previous?: number | null;
  previousDetail?: string;
  secondary?: number | null;
};
export type TimeSeriesMode = 'columns' | 'line' | 'area' | 'step';
export const timeSeriesModes = [
  {id: 'columns', label: 'Colunas'},
  {id: 'line', label: 'Linhas'},
  {id: 'area', label: 'Área'},
  {id: 'step', label: 'Degraus'},
] as const satisfies readonly {id: TimeSeriesMode; label: string}[];

const axisTick = {fill: tone.axis, fontSize: 12};

/**
 * Evolution over time in four styles with an optional historical comparison, secondary axis and target line.
 * Series are direct children of ComposedChart (Recharts cannot discover them through a Fragment).
 * Isolated observations get a dot, otherwise a single day between gaps would not be drawn at all.
 */
export function TimeSeriesChart({points, format, mode, name = 'Período selecionado', compare = false, compareName = 'Comparativo', secondary, target, ariaLabel, zeroBase = true, allLabels = false}: {
  points: readonly TimePoint[];
  format: ChartFormat;
  mode: TimeSeriesMode;
  name?: string;
  compare?: boolean;
  compareName?: string;
  secondary?: {name: string; format: ChartFormat};
  target?: {value: number; label: string} | null;
  ariaLabel: string;
  zeroBase?: boolean;
  /** Categories (age ranges, platforms) must all be named; dates may be thinned out. */
  allLabels?: boolean;
}) {
  const gradient = 'ts-fill-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const data = points.map((point, index) => ({
    ...point,
    index,
    previous: compare ? point.previous ?? null : null,
    zeroCurrent: point.current === 0 ? 0 : null,
    zeroPrevious: compare && point.previous === 0 ? 0 : null,
  }));
  const known = (values: (number | null | undefined)[]) => values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const max = Math.max(0, ...known(data.flatMap(row => [row.current, row.previous])), target?.value ?? 0);
  const secondaryMax = Math.max(0, ...known(data.map(row => row.secondary)));
  const width = numericAxisWidth(format, max);
  const isolated = (index: number) => data[index]?.current != null && (index === 0 || data[index - 1].current == null) && (index === data.length - 1 || data[index + 1].current == null);
  const dot = (props: {cx?: number; cy?: number; index?: number}) => props.index !== undefined && isolated(props.index) && props.cx !== undefined && props.cy !== undefined
    ? <circle key={'dot-' + props.index} cx={props.cx} cy={props.cy} r={3.5} fill={tone.primary} />
    : <g key={'dot-' + (props.index ?? 'x')} />;
  // Isolated comparative days need a marker because they cannot form a line.
  const isolatedPrevious = (index: number) => data[index]?.previous != null && (index === 0 || data[index - 1].previous == null) && (index === data.length - 1 || data[index + 1].previous == null);
  const previousDot = (props: {cx?: number; cy?: number; index?: number}) => props.index !== undefined && isolatedPrevious(props.index) && props.cx !== undefined && props.cy !== undefined
    ? <circle key={'prev-dot-' + props.index} cx={props.cx} cy={props.cy} r={3} fill={tone.compareStroke} />
    : <g key={'prev-dot-' + (props.index ?? 'x')} />;
  const lineType = mode === 'step' ? 'stepAfter' : 'linear';
  const decimals = max < 10 || format.kind !== 'count';

  return <div role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart data={data} margin={{top: 16, right: secondary ? 4 : 12, left: 0, bottom: 0}} barGap={2}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-primary,#24356f)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-primary,#24356f)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={tone.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{stroke: tone.grid}} interval={allLabels ? 0 : 'preserveStartEnd'} minTickGap={allLabels ? 0 : 18} tickMargin={8} />
        <YAxis width={width} tick={axisTick} tickLine={false} axisLine={false} allowDecimals={decimals} domain={zeroBase ? [0, 'auto'] : ['auto', 'auto']} tickFormatter={value => formatAxisValue(format, Number(value), max)} />
        {secondary ? <YAxis yAxisId="secondary" orientation="right" width={numericAxisWidth(secondary.format, secondaryMax)} tick={axisTick} tickLine={false} axisLine={false} domain={[0, 'auto']} tickFormatter={value => formatAxisValue(secondary.format, Number(value), secondaryMax)} /> : null}
        <Tooltip
          cursor={mode === 'columns' ? {fill: tone.grid, fillOpacity: 0.45} : {stroke: tone.axis, strokeDasharray: '3 3'}}
          content={({active, payload}) => {
            const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !row) return null;
            const rows = [{label: name, value: row.current == null ? 'Sem registro' : formatChartValue(format, row.current), color: tone.primary}];
            if (compare) rows.push({label: compareName, value: row.previous == null ? 'Sem registro' : formatChartValue(format, row.previous), color: tone.compareStroke});
            if (secondary) rows.push({label: secondary.name, value: row.secondary == null ? 'Sem registro' : formatChartValue(secondary.format, row.secondary), color: tone.secondary});
            return <ChartTooltip title={row.detail ?? row.label} rows={rows} note={compare && row.previousDetail ? 'Comparativo: ' + row.previousDetail : undefined} />;
          }}
        />
        {mode === 'columns' ? <Bar dataKey="current" name={name} fill={tone.primary} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} /> : null}
        {mode === 'columns' && compare ? <Bar dataKey="previous" name={compareName} fill={tone.compare} stroke={tone.compareStroke} strokeWidth={1.5} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} /> : null}
        {mode === 'columns' ? <Line dataKey="zeroCurrent" stroke="none" dot={{r: 3, fill: tone.primary, stroke: 'none'}} activeDot={false} legendType="none" connectNulls={false} isAnimationActive={false} /> : null}
        {mode === 'columns' && compare ? <Line dataKey="zeroPrevious" stroke="none" dot={{r: 3, fill: tone.compareStroke, stroke: 'none'}} activeDot={false} legendType="none" connectNulls={false} isAnimationActive={false} /> : null}
        {mode === 'area' ? <Area dataKey="current" name={name} type="linear" stroke={tone.primary} strokeWidth={2.5} fill={'url(#' + gradient + ')'} dot={dot} activeDot={{r: 5}} connectNulls={false} isAnimationActive={false} /> : null}
        {mode === 'line' || mode === 'step' ? <Line dataKey="current" name={name} type={lineType} stroke={tone.primary} strokeWidth={2.5} dot={dot} activeDot={{r: 5}} connectNulls={false} isAnimationActive={false} /> : null}
        {mode !== 'columns' && compare ? <Line dataKey="previous" name={compareName} type={lineType} stroke={tone.compareStroke} strokeWidth={2} strokeDasharray="5 4" dot={previousDot} activeDot={{r: 4}} connectNulls={false} isAnimationActive={false} /> : null}
        {secondary ? <Line yAxisId="secondary" dataKey="secondary" name={secondary.name} type="linear" stroke={tone.secondary} strokeWidth={2} dot={{r: 2.5, fill: tone.secondary, stroke: 'none'}} activeDot={{r: 4}} connectNulls={false} isAnimationActive={false} /> : null}
        {target ? <ReferenceLine y={target.value} stroke={tone.axis} strokeDasharray="6 4" label={{value: target.label, position: 'insideTopRight', fill: tone.axis, fontSize: 12}} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
