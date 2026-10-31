'use client';

import {CartesianGrid, LabelList, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell} from 'recharts';
import {formatAxisValue, formatChartValue, numericAxisWidth, type ChartFormat} from '@/lib/charts/format';
import {median, radarIndex, type RadarAxis} from '@/lib/charts/models';
import {ChartTooltip} from './chart-tooltip';
import {tone} from './tokens';

const axisTick = {fill: tone.axis, fontSize: 12};

/* ───────── scatter / bubble ───────── */

export type RelationPoint = {id: string; label: string; x: number | null; y: number | null; size?: number | null; color?: string};

/**
 * Two measures against each other (e.g. spend × leads). Dashed medians split the plane in four quadrants, bubble area
 * encodes an optional third measure, and only the largest points are named (the rest are in the tooltip), so labels never pile up.
 */
export function ScatterBubbleChart({points, xFormat, yFormat, xName, yName, sizeName, sizeFormat = {kind: 'count'}, labelTop = 4, selectedId, onSelect, ariaLabel}: {
  points: readonly RelationPoint[];
  xFormat: ChartFormat;
  yFormat: ChartFormat;
  xName: string;
  yName: string;
  sizeName?: string;
  sizeFormat?: ChartFormat;
  labelTop?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  ariaLabel: string;
}) {
  const valid = points.filter((point): point is RelationPoint & {x: number; y: number} => Number.isFinite(point.x) && Number.isFinite(point.y) && (point.x as number) >= 0 && (point.y as number) >= 0);
  const sizes = valid.map(point => point.size).filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  const named = new Set([...valid].sort((a, b) => (b.size ?? b.x) - (a.size ?? a.x)).slice(0, labelTop).map(point => point.id));
  const data = valid.map(point => ({...point, size: point.size && point.size > 0 ? point.size : sizes.length ? Math.min(...sizes) : 1, tag: named.has(point.id) ? point.label : ''}));
  const medianX = median(valid.map(point => point.x)), medianY = median(valid.map(point => point.y));
  const maxX = Math.max(0, ...valid.map(point => point.x)), maxY = Math.max(0, ...valid.map(point => point.y));
  const yWidth = numericAxisWidth(yFormat, maxY) + 18;
  return <div role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ScatterChart margin={{top: 30, right: 28, left: 0, bottom: 4}}>
        <CartesianGrid stroke={tone.grid} strokeDasharray="3 5" />
        <XAxis type="number" dataKey="x" name={xName} domain={[0, (max: number) => Math.ceil(max * 1.08)]} tick={axisTick} tickLine={false} axisLine={{stroke: tone.grid}} height={46} tickFormatter={value => formatAxisValue(xFormat, Number(value), maxX)}
          label={{value: xName, position: 'insideBottom', offset: 0, fill: tone.axis, fontSize: 12}} />
        <YAxis type="number" dataKey="y" name={yName} domain={[0, (max: number) => Math.ceil(max * 1.12)]} width={yWidth} tick={axisTick} tickLine={false} axisLine={false} tickFormatter={value => formatAxisValue(yFormat, Number(value), maxY)}
          label={{value: yName, angle: -90, position: 'insideLeft', offset: 10, fill: tone.axis, fontSize: 12, style: {textAnchor: 'middle'}}} />
        <ZAxis type="number" dataKey="size" range={sizes.length ? [70, 520] : [150, 150]} name={sizeName} />
        {medianX != null ? <ReferenceLine x={medianX} stroke={tone.axis} strokeDasharray="6 4" label={{value: 'mediana', position: 'insideTopRight', fill: tone.axis, fontSize: 12}} /> : null}
        {medianY != null ? <ReferenceLine y={medianY} stroke={tone.axis} strokeDasharray="6 4" /> : null}
        <Tooltip cursor={{strokeDasharray: '3 3', stroke: tone.axis}} content={({active, payload}) => {
          const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
          if (!active || !point) return null;
          const rows = [{label: xName, value: formatChartValue(xFormat, point.x)}, {label: yName, value: formatChartValue(yFormat, point.y)}];
          if (sizes.length && sizeName) rows.push({label: sizeName, value: formatChartValue(sizeFormat, valid.find(item => item.id === point.id)?.size ?? null)});
          return <ChartTooltip title={point.label} rows={rows} />;
        }} />
        <Scatter data={data} isAnimationActive={false} cursor={onSelect ? 'pointer' : undefined} onClick={entry => { const id = (entry as {id?: string}).id; if (id) onSelect?.(id); }}>
          {data.map(point => <Cell key={point.id} fill={point.color ?? tone.primary} fillOpacity={selectedId && selectedId !== point.id ? 0.3 : 0.75} stroke={tone.surface} strokeWidth={1.5} />)}
          <LabelList dataKey="tag" content={(props: {cx?: string | number; cy?: string | number; x?: string | number; y?: string | number; height?: string | number; value?: string | number}) => {
            const label = String(props.value ?? '');
            if (!label) return null;
            const short = label.length > 24 ? label.slice(0, 23) + '…' : label;
            const radius = (Number(props.height) || 12) / 2;
            return <text key={label} x={Number(props.cx ?? props.x ?? 0)} y={Number(props.cy ?? props.y ?? 0) - radius - 6} textAnchor="middle" fill={tone.text} stroke={tone.surface} strokeWidth={3} paintOrder="stroke" fontSize={12}>{short}</text>;
          }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  </div>;
}

/* ───────── radar ───────── */

export type RadarMetric = RadarAxis & {format: ChartFormat};
export type RadarEntity = {id: string; label: string; color: string; values: Record<string, number | null>};

/**
 * Profile comparison across several measures. Each axis is indexed 0–100 against the largest value among the entities
 * (relative reading, stated in the footnote); the tooltip always shows the real values. Axes nobody has a value for are dropped.
 */
export function RadarCompareChart({axes, entities, ariaLabel}: {axes: readonly RadarMetric[]; entities: readonly RadarEntity[]; ariaLabel: string}) {
  const indexed = radarIndex(axes, entities);
  const formatOf = new Map(axes.map(axis => [axis.key, axis.format]));
  return <div role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <RadarChart data={indexed.rows} outerRadius="72%" margin={{top: 16, right: 40, bottom: 16, left: 40}}>
        <PolarGrid stroke={tone.grid} />
        <PolarAngleAxis dataKey="label" tick={(props: {x?: number; y?: number; cx?: number; cy?: number; textAnchor?: 'start' | 'middle' | 'end' | 'inherit'; payload?: {value: string | number}}) => {
          // Push each axis name 10px outward so it never touches the polygon tip.
          const dx = (props.x ?? 0) - (props.cx ?? 0), dy = (props.y ?? 0) - (props.cy ?? 0), length = Math.hypot(dx, dy) || 1;
          return <text x={(props.x ?? 0) + (dx / length) * 10} y={(props.y ?? 0) + (dy / length) * 10 + 4} textAnchor={props.textAnchor} fill={tone.axis} fontSize={12}>{String(props.payload?.value ?? '')}</text>;
        }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip content={({active, payload}) => {
          const row = payload?.[0]?.payload as {axis: string; label: string} | undefined;
          if (!active || !row) return null;
          const format = formatOf.get(row.axis) ?? {kind: 'count' as const};
          return <ChartTooltip title={row.label} rows={entities.map(entity => ({label: entity.label, value: formatChartValue(format, entity.values[row.axis]), color: entity.color}))} note="Formato do gráfico: índice relativo ao maior valor." />;
        }} />
        {entities.map(entity => <Radar key={entity.id} dataKey={entity.id} name={entity.label} stroke={entity.color} fill={entity.color} fillOpacity={0.16} strokeWidth={2} dot={{r: 3, fill: entity.color, stroke: 'none'}} isAnimationActive={false} />)}
      </RadarChart>
    </ResponsiveContainer>
  </div>;
}
