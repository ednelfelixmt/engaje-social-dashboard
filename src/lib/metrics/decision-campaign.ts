import type {CampaignPerformance} from '@/types/domain';

/**
 * Campaign IDs are not globally unique: the same external ID may exist in
 * different tenants, providers, advertising accounts or currencies.
 */
function comparisonKey(row: CampaignPerformance): string | null {
  const {organizationId, platform, accountId, campaignId, currency} = row;
  // The act_ alias belongs to Meta. Other providers may use that prefix literally.
  const normalizedAccount = platform === 'meta_ads' ? accountId?.replace(/^act_/, '') : accountId;
  if (!organizationId || !platform || !normalizedAccount || !campaignId || !/^[A-Z]{3}$/.test(currency)) return null;
  return JSON.stringify([organizationId, platform, normalizedAccount, campaignId, currency]);
}

/** Unknown or ambiguous previous-period identity must not produce a comparison. */
export function findComparableCampaign(
  current: CampaignPerformance,
  previous: readonly CampaignPerformance[],
): CampaignPerformance | null {
  const identity = comparisonKey(current);
  if (identity === null) return null;
  let match: CampaignPerformance | null = null;
  for (const candidate of previous) {
    if (comparisonKey(candidate) !== identity) continue;
    if (match !== null) return null; // Duplicate grain: no arbitrary first match.
    match = candidate;
  }
  return match;
}
