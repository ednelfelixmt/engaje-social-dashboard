/** Security gate for agency-initiated membership activation.
 * A missing privileged invitation service or failed invitation lookup
 * must never be interpreted as permission to activate a user.
 * This function is independent from UI/server details for regression testing.
 */
export type MembershipActivationCheck = {
  isActive: boolean;
  serviceConfigured: boolean;
  invitationLookupFailed: boolean;
  invitationStatus: 'pending' | 'accepted' | 'revoked' | 'expired' | null;
};
export type MembershipActivationDecision =
  | {allowed:true}
  | {allowed:false;reason:'service_unavailable'|'invitation_lookup_failed'|'invitation_unaccepted'};

export function canActivateMembership(input:MembershipActivationCheck):MembershipActivationDecision {
  if (!input.isActive) return {allowed:true};
  if (!input.serviceConfigured) return {allowed:false,reason:'service_unavailable'};
  if (input.invitationLookupFailed) return {allowed:false,reason:'invitation_lookup_failed'};
  if (input.invitationStatus !== null && input.invitationStatus !== 'accepted') {
    return {allowed:false,reason:'invitation_unaccepted'};
  }
  return {allowed:true};
}
