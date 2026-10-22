import test from 'node:test';
import assert from 'node:assert/strict';
import {canActivateMembership,type MembershipActivationCheck} from '../src/lib/auth/membership-guards';

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
