import type {CSSProperties} from 'react';

export type TooltipRow = {label: string; value: string; color?: string};

/** Shared tooltip body. Rendered by Recharts `content`, so it is plain markup styled by `.chart-tooltip`. */
export function ChartTooltip({title, rows, note}: {title?: string; rows: readonly TooltipRow[]; note?: string}) {
  return <div className="chart-tooltip" role="tooltip">
    {title ? <strong>{title}</strong> : null}
    {rows.map(row => <p key={row.label}>
      <span>{row.color ? <i style={{'--legend-color': row.color} as CSSProperties} aria-hidden /> : null}{row.label}</span>
      <b>{row.value}</b>
    </p>)}
    {note ? <small>{note}</small> : null}
  </div>;
}
