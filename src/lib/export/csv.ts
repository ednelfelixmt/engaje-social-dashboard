/**
 * Serialize semicolon-delimited CSV for spreadsheet applications.
 *
 * Campaign names and platform labels are external data. Quoting alone does not
 * prevent spreadsheet formula evaluation; prefix risky TEXT cells with an
 * apostrophe before quoting. Numeric values retain their numeric representation.
 */
export type CsvCell = string | number | null | undefined;

// Unicode default-ignorable prefixes include Cf plus non-Cf marks such as
// the combining grapheme joiner and variation selectors. Some spreadsheet
// importers can discard those prefixes before evaluating a formula.
// Keep the original bytes; neutralize only the CSV text-cell interpretation.
const hiddenPrefix = /[\p{Cc}\p{Default_Ignorable_Code_Point}]/u;
const whitespace = /\s/u;

function needsTextEscape(raw: string): boolean {
  let hasHiddenPrefix = false;
  for (const char of raw) {
    if (char === '=' || char === '+' || char === '-' || char === '@' || char === '＝' || char === '＋' || char === '－' || char === '＠') return true;
    if (hiddenPrefix.test(char)) { hasHiddenPrefix = true; continue; }
    if (whitespace.test(char)) continue;
    return hasHiddenPrefix;
  }
  return hasHiddenPrefix;
}

function escapeCell(value: CsvCell): string {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return '""';
  const raw = String(value);
  // Neutralize formula-like text and leading invisible/control characters.
  // Ordinary leading spaces remain unchanged; trusted numeric cells stay numeric.
  const safe = typeof value === 'string' && needsTextEscape(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}

/** UTF-8 BOM preserves accents when opening in common desktop spreadsheets. */
export function serializeCsv(rows: readonly (readonly CsvCell[])[]): string {
  return '\ufeff' + rows.map(row => row.map(escapeCell).join(';')).join('\r\n');
}
