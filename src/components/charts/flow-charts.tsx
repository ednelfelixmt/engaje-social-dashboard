'use client';

import {Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis} from 'recharts';
import {formatAxisValue, formatChartValue, histogramRangeLabel, numericAxisWidth, wrapLabel, type ChartFormat} from '@/lib/charts/format';
import {histogramBins, sharesOf, spreadLabels, waterfallBars, type WaterfallInput} from '@/lib/charts/models';
import {HorizontalCategoryTick, planHorizontalTicks} from './axis-ticks';
import {ChartTooltip} from './chart-tooltip';
import {seriesColor, tone} from './tokens';
import {useElementWidth} from './use-element-width';

const axisTick = {fill: tone.axis, fontSize: 12};
const signedText = (format: ChartFormat, value: number) => (value > 0 ? '+' : value < 0 ? '−' : '') + formatChartValue(format, Math.abs(value), {short: true});

/* ───────── waterfall ───────── */

export type WaterfallDirection = 'neutral' | 'higherIsBetter' | 'lowerIsBetter';

/**
 * Bridge between two totals: how each part moved the result. Colour is neutral unless the measure has a favourable
 * direction (`higherIsBetter` / `lowerIsBetter`), in which case only the sign of each step is read as good or bad.
 */
export function WaterfallChart({steps, format, direction = 'neutral', ariaLabel}: {steps: readonly WaterfallInput[]; format: ChartFormat; direction?: WaterfallDirection; ariaLabel: string}) {
  const {ref, width} = useElementWidth<HTMLDivElement>();
  const bars = waterfallBars(steps);
  const levels = bars.flatMap(bar => [bar.base, bar.base + bar.up + bar.down + bar.total]);
  const low = Math.min(0, ...levels), high = Math.max(0, ...levels), scale = Math.max(Math.abs(low), Math.abs(high));
  const yWidth = numericAxisWidth(format, scale);
  const rawBand = (width - yWidth - 34) / Math.max(1, bars.length), band = Math.max(48, rawBand);
  const plan = planHorizontalTicks(bars.map(bar => bar.label), band, 2, yWidth + rawBand / 2 - 4);
  const upColor = direction === 'higherIsBetter' ? tone.good : direction === 'lowerIsBetter' ? tone.bad : tone.primary;
  const downColor = direction === 'higherIsBetter' ? tone.bad : direction === 'lowerIsBetter' ? tone.good : tone.compareStroke;
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={bars} margin={{top: 22, right: 34, left: 0, bottom: 0}} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke={tone.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{stroke: tone.grid}} height={plan.height} tick={props => <HorizontalCategoryTick {...props} bandWidth={band} rotate={plan.rotate} maxChars={plan.maxChars} />} />
        <YAxis width={yWidth} tick={axisTick} tickLine={false} axisLine={false} domain={[low < 0 ? 'auto' : 0, 'auto']} tickFormatter={value => formatAxisValue(format, Number(value), scale)} />
        {low < 0 ? <ReferenceLine y={0} stroke={tone.axis} /> : null}
        <Tooltip cursor={{fill: tone.grid, fillOpacity: 0.45}} content={({active, payload}) => {
          const bar = payload?.[0]?.payload as (typeof bars)[number] | undefined;
          if (!active || !bar) return null;
          return <ChartTooltip title={bar.label} rows={[{label: bar.kind === 'total' ? 'Total' : 'Variação', value: bar.kind === 'total' ? formatChartValue(format, bar.value) : signedText(format, bar.value)}, {label: 'Acumulado', value: formatChartValue(format, bar.end)}]} />;
        }} />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} legendType="none" />
        <Bar dataKey="total" stackId="w" fill={tone.primary} maxBarSize={56} isAnimationActive={false}>
          <LabelList dataKey="total" position="top" fill={tone.text} fontSize={12} formatter={(value: number) => (value ? formatChartValue(format, value, {short: true}) : '')} />
        </Bar>
        <Bar dataKey="up" stackId="w" fill={upColor} maxBarSize={56} isAnimationActive={false}>
          <LabelList dataKey="up" position="top" fill={tone.text} fontSize={12} formatter={(value: number) => (value ? signedText(format, value) : '')} />
        </Bar>
        <Bar dataKey="down" stackId="w" fill={downColor} maxBarSize={56} isAnimationActive={false}>
          <LabelList dataKey="down" position="top" fill={tone.text} fontSize={12} formatter={(value: number) => (value ? signedText(format, -value) : '')} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

/* ───────── slope ───────── */

export type SlopeRow = {id: string; label: string; previous: number | null; current: number | null};

/**
 * Before → after per entity on one shared scale. Only entities with both values are drawn (the rest are the caller's
 * footnote); end labels are spread apart so close values never overlap. Direction colours follow `direction`.
 */
export function SlopeChart({rows, format, direction = 'neutral', previousName = 'Anterior', currentName = 'Atual', ariaLabel}: {rows: readonly SlopeRow[]; format: ChartFormat; direction?: WaterfallDirection; previousName?: string; currentName?: string; ariaLabel: string}) {
  const {ref, width} = useElementWidth<HTMLDivElement>();
  const valid = rows.filter((row): row is SlopeRow & {previous: number; current: number} => Number.isFinite(row.previous) && Number.isFinite(row.current));
  const height = Math.max(180, valid.length * 28 + 56);
  const labelWidth = Math.min(190, Math.max(96, Math.floor(width * 0.3)));
  const left = labelWidth + 70, right = width - labelWidth - 70;
  const all = valid.flatMap(row => [row.previous, row.current]);
  // A slope compares positions, so the scale fits the data (with 8% padding) instead of starting at zero.
  const rawLow = Math.min(...all), rawHigh = Math.max(...all), pad = (rawHigh - rawLow || Math.abs(rawHigh) || 1) * 0.08;
  const low = rawLow - pad, high = rawHigh + pad;
  const top = 30, bottom = height - 12;
  const y = (value: number) => bottom - ((value - low) / (high - low || 1)) * (bottom - top);
  const leftY = spreadLabels(valid.map(row => y(row.previous)), 16, top, bottom);
  const rightY = spreadLabels(valid.map(row => y(row.current)), 16, top, bottom);
  const colorFor = (row: {previous: number; current: number}) => {
    if (direction === 'neutral' || row.current === row.previous) return tone.primary;
    const better = direction === 'higherIsBetter' ? row.current > row.previous : row.current < row.previous;
    return better ? tone.good : tone.bad;
  };
  const clip = (text: string) => wrapLabel(text, labelWidth, {lines: 1}).lines[0];
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    {valid.length && right > left + 40 ? <svg width={width} height={height} aria-hidden focusable="false">
      <text x={left} y={14} textAnchor="middle" fill={tone.axis} fontSize={12} fontWeight={600}>{previousName}</text>
      <text x={right} y={14} textAnchor="middle" fill={tone.axis} fontSize={12} fontWeight={600}>{currentName}</text>
      {valid.map((row, index) => {
        const color = colorFor(row);
        return <g key={row.id}>
          <title>{`${row.label}: ${formatChartValue(format, row.previous)} → ${formatChartValue(format, row.current)}`}</title>
          <line x1={left} y1={y(row.previous)} x2={right} y2={y(row.current)} stroke={color} strokeWidth={2} />
          <circle cx={left} cy={y(row.previous)} r={4} fill={color} />
          <circle cx={right} cy={y(row.current)} r={4} fill={color} />
          <text x={left - 10} y={leftY[index]} dy={4} textAnchor="end" fill={tone.text} fontSize={12}>{formatChartValue(format, row.previous, {short: true})}</text>
          <text x={right + 10} y={rightY[index]} dy={4} textAnchor="start" fill={tone.text} fontSize={12}>{formatChartValue(format, row.current, {short: true})}</text>
          <text x={left - 62} y={leftY[index]} dy={4} textAnchor="end" fill={tone.axis} fontSize={12}>{clip(row.label)}</text>
        </g>;
      })}
    </svg> : <div className="chart-empty" role="status">Sem entidades com valor nos dois períodos para comparar.</div>}
  </div>;
}

/* ───────── histogram ───────── */

/** Distribution of a measure across entities (e.g. CPL per campaign): how many fall in each range. */
export function HistogramChart({values, format, bins = 8, unitName = 'itens', ariaLabel}: {values: readonly (number | null | undefined)[]; format: ChartFormat; bins?: number; unitName?: string; ariaLabel: string}) {
  const {ref, width} = useElementWidth<HTMLDivElement>();
  const {bins: ranges} = histogramBins(values, bins);
  const data = ranges.map(bin => ({...bin, label: histogramRangeLabel(format, bin.from, bin.to, bin.to === bin.from)}));
  const rawBand = (width - 52) / Math.max(1, data.length), band = Math.max(48, rawBand);
  const plan = planHorizontalTicks(data.map(bin => bin.label), band, 2, 40 + rawBand / 2 - 4);
  const peak = Math.max(1, ...data.map(bin => bin.count));
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{top: 18, right: 12, left: 0, bottom: 0}} barCategoryGap="8%">
        <CartesianGrid vertical={false} stroke={tone.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{stroke: tone.grid}} height={plan.height} tick={props => <HorizontalCategoryTick {...props} bandWidth={band} rotate={plan.rotate} maxChars={plan.maxChars} />} />
        <YAxis width={40} allowDecimals={false} domain={[0, peak]} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip cursor={{fill: tone.grid, fillOpacity: 0.45}} content={({active, payload}) => {
          const bin = payload?.[0]?.payload as (typeof data)[number] | undefined;
          if (!active || !bin) return null;
          return <ChartTooltip title={bin.label} rows={[{label: unitName, value: String(bin.count), color: tone.primary}]} />;
        }} />
        <Bar dataKey="count" name={unitName} fill={tone.primary} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList dataKey="count" position="top" fill={tone.text} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

/* ───────── treemap ───────── */

export type TreeItem = {id: string; label: string; value: number | null; color?: string};
type TileProps = {x?: number; y?: number; width?: number; height?: number; id?: string; label?: string; fill?: string; share?: string; selectedId?: string | null};

/** A label is only drawn when the tile can hold it (so there is never half a word); the tooltip always has the full name. */
function Tile({x = 0, y = 0, width = 0, height = 0, id, label = '', fill, share = '', selectedId}: TileProps) {
  if (width <= 0 || height <= 0) return <g />;
  // Name lines + one line for the share must fit the tile height (15px per line + 16px padding); otherwise draw no text.
  const nameLines = Math.min(3, Math.floor((height - 16) / 15) - 1);
  const wrapped = width >= 88 && nameLines >= 1 ? wrapLabel(label, width - 16, {lines: nameLines}) : null;
  return <g>
    <title>{label + (share ? ' · ' + share : '')}</title>
    <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} fillOpacity={selectedId && selectedId !== id ? 0.35 : 0.92} stroke={tone.surface} strokeWidth={2} />
    {wrapped ? wrapped.lines.map((line, index) => <text key={index} x={x + 8} y={y + 20 + index * 15} fill="#fff" fontSize={12} fontWeight={600}>{line}</text>) : null}
    {wrapped ? <text x={x + 8} y={y + 20 + wrapped.lines.length * 15} fill="#fff" fillOpacity={0.9} fontSize={12}>{share}</text> : null}
  </g>;
}

/** Part-of-whole for many items at once (budget concentration). Needs a frame height of at least 240. */
export function TreemapChart({items, format, selectedId, ariaLabel}: {items: readonly TreeItem[]; format: ChartFormat; selectedId?: string | null; ariaLabel: string}) {
  const valid = items.filter((item): item is TreeItem & {value: number} => Number.isFinite(item.value) && (item.value as number) > 0).sort((a, b) => b.value - a.value);
  const shares = sharesOf(valid.map(item => item.value)); // scaled: stays correct even when the plain sum would overflow
  const data = valid.slice(0, 24).map((item, index) => ({id: item.id, name: item.label, label: item.label, value: item.value, fill: item.color ?? seriesColor(index), size: shares[index], share: new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1}).format(shares[index] * 100) + '%', selectedId}));
  return <div role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <Treemap data={data} dataKey="size" nameKey="name" aspectRatio={16 / 9} isAnimationActive={false} content={<Tile />}>
        <Tooltip content={({active, payload}) => {
          const item = payload?.[0]?.payload as (typeof data)[number] | undefined;
          if (!active || !item) return null;
          return <ChartTooltip title={item.label} rows={[{label: 'Valor', value: formatChartValue(format, item.value), color: item.fill}, {label: 'Participação', value: item.share}]} />;
        }} />
      </Treemap>
    </ResponsiveContainer>
  </div>;
}

/* ───────── funnel as bars ───────── */

export type FunnelStage = {id: string; label: string; value: number | null};

/**
 * Stages as proportional bars with the conversion from the previous stage. These are event counts, not people:
 * the caller must say so. A stage without a value breaks the chain instead of being treated as zero.
 */
export function FunnelBarsChart({stages, format = {kind: 'count'}, ariaLabel}: {stages: readonly FunnelStage[]; format?: ChartFormat; ariaLabel: string}) {
  const first = stages.find(stage => Number.isFinite(stage.value) && (stage.value as number) > 0)?.value ?? 0;
  return <ul className="chart-funnel-bars" aria-label={ariaLabel}>
    {stages.map((stage, index) => {
      const value = stage.value;
      const previous = index > 0 ? stages[index - 1].value : null;
      const rate = value != null && previous != null && previous > 0 ? (value / previous) * 100 : null;
      const widthPct = value != null && first > 0 ? Math.max(1.5, Math.min(100, (value / first) * 100)) : 0;
      return <li key={stage.id}>
        <span className="chart-funnel-label">{stage.label}</span>
        <span className="chart-funnel-track" aria-hidden><i style={{width: widthPct + '%'}} /></span>
        <span className="chart-funnel-figure"><b>{formatChartValue(format, value)}</b><small>{index === 0 ? 'Entrada' : rate == null ? 'Sem base de conversão' : new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2}).format(rate) + '% da etapa anterior'}</small></span>
      </li>;
    })}
  </ul>;
}

/* ───────── sparkline & small multiples ───────── */

const SPARK_W = 100, SPARK_H = 32, SPARK_PAD = 4;
/** Mini evolution line. A missing day breaks the line (never interpolated, never zero); an isolated day is a dot. */
export function Sparkline({values, color = tone.primary, ariaLabel}: {values: readonly (number | null)[]; color?: string; ariaLabel?: string}) {
  const known = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (known.length < 2) return <span className="chart-spark" data-empty aria-hidden />;
  const low = Math.min(...known), high = Math.max(...known), span = high - low;
  const x = (index: number) => (values.length === 1 ? SPARK_W / 2 : (index / (values.length - 1)) * SPARK_W);
  const y = (value: number) => (span === 0 ? SPARK_H / 2 : SPARK_H - SPARK_PAD - ((value - low) / span) * (SPARK_H - SPARK_PAD * 2));
  const runs: {x: number; y: number}[][] = [[]];
  values.forEach((value, index) => { if (typeof value !== 'number' || !Number.isFinite(value)) { if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push({x: x(index), y: y(value)}); });
  const paths = runs.filter(run => run.length).map(run => (run.length === 1 ? `M${run[0].x.toFixed(2)} ${run[0].y.toFixed(2)}h0` : 'M' + run.map(point => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')));
  return <svg className="chart-spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true} focusable="false">
    {paths.map((d, index) => <path key={index} d={d} data-dot={d.endsWith('h0') || undefined} style={{stroke: color}} />)}
  </svg>;
}

export type MultipleItem = {id: string; label: string; total: number | null; values: readonly (number | null)[]};
/** One mini chart per entity on a common layout, so trends can be compared at a glance. */
export function SmallMultiples({items, format, ariaLabel}: {items: readonly MultipleItem[]; format: ChartFormat; ariaLabel: string}) {
  return <ul className="chart-multiples" aria-label={ariaLabel}>
    {items.map(item => <li key={item.id}>
      <span className="chart-multiple-name">{item.label}</span>
      <b>{formatChartValue(format, item.total, {short: true})}</b>
      <Sparkline values={item.values} />
    </li>)}
  </ul>;
}
