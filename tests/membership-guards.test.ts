import test from 'node:test';
import assert from 'node:assert/strict';
import {canActivateMembership,canEditExistingMembership,canAssignClientMembership,membershipRevocationFeedback,type MembershipActivationCheck} from '../src/lib/auth/membership-guards';

const base:MembershipActivationCheck={isActive:true,serviceConfigured:true,invitationLookupFailed:false,invitationStatus:null};
test('deny activation without privileged validation service',()=>{
 assert.deepEqual(canActivateMembership({...base,serviceConfigured:false}),{allowed:false,reason:'service_unavailable'});
});
test('deny activation if privileged lookup failed instead of assuming no invitation',()=>{
 assert.deepEqual(canActivateMembership({...base,invitationLookupFailed:true}),{allowed:false,reason:'invitation_lookup_failed'});
});
test('deny activation of pending, revoked or expired invited identities',()=>{
 for(const invitationStatus of ['pending','revoked','expired'] as const){
  assert.deepEqual(canActivateMembership({...base,invitationStatus}),{allowed:false,reason:'invitation_unaccepted'});
 }
});
test('allow accepted invitation only with healthy validation service',()=>{
 assert.deepEqual(canActivateMembership({...base,invitationStatus:'accepted'}),{allowed:true});
});
test('allow existing user with no recorded invitation after successful lookup',()=>{
 assert.deepEqual(canActivateMembership(base),{allowed:true});
});
test('do not block deactivation when validation provider unavailable',()=>{
 assert.deepEqual(canActivateMembership({...base,isActive:false,serviceConfigured:false,invitationLookupFailed:true}),{allowed:true});
});

test('confirmed revocation returns complete success',()=>{
 assert.deepEqual(membershipRevocationFeedback({membershipUpdated:true,serviceConfigured:true,revocationFailed:false}),{ok:true,message:'Acesso atualizado e convites pendentes revogados.'});
});
test('revocation error reports partial write instead of success',()=>{
 const result=membershipRevocationFeedback({membershipUpdated:true,serviceConfigured:true,revocationFailed:true});
 assert.equal(result.ok,false);
 assert.match(result.message,/acesso foi atualizado/i);
 assert.match(result.message,/convites pendentes/i);
});
test('missing privileged revocation service reports partial write',()=>{
 const result=membershipRevocationFeedback({membershipUpdated:true,serviceConfigured:false,revocationFailed:false});
 assert.equal(result.ok,false);
 assert.match(result.message,/serviço está indisponível/i);
});
test('failed membership write never reports completed access change',()=>{
 const result=membershipRevocationFeedback({membershipUpdated:false,serviceConfigured:true,revocationFailed:false});
 assert.equal(result.ok,false);
});

test('deny permission edits when current membership cannot be read',()=>{
 assert.deepEqual(canEditExistingMembership({readFailed:true,existingRole:null}),{allowed:false,reason:'lookup_failed'});
 assert.deepEqual(canEditExistingMembership({readFailed:true,existingRole:'viewer'}),{allowed:false,reason:'lookup_failed'});
});
test('protect agency super administrator even on otherwise valid edit',()=>{
 assert.deepEqual(canEditExistingMembership({readFailed:false,existingRole:'super_admin'}),{allowed:false,reason:'protected_super_admin'});
});
test('allow normal updates and new membership only when read completed',()=>{
 assert.deepEqual(canEditExistingMembership({readFailed:false,existingRole:'viewer'}),{allowed:true});
 assert.deepEqual(canEditExistingMembership({readFailed:false,existingRole:null}),{allowed:true});
});

test('unrecognized invitation state fails closed instead of appearing as missing invite',()=>{
 for(const invitationStatus of ['suspended','cancelled','unknown',''] as const){
  assert.deepEqual(canActivateMembership({...base,invitationStatus}),{allowed:false,reason:'invitation_unaccepted'});
 }
});

test('deny membership assignment to the agency organization',()=>{
 assert.deepEqual(canAssignClientMembership({lookupFailed:false,organizationExists:true,isAgency:true}),{allowed:false,reason:'agency_protected'});
});
test('deny membership writes on missing or unreadable organizations',()=>{
 assert.deepEqual(canAssignClientMembership({lookupFailed:true,organizationExists:false,isAgency:false}),{allowed:false,reason:'lookup_failed'});
 assert.deepEqual(canAssignClientMembership({lookupFailed:false,organizationExists:false,isAgency:false}),{allowed:false,reason:'organization_not_found'});
});
test('allow assignment only to confirmed client organization',()=>{
 assert.deepEqual(canAssignClientMembership({lookupFailed:false,organizationExists:true,isAgency:false}),{allowed:true});
});
