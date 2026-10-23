import test from 'node:test';
import assert from 'node:assert/strict';
import {validate} from '../scripts/verify-production-isolation';

const base={
 MEDIAHUB_PROD_READONLY_ACK:'YES_READ_ONLY',
 MEDIAHUB_SUPABASE_URL:'https://ityidnsfhgotucgvcifq.supabase.co',
 MEDIAHUB_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz',
 MEDIAHUB_A_EMAIL:'a@example.test',MEDIAHUB_A_PASSWORD:'placeholder-a',MEDIAHUB_A_SLUG:'fixture-a',
 MEDIAHUB_B_EMAIL:'b@example.test',MEDIAHUB_B_PASSWORD:'placeholder-b',MEDIAHUB_B_SLUG:'fixture-b',
 MEDIAHUB_A_BRANDING_FILE:'fixture-a/logo.png',MEDIAHUB_B_BRANDING_FILE:'fixture-b/logo.png'
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
 assert.throws(()=>validate({...base,MEDIAHUB_A_BRANDING_FILE:'fixture-b/alternate.png'}),/must match own tenant slug/);
 assert.throws(()=>validate({...base,MEDIAHUB_B_BRANDING_FILE:'fixture-a/alternate.png'}),/must match own tenant slug/);
});
