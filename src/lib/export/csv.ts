/**
 * Serialize semicolon-delimited CSV for spreadsheet applications.
 *
 * Campaign names and platform labels are external data. Quoting alone does not
 * prevent spreadsheet formula evaluation; prefix risky TEXT cells with an
 * apostrophe before quoting. Numeric values retain their numeric representation.
 */
export type CsvCell = string | number | null | undefined;

// Invisible Unicode format characters (e.g. BOM, bidi controls and zero-width
// marks) and C0/C1 controls may be stripped by spreadsheet importers before
// formula detection. Treat any such leading characters as untrusted text.
const hiddenPrefix = /[\p{Cc}\p{Cf}]/u;
const whitespace = /\s/u;

function needsTextEscape(raw: string): boolean {
  let hasHiddenPrefix = false;
  for (const char of raw) {
    if (char === '=' || char === '+' || char === '-' || char === '@') return true;
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
