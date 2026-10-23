import test from 'node:test';
import assert from 'node:assert/strict';
import {canActivateMembership,canUpdateExistingMembership,membershipRevocationFeedback,type MembershipActivationCheck} from '../src/lib/auth/membership-guards';

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

test('existing membership lookup failure blocks all permission writes',()=>{
 assert.deepEqual(canUpdateExistingMembership({lookupFailed:true,existingRole:null}),{allowed:false,reason:'lookup_failed'});
 assert.deepEqual(canUpdateExistingMembership({lookupFailed:true,existingRole:'viewer'}),{allowed:false,reason:'lookup_failed'});
});
test('existing super administrator role is never changed via customer membership form',()=>{
 assert.deepEqual(canUpdateExistingMembership({lookupFailed:false,existingRole:'super_admin'}),{allowed:false,reason:'super_admin_protected'});
});
test('confirmed existing regular member or a missing membership can proceed to remaining gates',()=>{
 assert.deepEqual(canUpdateExistingMembership({lookupFailed:false,existingRole:'editor'}),{allowed:true});
 assert.deepEqual(canUpdateExistingMembership({lookupFailed:false,existingRole:null}),{allowed:true});
});
