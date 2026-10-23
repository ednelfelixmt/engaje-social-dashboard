/** Security gate for agency-initiated membership activation.
 * A missing privileged invitation service or failed invitation lookup
 * must never be interpreted as permission to activate a user.
 * This function is independent from UI/server details for regression testing.
 */
export type MembershipActivationCheck = {
  isActive: boolean;
  serviceConfigured: boolean;
  invitationLookupFailed: boolean;
  invitationStatus: string | null;
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

/**
 * The membership write and invitation revocation are separate database
 * operations until the atomic transition tracked by issue #54 is implemented.
 * A failed revocation is not a successful complete access update.
 */
export function membershipRevocationFeedback(input:{
 membershipUpdated:boolean;
 serviceConfigured:boolean;
 revocationFailed:boolean;
}):{ok:boolean;message:string}{
 if(!input.membershipUpdated)return {ok:false,message:'Não foi possível atualizar o vínculo do usuário.'};
 if(!input.serviceConfigured)return {ok:false,message:'O acesso foi atualizado, mas a revogação de convites não pôde ser verificada porque o serviço está indisponível. Revise os convites pendentes.'};
 if(input.revocationFailed)return {ok:false,message:'O acesso foi atualizado, mas não foi possível revogar os convites pendentes. Revise os convites antes de concluir.'};
 return {ok:true,message:'Acesso atualizado e convites pendentes revogados.'};
}

/**
 * Privilege-preserving precondition for an agency membership edit.
 * An unreadable current role is not equivalent to a missing membership.
 */
export function canEditExistingMembership(input:{
 readFailed:boolean;
 existingRole:string|null;
}):{allowed:true}|{allowed:false;reason:'lookup_failed'|'protected_super_admin'}{
 if(input.readFailed)return {allowed:false,reason:'lookup_failed'};
 if(input.existingRole==='super_admin')return {allowed:false,reason:'protected_super_admin'};
 return {allowed:true};
}

/**
 * Membership administration is scoped to client organizations only.
 * A failed organization lookup must not be treated as an eligible tenant.
 */
export function canAssignClientMembership(input:{
 lookupFailed:boolean;
 organizationExists:boolean;
 isAgency:boolean;
}):{allowed:true}|{allowed:false;reason:'lookup_failed'|'organization_not_found'|'agency_protected'}{
 if(input.lookupFailed)return {allowed:false,reason:'lookup_failed'};
 if(!input.organizationExists)return {allowed:false,reason:'organization_not_found'};
 if(input.isAgency)return {allowed:false,reason:'agency_protected'};
 return {allowed:true};
}
