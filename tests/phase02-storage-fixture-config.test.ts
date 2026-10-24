import test from 'node:test';import assert from 'node:assert/strict';
import {validateStorageFixtures} from '../scripts/upload-phase02-branding-fixtures';
const env={MEDIAHUB_FIXTURE_UPLOAD_ACK:'UPLOAD_ONLY_SYNTHETIC_BRANDING',MEDIAHUB_SUPABASE_URL:'https://ityidnsfhgotucgvcifq.supabase.co',MEDIAHUB_SERVICE_ROLE_KEY:'sb_secret_abcdefghijklmnopqrstuvwxyz1234'};
test('fixture storage provisioning fails closed without acknowledgement',()=>assert.throws(()=>validateStorageFixtures({...env,MEDIAHUB_FIXTURE_UPLOAD_ACK:''}),/acknowledgement/));
test('fixture storage provisioning refuses alternate backend',()=>assert.throws(()=>validateStorageFixtures({...env,MEDIAHUB_SUPABASE_URL:'https://example.supabase.co'}),/Wrong project/));
test('fixture storage provisioning refuses publishable credentials',()=>assert.throws(()=>validateStorageFixtures({...env,MEDIAHUB_SERVICE_ROLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz1234'}),/service credential/));
test('fixture provisioning targets exactly two synthetic tenants',()=>{const v=validateStorageFixtures(env);assert.deepEqual(v.ids.map(x=>x.slug),['homologacao-a-20261024','homologacao-b-20261024']);});
