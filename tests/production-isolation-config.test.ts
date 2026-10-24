import test from 'node:test';
import assert from 'node:assert/strict';
import {validate} from '../scripts/verify-production-isolation';

const base={
 MEDIAHUB_PROD_READONLY_ACK:'YES_READ_ONLY',
 MEDIAHUB_SUPABASE_URL:'https://ityidnsfhgotucgvcifq.supabase.co',
 MEDIAHUB_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz',
 MEDIAHUB_A_EMAIL:'a@example.test',MEDIAHUB_A_PASSWORD:'placeholder-a',MEDIAHUB_A_SLUG:'fixture-a',
 MEDIAHUB_B_EMAIL:'b@example.test',MEDIAHUB_B_PASSWORD:'placeholder-b',MEDIAHUB_B_SLUG:'fixture-b',
 MEDIAHUB_A_BRANDING_FILE:'11111111-1111-4111-8111-111111111111/logo.png',MEDIAHUB_B_BRANDING_FILE:'22222222-2222-4222-8222-222222222222/logo.png'
};
test('production read-only isolation fails closed without explicit acknowledgement',()=>{
 assert.throws(()=>validate({...base,MEDIAHUB_PROD_READONLY_ACK:''}),/acknowledgement/);
});
test('production isolation refuses any other backend',()=>{
 assert.throws(()=>validate({...base,MEDIAHUB_SUPABASE_URL:'https://other.supabase.co'}),/Wrong Supabase/);
});
test('production isolation refuses privileged credentials',()=>{
 assert.throws(()=>validate({...base,MEDIAHUB_PUBLISHABLE_KEY:'sb_secret_abcdefghijklmnopqrstuvwxyz'}),/publishable/);
});
test('production isolation requires distinct synthetic users and tenants',()=>{
 assert.throws(()=>validate({...base,MEDIAHUB_B_EMAIL:'A@example.test'}),/distinct/);
 assert.throws(()=>validate({...base,MEDIAHUB_B_SLUG:'FIXTURE-A'}),/distinct/);
 assert.throws(()=>validate({...base,MEDIAHUB_B_EMAIL:'real@example.com'}),/synthetic/);
});
test('complete independently provisioned test fixtures pass preflight',()=>{
 assert.equal(validate(base).a.slug,'fixture-a');
});

test('isolation preflight refuses files swapped between tenant slugs',()=>{
 assert.throws(()=>validate({...base,MEDIAHUB_A_BRANDING_FILE:'fixture-b/alternate.png'}),/organization UUID prefix/);
 assert.throws(()=>validate({...base,MEDIAHUB_B_BRANDING_FILE:'fixture-a/alternate.png'}),/organization UUID prefix/);
});

test('existing fixture users require exact slugs, acknowledgement and distinct expected UUIDs',()=>{
 const existing={...base,MEDIAHUB_A_EMAIL:'fixture-a@example.com',MEDIAHUB_B_EMAIL:'fixture-b@example.com',
  MEDIAHUB_A_SLUG:'homologacao-a-20261024',MEDIAHUB_B_SLUG:'homologacao-b-20261024',
  MEDIAHUB_A_USER_ID:'079b2713-a99a-41a6-acc3-b129863ef7a6',
  MEDIAHUB_B_USER_ID:'4fd21c94-e93d-4e35-923b-b1ec4622fd94'};
 assert.throws(()=>validate(existing),/identity-bound/);
 assert.throws(()=>validate({...existing,MEDIAHUB_PROD_EXISTING_FIXTURE_ACK:'YES_EXPLICIT_FIXTURE_USERS',MEDIAHUB_A_SLUG:'actual-client'}),/identity-bound/);
 assert.throws(()=>validate({...existing,MEDIAHUB_PROD_EXISTING_FIXTURE_ACK:'YES_EXPLICIT_FIXTURE_USERS',MEDIAHUB_B_USER_ID:existing.MEDIAHUB_A_USER_ID}),/identity-bound/);
 assert.equal(validate({...existing,MEDIAHUB_PROD_EXISTING_FIXTURE_ACK:'YES_EXPLICIT_FIXTURE_USERS'}).existingAuthorized,true);
});
