import type {CSSProperties, ReactNode} from 'react';

export type ChartTable = {columns: readonly string[]; rows: readonly (readonly (string | number)[])[]};
export type LegendItem = {label: string; color: string; kind?: 'swatch' | 'compare' | 'line' | 'dash'};

/** Legend entries are real elements (not Recharts' legend) so they wrap, never overlap the plot and can carry state. */
export function ChartLegend({items}: {items: readonly LegendItem[]}) {
  if (!items.length) return null;
  return <ul className="chart-legend" aria-label="Legenda">
    {items.map(item => <li key={item.label}><i data-kind={item.kind ?? 'swatch'} style={{'--legend-color': item.color} as CSSProperties} aria-hidden />{item.label}</li>)}
  </ul>;
}

/**
 * Standard panel for every chart model: title, optional actions and legend, a body with an explicit height
 * (so a responsive plot can never collapse to 0px), an honest empty state and an accessible data table.
 */
export function ChartFrame({title, subtitle, actions, legend, footnote, height = 280, empty, table, bare, children}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  legend?: readonly LegendItem[];
  footnote?: ReactNode;
  /** Plot height in px, or `'auto'` for models that size themselves (donut with legend, heatmap, bullet rows). */
  height?: number | 'auto';
  /** When set, replaces the plot with this message (no data, not zero). */
  empty?: string | null;
  table?: ChartTable;
  /** Embed inside an existing card: no border, background or padding of its own. */
  bare?: boolean;
  children?: ReactNode;
}) {
  return <section className="chart-kit chart-frame" data-bare={bare || undefined} aria-label={title}>
    <header className="chart-frame-head">
      <div><h3>{title}</h3>{subtitle ? <p>{subtitle}</p> : null}</div>
      {actions ? <div className="chart-frame-actions">{actions}</div> : null}
    </header>
    {legend?.length && !empty ? <ChartLegend items={legend} /> : null}
    {empty
      ? <div className="chart-empty" role="status" style={{minHeight: typeof height === 'number' ? Math.min(height, 160) : 120}}>{empty}</div>
      : <div className="chart-body" style={typeof height === 'number' ? {height} : undefined}>{children}</div>}
    {table && !empty ? <details className="chart-table">
      <summary>Ver os dados em tabela</summary>
      <div className="chart-table-scroll"><table>
        <thead><tr>{table.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => cellIndex === 0 ? <th key={cellIndex} scope="row">{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table></div>
    </details> : null}
    {footnote ? <p className="chart-footnote">{footnote}</p> : null}
  </section>;
}

/** Segmented control to switch between chart models of the same data. */
export function ChartModeSwitch<T extends string>({value, options, onChange, label}: {value: T; options: readonly {id: T; label: string}[]; onChange: (id: T) => void; label: string}) {
  return <div className="chart-mode-switch" role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option.id} aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>)}
  </div>;
}
