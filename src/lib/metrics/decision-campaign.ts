import type {CampaignPerformance} from '@/types/domain';
import {isRfcOrganizationUuid} from './organization-scope';
import {campaignCpl} from './efficiency';

/**
 * Campaign IDs are not globally unique: the same external ID may exist in
 * different tenants, providers, advertising accounts or currencies.
 */
/** Keep direct campaign comparison consistent with the strict reconciliation grain. */
function validGrainIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value === value.trim()
    && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}

function comparisonKey(row: CampaignPerformance): string | null {
  const {organizationId, platform, accountId, campaignId, currency} = row;
  // Validate the raw source ID before applying Meta's single allowed act_ alias.
  // Otherwise a doubled marker can be mistaken for a valid opaque account.
  if (!isRfcOrganizationUuid(organizationId) || !validGrainIdentifier(platform)
    || !validGrainIdentifier(accountId) || !validGrainIdentifier(campaignId)
    || !/^[A-Z]{3}$/.test(currency)) return null;
  const normalizedAccount = platform === 'meta_ads' ? accountId.replace(/^act_/, '') : accountId;
  if (!validGrainIdentifier(normalizedAccount) || (platform === 'meta_ads' && normalizedAccount.startsWith('act_'))) return null;
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

/** Presentation-only recommendation; no campaign is changed automatically. */
export type DecisionRecommendation = 'scale' | 'evaluate' | 'review';
export type CampaignDecisionImpact = CampaignPerformance & {
  cpl: number | null;
  recommendation: DecisionRecommendation;
  decisionKey: string;
};

function usableLeads(value: number | null): number {
  return value != null && Number.isFinite(value) && value >= 0 ? value : -1;
}

/**
 * Recommend scale only when observed CPL improves against a uniquely comparable
 * prior-period campaign. Without a trustworthy baseline, explicitly recommend
 * evaluation rather than presenting lead presence as proof of improvement.
 */
export function rankCampaignDecisionImpacts(
  current: readonly CampaignPerformance[],
  previous: readonly CampaignPerformance[],
  comparing: boolean,
): CampaignDecisionImpact[] {
  const order: Record<DecisionRecommendation, number> = {scale: 0, evaluate: 1, review: 2};
  // Catalog-only records without spend are not decision candidates; keep that
  // established behavior, but validate every actionable row before ranking.
  const active = current.filter(row => Number.isFinite(row.spend) && row.spend > 0);
  const keys = active.map(comparisonKey);
  if (keys.some(key => key === null)) throw new Error('Invalid decision campaign grain');
  const first = active[0];
  if (first && active.some(row => row.organizationId !== first.organizationId || row.currency !== first.currency)) {
    throw new Error('Mixed decision campaign scope');
  }
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate decision campaign grain');
  return active.map((row, index) => {
    const cpl = campaignCpl(row.spend, row.leads);
    const historical = comparing ? findComparableCampaign(row, previous) : null;
    const historicalCpl = historical ? campaignCpl(historical.spend, historical.leads) : null;
    const recommendation: DecisionRecommendation = cpl === null ? 'review'
      : historicalCpl === null || cpl === historicalCpl ? 'evaluate'
      : cpl < historicalCpl ? 'scale' : 'review';
    return {
      ...row, cpl, recommendation,
      // Canonical Meta identity makes the UI key stable across valid act_ aliases.
      decisionKey: keys[index]!,
    };
  }).sort((a, b) => order[a.recommendation] - order[b.recommendation]
    || usableLeads(b.leads) - usableLeads(a.leads)
    || b.spend - a.spend
    || a.decisionKey.localeCompare(b.decisionKey)).slice(0, 6);
}
