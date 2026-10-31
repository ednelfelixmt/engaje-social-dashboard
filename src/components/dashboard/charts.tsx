'use client';

import {useState} from 'react';
import {ChartFrame, ChartModeSwitch} from '@/components/charts/chart-frame';
import {TimeSeriesChart, timeSeriesModes, type TimePoint, type TimeSeriesMode} from '@/components/charts/time-series-chart';
import {formatChartValue, shortDate} from '@/lib/charts/format';

type TimelineRow = {date: string; spend: number | null; revenue: number | null};

/** Daily investment (left axis) and, when a commercial source reports it, revenue (right axis). Missing days stay gaps. */
export function Timeline({rows, currency = 'BRL'}: {rows: TimelineRow[]; currency?: string}) {
  const [mode, setMode] = useState<TimeSeriesMode>('columns');
  const money = {kind: 'money', currency} as const;
  const hasRevenue = rows.some(row => row.revenue != null);
  const points: TimePoint[] = rows.map(row => ({label: shortDate(row.date) || row.date, detail: shortDate(row.date, true) || row.date, current: row.spend, secondary: hasRevenue ? row.revenue : undefined}));
  return <div className="mt-6 w-full">
    <ChartFrame bare hideTitle title="Investimento e receita por dia" height={300} empty={rows.length ? null : 'Sem dados sincronizados neste período.'}
      actions={<ChartModeSwitch label="Estilo do gráfico" value={mode} options={timeSeriesModes} onChange={setMode} />}
      legend={hasRevenue ? [{label: 'Investimento', color: 'var(--chart-primary)'}, {label: 'Receita (eixo direito)', color: 'var(--chart-secondary)', kind: 'line'}] : [{label: 'Investimento', color: 'var(--chart-primary)'}]}
      table={{columns: ['Dia', 'Investimento', ...(hasRevenue ? ['Receita'] : [])], rows: rows.map(row => [shortDate(row.date, true) || row.date, formatChartValue(money, row.spend), ...(hasRevenue ? [formatChartValue(money, row.revenue)] : [])])}}
      footnote={hasRevenue ? 'Receita informada pela fonte comercial; dias sem registro aparecem como lacuna, não como zero.' : undefined}>
      <TimeSeriesChart points={points} format={money} mode={mode} name="Investimento" secondary={hasRevenue ? {name: 'Receita', format: money} : undefined} ariaLabel="Investimento e receita por dia" />
    </ChartFrame>
  </div>;
}
