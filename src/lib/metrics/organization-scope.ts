/**
 * Defensive validation for an authenticated organization's UUID before producing
 * campaign-derived analytics. PostgreSQL UUID syntax also accepts values
 * with invalid RFC version/variant bits; reject these even for empty results.
 *
 * This is a format guard, not an authorization substitute. Callers still
 * enforce identity, membership and tenant-scoped database queries/RLS.
 */
export function isRfcOrganizationUuid(value: string): boolean {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
