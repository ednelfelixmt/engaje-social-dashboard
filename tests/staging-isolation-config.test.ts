import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCTION_PROJECT_REF,requireStagingUrl,runStagingIsolation} from '../scripts/verify-staging-isolation';

test('staging guard rejects Engaje production project even with valid HTTPS URL',()=>{
 assert.throws(()=>requireStagingUrl('https://'+PRODUCTION_PROJECT_REF+'.supabase.co'),/non-production/);
});
test('staging guard rejects HTTP, fake endpoints, localhost, URL paths and URL credentials',()=>{
 for(const url of [
  'http://abcdefghijklmnopqrst.supabase.co',
  'https://localhost:54321',
  'https://abcdefghijklmnopqrst.supabase.co/rest/v1',
  'https://name:pass@abcdefghijklmnopqrst.supabase.co',
  'https://example.com',
 ]){
  assert.throws(()=>requireStagingUrl(url),/non-production/);
 }
});
test('staging guard accepts a valid dedicated project root',()=>{
 assert.equal(requireStagingUrl('https://abcdefghijklmnopqrst.supabase.co').hostname,'abcdefghijklmnopqrst.supabase.co');
});
test('authenticated verification refuses missing credentials before any network connection',async()=>{
 await assert.rejects(runStagingIsolation({}),/Missing required staging fixture configuration/);
});
test('authenticated verification rejects privileged public credentials before login',async()=>{
 await assert.rejects(runStagingIsolation({
  STAGING_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',
  STAGING_SUPABASE_PUBLISHABLE_KEY:'sb_secret_not_allowed',
 }),/publishable key/);
});
