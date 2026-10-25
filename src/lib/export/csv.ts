/**
 * Serialize semicolon-delimited CSV for spreadsheet applications.
 *
 * Campaign names and platform labels are external data. Quoting alone does not
 * prevent spreadsheet formula evaluation; prefix risky TEXT cells with an
 * apostrophe before quoting. Numeric values retain their numeric representation.
 */
export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return '""';
  const raw = String(value);
  // Leading whitespace/control characters can hide a formula prefix in Excel.
  const safe = typeof value === 'string' && (/^\s*[=+\-@]/u.test(raw) || /^[\t\r\n]/u.test(raw))
    ? "'" + raw
    : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}

/** UTF-8 BOM preserves accents when opening in common desktop spreadsheets. */
export function serializeCsv(rows: readonly (readonly CsvCell[])[]): string {
  return '\ufeff' + rows.map(row => row.map(escapeCell).join(';')).join('\r\n');
}
