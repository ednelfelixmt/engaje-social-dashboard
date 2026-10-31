'use client';

import {Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {categoryAxisWidth, estimateTextWidth, formatChartValue, type ChartFormat} from '@/lib/charts/format';
import {VerticalCategoryTick} from './axis-ticks';
import {ChartTooltip} from './chart-tooltip';
import {tone} from './tokens';
import {useElementWidth} from './use-element-width';

export type RankingRow = {
  id: string;
  label: string;
  /** `null` = no record; such rows are left out and counted by the caller, never drawn as zero. */
  value: number | null;
  previous?: number | null;
  /** Optional identity colour (e.g. platform). Default is the primary tone. */
  color?: string;
  note?: string;
};

/** Height needed for `count` rows so labels and bars never get squeezed. */
export const rankingHeight = (count: number, compare = false) => Math.max(96, count * (compare ? 56 : 40) + 8);

/**
 * Horizontal ranking. The label column is measured from the longest name and the chart width, long names wrap to two
 * lines with the full text as a native tooltip, and the value sits at the end of each bar (no axis to read).
 */
export function RankingBarChart({rows, format, compare = false, name = 'Período selecionado', compareName = 'Comparativo', selectedId, onSelect, ariaLabel}: {
  rows: readonly RankingRow[];
  format: ChartFormat;
  compare?: boolean;
  name?: string;
  compareName?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  ariaLabel: string;
}) {
  const {ref, width} = useElementWidth<HTMLDivElement>();
  const data = rows.filter(row => row.value != null).map(row => ({...row, previous: compare ? row.previous ?? null : null, text: formatChartValue(format, row.value, {short: true})}));
  const labelWidth = categoryAxisWidth(data.map(row => row.label), width);
  const widestValue = data.reduce((largest, row) => Math.max(largest, estimateTextWidth(row.text, 12)), 0);
  const fade = (id: string) => (selectedId && selectedId !== id ? 0.4 : 1);
  return <div ref={ref} role="img" aria-label={ariaLabel} style={{height: '100%', width: '100%'}}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} layout="vertical" margin={{top: 2, right: widestValue + 14, left: 0, bottom: 2}} barCategoryGap={compare ? '22%' : '30%'} barGap={2}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis type="category" dataKey="label" width={labelWidth} tickLine={false} axisLine={false} interval={0} tick={props => <VerticalCategoryTick {...props} width={labelWidth} />} />
        <Tooltip
          cursor={{fill: tone.grid, fillOpacity: 0.45}}
          content={({active, payload}) => {
            const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !row) return null;
            const items = [{label: name, value: formatChartValue(format, row.value), color: row.color ?? tone.primary}];
            if (compare) items.push({label: compareName, value: row.previous == null ? 'Sem registro' : formatChartValue(format, row.previous), color: tone.compareStroke});
            return <ChartTooltip title={row.label} rows={items} note={row.note} />;
          }}
        />
        <Bar dataKey="value" name={name} radius={[0, 4, 4, 0]} barSize={compare ? 16 : 20} isAnimationActive={false} cursor={onSelect ? 'pointer' : undefined} onClick={entry => { const id = (entry as {payload?: {id?: string}}).payload?.id; if (id) onSelect?.(id); }}>
          {data.map(row => <Cell key={row.id} fill={row.color ?? tone.primary} fillOpacity={fade(row.id)} />)}
          <LabelList dataKey="text" position="right" fill={tone.text} fontSize={12} />
        </Bar>
        {compare ? <Bar dataKey="previous" name={compareName} fill={tone.compare} stroke={tone.compareStroke} strokeWidth={1.5} radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false} /> : null}
      </BarChart>
    </ResponsiveContainer>
    {onSelect ? <div className="sr-only">{data.map(row => <button type="button" key={row.id} onClick={() => onSelect(row.id)}>Selecionar {row.label}</button>)}</div> : null}
  </div>;
}
