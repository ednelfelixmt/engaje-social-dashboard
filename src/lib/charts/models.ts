/** Pure data preparation for the chart models. Nothing here draws; everything is deterministic and unit tested. */

const finite = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

/* ───────── composition ───────── */

export type Slice = {id: string; label: string; value: number | null; color?: string};
export type GroupedSlices = {slices: (Slice & {value: number; share: number})[]; total: number; ignored: number};

/**
 * Valid positive slices sorted by size; everything past `max - 1` becomes one "Outros" slice.
 * Zero, negative, missing and non-finite values never reach the chart (`ignored` counts them).
 */
export function groupSlices(slices: readonly Slice[], max = 8): GroupedSlices {
  const valid = slices.filter((slice): slice is Slice & {value: number} => finite(slice.value) && slice.value > 0).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const ignored = slices.length - valid.length;
  const head = valid.length > max ? valid.slice(0, max - 1) : valid;
  const tail = valid.length > max ? valid.slice(max - 1) : [];
  const rest = tail.reduce((sum, slice) => sum + slice.value, 0);
  const merged = tail.length ? [...head, {id: '__others__', label: `Outros (${tail.length})`, value: rest}] : head;
  const total = merged.reduce((sum, slice) => sum + slice.value, 0);
  return {slices: merged.map(slice => ({...slice, share: total > 0 ? slice.value / total : 0})), total: Number.isFinite(total) ? total : 0, ignored};
}

export type ParetoRow = {id: string; label: string; value: number; cumulative: number};
/** Descending bars with the running share (0–100) of the total. Rows without a valid positive value are left out. */
export function paretoSeries(rows: readonly {id: string; label: string; value: number | null}[], top = 10): {rows: ParetoRow[]; total: number; reaches: number | null; ignored: number} {
  const valid = rows.filter((row): row is {id: string; label: string; value: number} => finite(row.value) && row.value > 0).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const total = valid.reduce((sum, row) => sum + row.value, 0);
  let running = 0;
  const all = valid.map(row => { running += row.value; return {...row, cumulative: total > 0 ? (running / total) * 100 : 0}; });
  const shown = all.length > top ? [...all.slice(0, top - 1), {id: '__others__', label: `Outros (${all.length - top + 1})`, value: all.slice(top - 1).reduce((sum, row) => sum + row.value, 0), cumulative: 100}] : all;
  const reaches = all.findIndex(row => row.cumulative >= 80);
  return {rows: shown, total, reaches: reaches >= 0 ? reaches + 1 : null, ignored: rows.length - valid.length};
}

/* ───────── waterfall ───────── */

export type WaterfallInput = {id: string; label: string; value: number; kind: 'total' | 'delta'};
export type WaterfallBar = {id: string; label: string; kind: 'total' | 'delta'; value: number; /** invisible base */ base: number; up: number; down: number; total: number; end: number};

/**
 * Floating bars for a bridge. `total` steps stand on zero; `delta` steps float from the running level.
 * Works with negative levels: the base is the lower edge and the visible bar always has a non-negative size.
 */
export function waterfallBars(steps: readonly WaterfallInput[]): WaterfallBar[] {
  let level = 0;
  return steps.map(step => {
    if (step.kind === 'total') {
      level = step.value;
      return {id: step.id, label: step.label, kind: 'total', value: step.value, base: Math.min(0, step.value), up: 0, down: 0, total: Math.abs(step.value), end: level};
    }
    const start = level, end = level + step.value;
    level = end;
    return {id: step.id, label: step.label, kind: 'delta', value: step.value, base: Math.min(start, end), up: step.value >= 0 ? Math.abs(step.value) : 0, down: step.value < 0 ? Math.abs(step.value) : 0, total: 0, end};
  });
}

/* ───────── distribution ───────── */

export type HistogramBin = {from: number; to: number; count: number};
/** Equal-width bins over the observed range. All-equal values yield one bin; non-finite values are ignored. */
export function histogramBins(values: readonly (number | null | undefined)[], bins = 8): {bins: HistogramBin[]; ignored: number} {
  const valid = values.filter(finite);
  const ignored = values.length - valid.length;
  if (!valid.length) return {bins: [], ignored};
  const low = Math.min(...valid), high = Math.max(...valid);
  if (low === high) return {bins: [{from: low, to: high, count: valid.length}], ignored};
  const count = Math.max(1, Math.min(bins, valid.length));
  const width = (high - low) / count;
  const out: HistogramBin[] = Array.from({length: count}, (_, index) => ({from: low + index * width, to: index === count - 1 ? high : low + (index + 1) * width, count: 0}));
  for (const value of valid) out[Math.min(count - 1, Math.floor((value - low) / width))].count++;
  return {bins: out, ignored};
}

export function median(values: readonly (number | null | undefined)[]): number | null {
  const valid = values.filter(finite).sort((a, b) => a - b);
  if (!valid.length) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
}

/* ───────── heatmap ───────── */

/** Quantile thresholds (4 cut points) over observed positive values, so the colour ramp uses all 5 steps even with outliers. */
export function rampThresholds(values: readonly (number | null | undefined)[]): number[] {
  const valid = values.filter(finite).sort((a, b) => a - b);
  if (!valid.length) return [];
  return [0.2, 0.4, 0.6, 0.8].map(q => valid[Math.min(valid.length - 1, Math.floor(q * valid.length))]);
}
/** 0 (lowest) … 4 (highest). Zero observed is the lowest step, distinct from missing (the caller draws missing separately). */
export function rampStepFor(value: number, thresholds: readonly number[]): 0 | 1 | 2 | 3 | 4 {
  let step = 0;
  for (const cut of thresholds) if (value > cut) step++;
  return Math.min(4, step) as 0 | 1 | 2 | 3 | 4;
}

export type HeatmapCell = {date: string; value: number | null; week: number; weekday: number};
/** Monday-first week grid between two ISO dates (inclusive). Dates without data keep `value: null`. */
export function heatmapGrid(from: string, to: string, valueOf: (date: string) => number | null): {cells: HeatmapCell[]; weeks: number} {
  const start = Date.parse(from + 'T12:00:00Z'), end = Date.parse(to + 'T12:00:00Z');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return {cells: [], weeks: 0};
  const weekday = (time: number) => (new Date(time).getUTCDay() + 6) % 7;
  const offset = weekday(start);
  const cells: HeatmapCell[] = [];
  for (let time = start, index = 0; time <= end; time += 86400000, index++) {
    const date = new Date(time).toISOString().slice(0, 10);
    cells.push({date, value: valueOf(date), week: Math.floor((index + offset) / 7), weekday: weekday(time)});
  }
  return {cells, weeks: cells.length ? cells[cells.length - 1].week + 1 : 0};
}

/* ───────── radar ───────── */

export type RadarAxis = {key: string; label: string};
export type RadarSeries = {id: string; label: string; values: Record<string, number | null>};
/**
 * Index 0–100 per axis where 100 is the largest value among the series (relative, not absolute).
 * An axis where nobody has a value, or every value is zero, is dropped so it cannot invent a shape.
 */
export function radarIndex(axes: readonly RadarAxis[], series: readonly RadarSeries[]): {axes: RadarAxis[]; rows: ({axis: string; label: string} & Record<string, number | string | null>)[]} {
  const kept = axes.filter(axis => series.some(item => finite(item.values[axis.key]) && (item.values[axis.key] as number) > 0));
  const rows = kept.map(axis => {
    const peak = Math.max(...series.map(item => item.values[axis.key]).filter(finite));
    const row: {axis: string; label: string} & Record<string, number | string | null> = {axis: axis.key, label: axis.label};
    for (const item of series) { const value = item.values[axis.key]; row[item.id] = finite(value) && peak > 0 ? (value / peak) * 100 : null; }
    return row;
  });
  return {axes: kept, rows};
}

/* ───────── slope ───────── */

/**
 * Vertical positions for labels that would collide: keeps the order, enforces `gap` between neighbours and stays inside
 * [min, max]. Used by slope charts where two entities can have almost the same value.
 */
export function spreadLabels(wanted: readonly number[], gap: number, min: number, max: number): number[] {
  const order = wanted.map((value, index) => ({value, index})).sort((a, b) => a.value - b.value || a.index - b.index);
  const placed = order.map(item => item.value);
  for (let i = 0; i < placed.length; i++) placed[i] = Math.max(placed[i], i === 0 ? min : placed[i - 1] + gap);
  for (let i = placed.length - 1; i >= 0; i--) placed[i] = Math.min(placed[i], i === placed.length - 1 ? max : placed[i + 1] - gap);
  for (let i = 0; i < placed.length; i++) placed[i] = Math.max(placed[i], i === 0 ? min : placed[i - 1] + gap);
  const result = new Array<number>(wanted.length);
  order.forEach((item, position) => { result[item.index] = placed[position]; });
  return result;
}
