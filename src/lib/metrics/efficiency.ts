/**
 * Observed cost per attributed lead for a single, already-scoped campaign.
 * No currency conversion or attribution inference is performed here.
 *
 * A valid recorded zero spend stays zero; a tiny positive quotient rounded to
 * zero by IEEE-754 underflow is unknown rather than a manufactured free lead.
 * Invalid values and division overflow must never reach scatter plots or ranks.
 */
export function campaignCpl(
  spend: number | null | undefined,
  leads: number | null | undefined,
): number | null {
  if (spend == null || leads == null || !Number.isFinite(spend) || !Number.isFinite(leads) ||
      spend < 0 || leads <= 0) return null;
  const cpl = spend / leads;
  return Number.isFinite(cpl) && (cpl > 0 || spend === 0) ? cpl : null;
}
