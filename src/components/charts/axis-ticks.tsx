import {wrapLabel} from '@/lib/charts/format';
import {tone} from './tokens';

type TickProps = {x?: number; y?: number; payload?: {value: string | number}};
const LINE_HEIGHT = 14;

/** Category label to the left of a horizontal bar: right-aligned, wrapped to `lines`, full text as native tooltip. */
export function VerticalCategoryTick({x = 0, y = 0, payload, width, lines = 2}: TickProps & {width: number; lines?: number}) {
  const text = String(payload?.value ?? '');
  const wrapped = wrapLabel(text, width, {lines});
  const top = y - ((wrapped.lines.length - 1) * LINE_HEIGHT) / 2;
  return <g>
    <title>{text}</title>
    {wrapped.lines.map((line, index) => <text key={index} x={x - 8} y={top + index * LINE_HEIGHT} dy={4} textAnchor="end" fill={tone.axis} fontSize={12}>{line}</text>)}
  </g>;
}

/** Category label under a column: centred on its band, wrapped to `lines`. Reserve `horizontalTickHeight(lines)` on the axis. */
export function HorizontalCategoryTick({x = 0, y = 0, payload, bandWidth, lines = 2, rotate = false, maxChars = 22}: TickProps & {bandWidth: number; lines?: number; rotate?: boolean; maxChars?: number}) {
  const text = String(payload?.value ?? '');
  if (rotate) {
    const short = text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
    return <g><title>{text}</title><text transform={`translate(${x},${y + 8}) rotate(-35)`} textAnchor="end" fill={tone.axis} fontSize={12}>{short}</text></g>;
  }
  const wrapped = wrapLabel(text, Math.max(40, bandWidth - 6), {lines});
  return <g>
    <title>{text}</title>
    {wrapped.lines.map((line, index) => <text key={index} x={x} y={y + 6 + index * LINE_HEIGHT} dy={8} textAnchor="middle" fill={tone.axis} fontSize={12}>{line}</text>)}
  </g>;
}
export const horizontalTickHeight = (lines = 2) => lines * LINE_HEIGHT + 14;

/**
 * Decide how column labels are drawn: wrapped under the bar when they fit the band, otherwise rotated
 * (a word split in the middle or an ellipsis on a short band is harder to read than a slanted full name).
 */
export function planHorizontalTicks(labels: readonly string[], bandWidth: number, lines = 2, leftRoom = Infinity): {rotate: boolean; height: number; maxChars: number} {
  const rotate = labels.some(label => { const wrapped = wrapLabel(label, Math.max(40, bandWidth - 6), {lines}); return wrapped.truncated || wrapped.broken; });
  // A slanted label runs down and to the left of its tick: size it to the room left of the first bar (cos 35° ≈ 0.82, ~6.8px per char).
  const maxChars = Math.max(8, Math.min(22, Math.floor(leftRoom / 0.82 / 6.8)));
  const longest = Math.min(maxChars, Math.max(1, ...labels.map(label => label.length)));
  return {rotate, maxChars, height: rotate ? Math.min(110, Math.ceil(longest * 6.8 * 0.57) + 28) : horizontalTickHeight(lines)};
}
