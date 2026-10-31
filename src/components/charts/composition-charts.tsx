'use client';

import {Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {formatAxisValue, formatChartValue, numericAxisWidth, type ChartFormat} from '@/lib/charts/format';
import {groupSlices, paretoSeries, type Slice} from '@/lib/charts/models';
import {HorizontalCategoryTick, planHorizontalTicks} from './axis-ticks';
import {ChartTooltip} from './chart-tooltip';
import {maxCategories, seriesColor, tone} from './tokens';
import {useElementWidth} from './use-element-width';

const axisTick = {fill: tone.axis, fontSize: 12};
const pct = (share: number) => new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}).format(share * 100) + '%';

/* ───────── donut ───────── */

/**
 * Share of a total. The legend is a real list (name, share and value) instead of labels on the slices, so nothing
 * overlaps or gets cut; more than `maxCategories` slices collapse into "Outros". Needs `height="auto"` in the frame.
 */
export function DonutChart({slices, format, centerLabel = 'Total', selectedId, onSelect, ariaLabel}: {
  slices: readonly Slice[];
  format: ChartFormat;
  centerLabel?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  ariaLabel: string;
}) {
  const grouped = groupSlices(slices, maxCategories);
  const data = grouped.slices.map((slice, index) => ({...slice, fill: slice.color ?? (slice.id === '__others__' ? seriesColor(7) : seriesColor(index))}));
  const fade = (id: string) => (selectedId && selectedId !== id ? 0.35 : 1);
  return <div className="chart-donut">
    <div className="chart-donut-plot" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="96%" paddingAngle={data.length > 1 ? 2 : 0} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}
            cursor={onSelect ? 'pointer' : undefined} onClick={entry => { const id = (entry as {id?: string}).id; if (id && id !== '__others__') onSelect?.(id); }}>
            {data.map(slice => <Cell key={slice.id} fill={slice.fill} fillOpacity={fade(slice.id)} />)}
          </Pie>
          <Tooltip content={({active, payload}) => {
            const slice = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !slice) return null;
            return <ChartTooltip title={slice.label} rows={[{label: 'Valor', value: formatChartValue(format, slice.value), color: slice.fill}, {label: 'Participação', value: pct(slice.share)}]} />;
          }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-donut-center"><strong>{formatChartValue(format, grouped.total, {short: true})}</strong><span>{centerLabel}</span></div>
    </div>
    <ul className="chart-donut-legend">
      {data.map(slice => <li key={slice.id}>
        <button type="button" disabled={!onSelect || slice.id === '__others__'} aria-pressed={selectedId === slice.id} onClick={() => onSelect?.(slice.id)}>
          <i style={{background: slice.fill}} aria-hidden /><span>{slice.label}</span><b>{pct(slice.share)}</b><em>{formatChartValue(format, slice.value, {short: true})}</em>
        </button>
      </li>)}
    </ul>
  </div>;
}

/* ───────── stacked / grouped / 100% columns ───────── */

export type StackCategory = {id: string; label: string; values: Record<string, number | null>};
export type StackSeries = {id: string; label: string; color: string};
export type StackLayout = 'stacked' | 'grouped' | 'percent';
export const stackLayouts = [{id: 'stacked', label: 'Empilhado'}, {id: 'grouped', label: 'Agrupado'}, {id: 'percent', label: '100%'}] as const satisfies readonly {id: StackLayout; label: string}[];

/** Categories on X, one bar (or group) each, split by series. The 100% layout shows shares and keeps the real values in the tooltip. */
export function StackedBarChart({categories, series, format, layout, ariaLabel}: {
  categories: readonly StackCategory[];
  series: readonly StackSeries[];
  format: ChartFormat;
  layout: StackLayout;
  ariaLabel: string;
}) {
  const {ref, width} = useElementWidth<HTMLDivElement>();
  const known = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const data = categories.map(category => {
    const total = series.reduce((sum, item) => sum + (known(category.values[item.id]) ? (category.values[item.id] as number) : 0), 0);
    const row: Record<string, string | number | null | Record<string, number | null>> = {label: category.label, raw: category.values, total};
    for (const item of series) {
      const value = category.values[item.id];
      row[item.id] = !known(value) ? null : layout === 'percent' ? (total > 0 ? (value / total) * 100 : null) : value;
    }
    return row;
  });
  const axisFormat: ChartFormat = layout === 'percent' ? {kind: 'percent'} : format;
  const peak = layout === 'percent' ? 100 : Math.max(0, ...data.map(row => layout === 'stacked' ? (row.total as number) : Math.max(0, ...series.map(item => (row[item.id] as number | null) ?? 0))));
  const yWidth = numericAxisWidth(axisFormat, peak);
  const rawBand = (width - yWidth - 16) / Math.max(1, categories.length), band = Math.max(40, rawBand);
  const plan = planHorizontalTicks(categories.map(category => category.label), band, 2, yWidth + rawBand / 2 - 4);
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{top: 16, right: 12, left: 0, bottom: 0}} barCategoryGap="22%" barGap={2}>
        <CartesianGrid vertical={false} stroke={tone.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{stroke: tone.grid}} height={plan.height} tick={props => <HorizontalCategoryTick {...props} bandWidth={band} rotate={plan.rotate} maxChars={plan.maxChars} />} />
        <YAxis width={yWidth} tick={axisTick} tickLine={false} axisLine={false} domain={layout === 'percent' ? [0, 100] : [0, 'auto']} tickFormatter={value => formatAxisValue(axisFormat, Number(value), peak)} />
        <Tooltip cursor={{fill: tone.grid, fillOpacity: 0.45}} content={({active, payload}) => {
          const row = payload?.[0]?.payload as {label: string; raw: Record<string, number | null>; total: number} | undefined;
          if (!active || !row) return null;
          const rows = series.map(item => ({label: item.label, value: row.raw[item.id] == null ? 'Sem registro' : formatChartValue(format, row.raw[item.id]) + (layout === 'percent' && row.total > 0 ? ` (${pct((row.raw[item.id] as number) / row.total)})` : ''), color: item.color}));
          if (layout !== 'grouped') rows.push({label: 'Total', value: formatChartValue(format, row.total), color: ''});
          return <ChartTooltip title={row.label} rows={rows.map(item => ({...item, color: item.color || undefined}))} />;
        }} />
        {series.map(item => <Bar key={item.id} dataKey={item.id} name={item.label} stackId={layout === 'grouped' ? undefined : 'stack'} fill={item.color} radius={layout === 'grouped' ? [4, 4, 0, 0] : 0} maxBarSize={layout === 'grouped' ? 24 : 56} isAnimationActive={false} />)}
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

/* ───────── pareto ───────── */

/** Bars in descending order plus the running share of the total (right axis, 0–100%) with the 80% reference. */
export function ParetoChart({rows, format, name = 'Valor', ariaLabel}: {rows: readonly {id: string; label: string; value: number | null}[]; format: ChartFormat; name?: string; ariaLabel: string}) {
  const {ref, width} = useElementWidth<HTMLDivElement>();
  const pareto = paretoSeries(rows, 10);
  const peak = Math.max(0, ...pareto.rows.map(row => row.value));
  const yWidth = numericAxisWidth(format, peak), rWidth = 48;
  const rawBand = (width - yWidth - rWidth - 16) / Math.max(1, pareto.rows.length), band = Math.max(40, rawBand);
  const plan = planHorizontalTicks(pareto.rows.map(row => row.label), band, 2, yWidth + rawBand / 2 - 4);
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart data={pareto.rows} margin={{top: 16, right: 4, left: 0, bottom: 0}} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={tone.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{stroke: tone.grid}} height={plan.height} tick={props => <HorizontalCategoryTick {...props} bandWidth={band} rotate={plan.rotate} maxChars={plan.maxChars} />} />
        <YAxis width={yWidth} tick={axisTick} tickLine={false} axisLine={false} domain={[0, 'auto']} tickFormatter={value => formatAxisValue(format, Number(value), peak)} />
        <YAxis yAxisId="cumulative" orientation="right" width={rWidth} tick={axisTick} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={value => value + '%'} />
        <Tooltip cursor={{fill: tone.grid, fillOpacity: 0.45}} content={({active, payload}) => {
          const row = payload?.[0]?.payload as (typeof pareto.rows)[number] | undefined;
          if (!active || !row) return null;
          return <ChartTooltip title={row.label} rows={[{label: name, value: formatChartValue(format, row.value), color: tone.primary}, {label: 'Acumulado', value: new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1}).format(row.cumulative) + '%', color: tone.secondary}]} />;
        }} />
        <Bar dataKey="value" name={name} fill={tone.primary} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        <ReferenceLine yAxisId="cumulative" y={80} stroke={tone.axis} strokeDasharray="6 4" label={{value: '80%', position: 'insideTopRight', fill: tone.axis, fontSize: 12}} />
        <Line yAxisId="cumulative" dataKey="cumulative" name="Acumulado" type="monotone" stroke={tone.secondary} strokeWidth={2.5} dot={{r: 3, fill: tone.secondary, stroke: 'none'}} activeDot={{r: 5}} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
